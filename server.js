import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import NodeGeocoder from 'node-geocoder';
import fetch from 'node-fetch';
import { initDb, saveSearch, getSavedSearches, getSearch, deleteSearch } from './db.js';
import { generateSearchSuggestions } from './utils/aiHelper.js';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Slow down requests after 50 in 15 minutes
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes, then...
    delayMs: 500 // begin adding 500ms of delay per request above 50
});

// Apply rate limiting to all requests
app.use(limiter);
app.use(speedLimiter);

// Initialize database
initDb().catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

// Set up geocoder
const geocoder = NodeGeocoder({
    provider: 'google',
    apiKey: process.env.GOOGLE_PLACES_API_KEY
});

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for searching places
// Function to fetch with retry and exponential backoff
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 300) {
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'RESOURCE_EXHAUSTED') {
            throw new Error('RATE_LIMIT_EXCEEDED');
        }
        
        return data;
    } catch (error) {
        if (retries === 0) throw error;
        
        if (error.message === 'RATE_LIMIT_EXCEEDED') {
            console.log(`Rate limited. Waiting ${backoff}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        
        throw error;
    }
}

// Function to fetch paginated results
async function fetchPaginatedResults(searchUrl, limit) {
    console.log(`Starting paginated fetch for up to ${limit} results`);
    let allResults = [];
    let nextPageToken = null;
    const maxResults = Math.min(parseInt(limit, 10) || 10, 60); // Reduced max to 60 to avoid rate limits
    let requestCount = 0;
    const MAX_RETRIES = 3;

    do {
        try {
            let currentUrl = nextPageToken 
                ? `${searchUrl}&pagetoken=${encodeURIComponent(nextPageToken)}`
                : searchUrl;

            // Add delay for page token to become valid (Google API requirement)
            if (nextPageToken) {
                console.log('Waiting for page token to become valid...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            requestCount++;
            console.log(`Making API request #${requestCount}...`);
            
            // Use fetchWithRetry instead of direct fetch
            const data = await fetchWithRetry(currentUrl, {}, MAX_RETRIES);
            
            console.log(`Request #${requestCount} status: ${data.status}`);
            
            if (data.status === 'INVALID_REQUEST' && nextPageToken) {
                // Page token might not be ready yet, wait and retry
                console.log('Page token not ready, waiting 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
            
            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(`Places API Error: ${data.status} - ${data.error_message || 'No error details'}`);
            }

            if (data.results) {
                allResults = [...allResults, ...data.results];
            }

            nextPageToken = data.next_page_token;

            // Stop if we've reached the desired number of results or there are no more pages
            if (allResults.length >= maxResults || !nextPageToken) {
                break;
            }
            
            // Add a small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error('Error in fetchPaginatedResults:', error);
            // If we have some results, return them with a warning
            if (allResults.length > 0) {
                console.warn('Returning partial results due to error:', error.message);
                break;
            }
            throw error;
        }

    } while (allResults.length < maxResults);

    return allResults.slice(0, maxResults);
}

app.post('/api/search', async (req, res) => {
    try {
        const { business, location, limit = 10 } = req.body;
        const resultLimit = Math.min(parseInt(limit, 10) || 10, 200); // Increased to 200 max results
        
        // First, geocode the location to get coordinates
        const geoResults = await geocoder.geocode(location);
        if (!geoResults.length) {
            throw new Error('Location not found');
        }

        const { latitude, longitude } = geoResults[0];
        
        // Search for places with pagination
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(business)}&location=${latitude},${longitude}&radius=50000&key=${process.env.GOOGLE_PLACES_API_KEY}`;
        
        console.log(`Searching for ${resultLimit} results in ${location}...`);
        
        // Fetch all results with pagination
        let allResults = [];
        try {
            allResults = await fetchPaginatedResults(searchUrl, resultLimit);
            console.log(`Found ${allResults.length} results`);
            
            if (allResults.length === 0) {
                return res.status(404).json({ error: 'No results found' });
            }
        } catch (error) {
            console.error('Error in fetchPaginatedResults:', error);
            return res.status(500).json({ error: error.message });
        }

        // Get detailed information for each place with concurrency control
        const BATCH_SIZE = 5; // Process 5 places at a time to avoid rate limiting
        const detailedResults = [];
        
        for (let i = 0; i < allResults.length; i += BATCH_SIZE) {
            const batch = allResults.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(async place => {
                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,formatted_phone_number,website,opening_hours,photos&key=${process.env.GOOGLE_PLACES_API_KEY}`;
                const detailsResponse = await fetch(detailsUrl);
                const detailsData = await detailsResponse.json();

                if (detailsData.status !== 'OK') {
                    console.warn(`Could not get details for ${place.name}: ${detailsData.status}`);
                    return null;
                }

                const { result } = detailsData;
                let photoUrl = null;
                if (result.photos && result.photos.length > 0) {
                    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${result.photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
                }

                return {
                    name: result.name,
                    address: result.formatted_address,
                    rating: result.rating || 'Not rated',
                    phone: result.formatted_phone_number || 'Not available',
                    website: result.website || '#',
                    openNow: result.opening_hours?.open_now ? 'Open' : 'Closed',
                    photoUrl
                };
                })
            );
            detailedResults.push(...batchResults.filter(result => result !== null));
        }

        // Save the search to the database (don't wait for it to complete)
        saveSearch(business, location, detailedResults).catch(err => {
            console.error('Error saving search to database:', err);
        });
        
        res.json(detailedResults);

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoints for search history
app.get('/api/history', async (req, res) => {
    try {
        const searches = await getSavedSearches();
        res.json(searches);
    } catch (error) {
        console.error('Error fetching search history:', error);
        res.status(500).json({ error: 'Failed to fetch search history' });
    }
});

app.get('/api/history/:id', async (req, res) => {
    try {
        const search = await getSearch(req.params.id);
        if (!search) {
            return res.status(404).json({ error: 'Search not found' });
        }
        res.json(search);
    } catch (error) {
        console.error('Error fetching search:', error);
        res.status(500).json({ error: 'Failed to fetch search' });
    }
});

app.delete('/api/history/:id', async (req, res) => {
    try {
        await deleteSearch(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting search:', error);
        res.status(500).json({ error: 'Failed to delete search' });
    }
});

// AI Suggestion Endpoint
app.post('/api/ai-suggest', express.json(), async (req, res) => {
    try {
        const { idea, state } = req.body;
        
        if (!idea || !state) {
            return res.status(400).json({ error: 'Idea and state are required' });
        }

        const suggestions = await generateSearchSuggestions(idea, state);
        res.json({ suggestions });
    } catch (error) {
        console.error('Error in AI suggestion:', error);
        res.status(500).json({ error: 'Failed to generate suggestions' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
