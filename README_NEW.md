# Business Finder

A web application to find businesses using AI-powered search suggestions and the Google Places API.

## Features

- **AI-Powered Search**: Describe what you're looking for, and our AI will suggest relevant business types and locations
- **Search History**: View and manage your past searches
- **CSV Export**: Download search results for further analysis
- **Responsive Design**: Works on desktop and mobile devices
- **Docker Support**: Easy containerization and deployment
- **CI/CD Pipeline**: Automated testing and deployment with GitHub Actions

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional, for containerized development)

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/glenridescraper.git
   cd glenridescraper
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   - Copy `.env.example` to `.env`
   - Update the environment variables in `.env` with your API keys
     ```
     GOOGLE_PLACES_API_KEY=your_google_places_api_key
     OPENAI_API_KEY=your_openai_api_key
     NODE_ENV=development
     PORT=3000
     ```

4. Start the development server
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`

## Deployment with Elestio

### Prerequisites

- Docker Hub account
- Elestio account
- GitHub repository for your project

### Setup CI/CD with GitHub Actions

1. **Configure GitHub Secrets**
   Go to your GitHub repository Settings > Secrets and variables > Actions and add the following secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token
   - `ELESTIO_TOKEN`: Your Elestio API token
   - `ELESTIO_APP_ID`: Your Elestio application ID

2. **Push to Main Branch**
   The GitHub Actions workflow is already configured in `.github/workflows/elestio-ci-cd.yml`. It will automatically build and deploy your application when you push to the `main` branch.

### Manual Deployment to Elestio

1. **Build and Push Docker Image**
   ```bash
   # Build the Docker image
   docker build -t yourusername/glenridescraper .
   
   # Log in to Docker Hub
   docker login
   
   # Push the image to Docker Hub
   docker push yourusername/glenridescraper:latest
   ```

2. **Deploy on Elestio**
   - Log in to your Elestio dashboard
   - Click on "Create a new service"
   - Select "Docker"
   - Configure your service:
     - Service name: `glenridescraper`
     - Docker image: `yourusername/glenridescraper:latest`
     - Port: `3000`
     - Environment variables: Add all variables from your `.env` file
   - Click "Create Service"

3. **Configure Custom Domain (Optional)**
   - Go to your service settings
   - Navigate to the "Domains" section
   - Add your custom domain and follow the instructions to verify ownership

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Environment (development, production) |
| `PORT` | No | Port to run the server on (default: 3000) |
| `GOOGLE_PLACES_API_KEY` | Yes | Google Places API key |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `DATABASE_URL` | No | SQLite database URL (default: `./data/db.sqlite`) |

## Technologies Used

- **Backend**:
  - Node.js
  - Express
  - SQLite

- **Frontend**:
  - EJS (templating)
  - Tailwind CSS
  - Vanilla JavaScript

- **APIs**:
  - Google Places API
  - OpenAI API

- **DevOps**:
  - Docker
  - GitHub Actions
  - Elestio

## License

[MIT](LICENSE)
