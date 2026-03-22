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

## Tech Stack
- **Frontend**: Vanilla HTML/TS/CSS (Vite)
- **Backend**: Node.js/Express + SQLite (`better-sqlite3`)
- **APIs**: TVMaze (Free, no key needed)
- **ICS**: `ical-generator`

## License
MIT
