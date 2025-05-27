import express from 'express';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main page
app.get('/', (req, res) => {
  res.json({
    name: 'Glenridge Scraper API',
    version: '1.0.0',
    endpoints: [
      { path: '/health', method: 'GET', description: 'Health check endpoint' },
      { path: '/api/scrape', method: 'POST', description: 'Scrape Google Maps data' }
    ]
  });
});

/**
 * Scrape Google Maps for places
 * @param {string} searchQuery - The search query
 * @param {number} numResults - Number of results to return (default: 10)
 * @param {Object} browser - Playwright browser instance
 * @returns {Promise<Array>} - Array of place objects
 */
async function scrapeGoogleMaps(searchQuery, numResults = 10, browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to Google Maps
    await page.goto('https://www.google.com/maps');
    
    // Wait for and click the accept cookies button if it appears
    try {
      await page.click('button[aria-label="Accept all"]');
    } catch (e) {
      // Cookie banner might not appear in all regions
      console.log('No cookie banner found');
    }

    // Type into the search box and search
    await page.fill('input#searchboxinput', searchQuery);
    await page.press('input#searchboxinput', 'Enter');
    
    // Wait for results to load
    await page.waitForSelector('div.Nv2PK.tH5CWc.THOPZf', { timeout: 10000 });
    
    // Extract results (simplified example)
    const results = await page.$$eval('div.Nv2PK.tH5CWc.THOPZf', (items, maxResults) => {
      return items.slice(0, maxResults).map(item => ({
        name: item.querySelector('div.qBF1Pd')?.textContent || 'No name',
        address: item.querySelector('div.W4Efsd:first-of-type')?.textContent || 'No address'
      }));
    }, numResults);
    
    return results;
  } finally {
    await context.close();
  }
}

// API endpoint for scraping
app.post('/api/scrape', async (req, res) => {
  const { searchQuery, numResults = 10 } = req.body;
  
  if (!searchQuery) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  let browser;
  try {
    browser = await chromium.launch({ 
      headless: true,  // Set to false for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']  // Required for some environments
    });
    
    const results = await scrapeGoogleMaps(searchQuery, numResults, browser);
    
    res.json({ 
      success: true, 
      message: 'Scraping completed', 
      data: results 
    });
    
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to scrape data',
      details: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  } finally {
    if (browser) await browser.close();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Something broke!',
    stack: process.env.NODE_ENV === 'production' ? '🔒' : err.stack
  });
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;
