# TVCal - Open Source TV Calendar

A self-hostable, privacy-focused TV show calendar sync app. Search shows, subscribe, and get a personal ICS feed for your calendar.

## Features
- **No Accounts**: Uses a unique ID stored in your browser's `localStorage`.
- **Privacy First**: No tracking, no analytics, no external dependencies beyond TVMaze API.
- **ICS Export**: Generates a single auto-updating `.ics` URL for all your shows.
- **Self-Hostable**: Simple Node.js + SQLite backend.

## Quick Start (Local)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

## Self-Hosting with Docker
1. Build the image:
   ```bash
   docker build -t tvcal .
   ```
2. Run the container:
   ```bash
   docker run -p 3000:3000 -v $(pwd)/tvcal.db:/app/tvcal.db tvcal
   ```

## Vercel Deployment
1. Connect your repo to Vercel.
2. Set `NODE_ENV=production`.
3. Note: SQLite persistence on Vercel is limited to the current session/instance. For true persistence, consider using a persistent volume or an external DB.

## 📺 TV API Configuration

This application uses the **TVMaze API** by default, which is **completely free and does not require an API key** for searching shows or listing episodes.

### Using a Different API (e.g., TMDB or TVPro)
If you decide to modify the code to use a service that requires an API key:

1.  **Environment Variables**: Open your `.env` file (or create one from `.env.example`).
2.  **Add your key**:
    ```env
    # Example for a hypothetical TV API
    TV_API_KEY=your_api_key_here
    ```
3.  **Server-side Access**: In `server.ts`, you can access this key using `process.env.TV_API_KEY`.

## 🚀 Tech Stack
- **Frontend**: Vanilla HTML/TS/CSS (Vite) with **Y2K Cyberpunk Theme**
- **Backend**: Node.js/Express + SQLite (`better-sqlite3`)
- **APIs**: [TVMaze API](https://www.tvmaze.com/api) (Free, No Key Required)
- **ICS**: `ical-generator`

## License
MIT
