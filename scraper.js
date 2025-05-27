const { chromium } = require('playwright-chromium');

async function scrapeGoogleMaps(searchQuery, numResults = 10) {
  const browser = await chromium.launch({ headless: false }); // Set to true for production
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

    // Type into the search box
    await page.fill('input#searchboxinput', searchQuery);
    await page.press('input#searchboxinput', 'Enter');

    // Wait for results to load
    await page.waitForSelector('div[role="article"]');
    
    // Wait a bit for dynamic content to load
    await page.waitForTimeout(2000);

    // Extract results
    const results = await page.evaluate((maxResults) => {
      const items = Array.from(document.querySelectorAll('div[role="article"]'));
      return items.slice(0, maxResults).map(item => {
        const nameElement = item.querySelector('div[role="heading"]');
        const addressElement = item.querySelector('div[role="heading"] + div');
        const ratingElement = item.querySelector('span[role="img"]');
        
        return {
          name: nameElement ? nameElement.textContent : '',
          address: addressElement ? addressElement.textContent : '',
          rating: ratingElement ? ratingElement.getAttribute('aria-label') : '',
        };
      });
    }, numResults);

    console.log('Scraped Results:', results);
    return results;

  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Example usage
scrapeGoogleMaps('bike shops near me', 5)
  .then(results => console.log('Success!'))
  .catch(error => console.error('Failed:', error));
