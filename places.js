require('dotenv').config();
const fetch = require('node-fetch');

async function searchPlaces(query, location = '40.7128,-74.0060') { // Default to NYC coordinates
    try {
        // First, let's do a text search to get places matching our query
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=5000&key=${process.env.GOOGLE_PLACES_API_KEY}`;
        
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.status !== 'OK') {
            throw new Error(`Places API Error: ${searchData.status}`);
        }

        // For each place, get more detailed information
        const detailedResults = await Promise.all(
            searchData.results.slice(0, 5).map(async place => {
                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,formatted_phone_number,website,opening_hours,reviews&key=${process.env.GOOGLE_PLACES_API_KEY}`;
                const detailsResponse = await fetch(detailsUrl);
                const detailsData = await detailsResponse.json();

                if (detailsData.status !== 'OK') {
                    console.warn(`Could not get details for ${place.name}: ${detailsData.status}`);
                    return null;
                }

                const { result } = detailsData;
                return {
                    name: result.name,
                    address: result.formatted_address,
                    rating: result.rating,
                    phone: result.formatted_phone_number || 'Not available',
                    website: result.website || 'Not available',
                    openNow: result.opening_hours?.open_now ? 'Open' : 'Closed',
                    reviews: (result.reviews || []).map(review => ({
                        rating: review.rating,
                        text: review.text,
                        time: new Date(review.time * 1000).toLocaleDateString()
                    }))
                };
            })
        );

        return detailedResults.filter(result => result !== null);
    } catch (error) {
        console.error('Error fetching places:', error);
        throw error;
    }
}

// Example usage
searchPlaces('bike shops')
    .then(results => {
        console.log('Found Places:');
        results.forEach((place, index) => {
            console.log(`\n${index + 1}. ${place.name}`);
            console.log(`   Address: ${place.address}`);
            console.log(`   Rating: ${place.rating} stars`);
            console.log(`   Phone: ${place.phone}`);
            console.log(`   Website: ${place.website}`);
            console.log(`   Status: ${place.openNow}`);
            if (place.reviews && place.reviews.length > 0) {
                console.log('   Latest Review:');
                const latestReview = place.reviews[0];
                console.log(`   "${latestReview.text.substring(0, 100)}..."`);
                console.log(`   ${latestReview.rating} stars - ${latestReview.time}`);
            }
        });
    })
    .catch(error => console.error('Failed:', error));
