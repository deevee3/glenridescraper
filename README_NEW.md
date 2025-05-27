# Business Finder

A web application to find businesses using AI-powered search suggestions and the Google Places API.

## Features

- **AI-Powered Search**: Describe what you're looking for, and our AI will suggest relevant business types and locations
- **Search History**: View and manage your past searches
- **CSV Export**: Download search results for further analysis
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

1. **AI Search**
   - Enter a description of the type of business you're looking for (e.g., "cozy coffee shops")
   - Enter a state (e.g., "California" or "NY")
   - Click "Get Suggestions"
   - Review the suggested searches and click on one to use it

2. **Manual Search**
   - Enter a business type (e.g., "coffee shop")
   - Enter a location (e.g., "San Francisco, CA" or a zip code)
   - Select the maximum number of results
   - Click "Search"

3. **Search History**
   - Click "View Search History" to see your past searches
   - Click on a past search to view its results
   - Delete searches you no longer need

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your API keys:
   ```
   GOOGLE_PLACES_API_KEY=your_google_places_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Start the server: `node server.js`
5. Open `http://localhost:3001` in your browser

## Technologies Used

- Node.js
- Express
- SQLite
- Google Places API
- OpenAI API
- Tailwind CSS
- Vanilla JavaScript
