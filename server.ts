import express from 'express';
import Database from 'better-sqlite3';
import ical from 'ical-generator';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('tvcal.db');

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS user_shows (
    userId TEXT,
    showId INTEGER,
    showName TEXT,
    network TEXT,
    PRIMARY KEY (userId, showId)
  )
`);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // API: Search shows
  app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    try {
      const response = await axios.get(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query as string)}`);
      // Return max 10 results
      const results = response.data.slice(0, 10).map((item: any) => ({
        id: item.show.id,
        name: item.show.name,
        network: item.show.network?.name || item.show.webChannel?.name || 'Unknown',
        summary: item.show.summary,
        image: item.show.image?.medium
      }));
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch from TVMaze' });
    }
  });

  // API: Subscribe
  app.post('/api/subscribe', (req, res) => {
    const { userId, showId, showName, network } = req.body;
    if (!userId || !showId) return res.status(400).json({ error: 'Missing params' });
    try {
      const stmt = db.prepare('INSERT OR IGNORE INTO user_shows (userId, showId, showName, network) VALUES (?, ?, ?, ?)');
      stmt.run(userId, showId, showName, network);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'DB error' });
    }
  });

  // API: Unsubscribe
  app.post('/api/unsubscribe', (req, res) => {
    const { userId, showId } = req.body;
    try {
      const stmt = db.prepare('DELETE FROM user_shows WHERE userId = ? AND showId = ?');
      stmt.run(userId, showId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'DB error' });
    }
  });

  // API: List user shows
  app.get('/api/shows', (req, res) => {
    const userId = req.query.user;
    try {
      const stmt = db.prepare('SELECT * FROM user_shows WHERE userId = ?');
      const shows = stmt.all(userId);
      res.json(shows);
    } catch (error) {
      res.status(500).json({ error: 'DB error' });
    }
  });

  // ICS: Generate calendar
  app.get('/ics/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const stmt = db.prepare('SELECT * FROM user_shows WHERE userId = ?');
      const userShows = stmt.all(userId) as any[];

      const calendar = ical({ name: 'My TV Calendar' });

      for (const show of userShows) {
        try {
          const response = await axios.get(`https://api.tvmaze.com/shows/${show.showId}/episodes`);
          const episodes = response.data;

          episodes.forEach((ep: any) => {
            if (!ep.airstamp) return;
            
            const airDate = new Date(ep.airstamp);
            // Only include future episodes or recent past (last 7 days)
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            if (airDate >= sevenDaysAgo) {
              calendar.createEvent({
                start: airDate,
                end: new Date(airDate.getTime() + (ep.runtime || 30) * 60 * 1000),
                summary: `${show.showName} - S${ep.season}E${ep.number}: ${ep.name}`,
                description: ep.summary ? ep.summary.replace(/<[^>]*>?/gm, '') : '',
                url: ep.url
              });
            }
          });
        } catch (err) {
          console.error(`Failed to fetch episodes for show ${show.showId}`);
        }
      }

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="tvcal_${userId}.ics"`);
      res.send(calendar.toString());
    } catch (error) {
      res.status(500).send('Error generating calendar');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
