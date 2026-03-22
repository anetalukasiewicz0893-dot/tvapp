# Y2K TV SEARCH

A minimal, early-2000s style TV show search engine powered by the [TVMaze API](https://www.tvmaze.com/api).

## Features
- **Y2K Aesthetic**: Pixel fonts, neon gradients, and Windows 95-style UI.
- **TVMaze Search**: Real-time search for TV shows.
- **Client-Side Only**: No backend required.
- **Zero Config**: Deployable to Vercel with zero configuration.

## API Integration
The app is pre-configured to connect to the **TVMaze API**. 
- **Endpoint**: `https://api.tvmaze.com/search/shows?q=`
- **Authentication**: None required (Public API).
- **Test Connection**: Use the **TEST** button in the app to verify connectivity to the TVMaze servers.

## How to Deploy to Vercel
1.  **Clone or Download** this repository.
2.  **Install the Vercel CLI** (optional): `npm install -g vercel`.
3.  **Deploy**: Run `vercel` in the project directory.
4.  **Alternatively**: Push to a GitHub repository and connect it to Vercel for automatic deployments.

## Tech Stack
- HTML5
- CSS3 (Custom Properties, Flexbox, Grid)
- Vanilla JavaScript (Fetch API)
- TVMaze API (Public, No Key Required)

## License
MIT License - Feel free to use and modify!
