import express from 'express';
import path from 'path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { format, addDays, parseISO } from 'date-fns';

const db = new Database('tvcal.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    user_id TEXT,
    show_id INTEGER,
    show_name TEXT,
    network TEXT,
    PRIMARY KEY (user_id, show_id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    try {
      const response = await axios.get(`https://api.tvmaze.com/search/shows?q=${q}`);
      // Return top 3 matches
      const results = response.data.slice(0, 3).map((item: any) => ({
        id: item.show.id,
        name: item.show.name,
        network: item.show.network?.name || item.show.webChannel?.name || 'Unknown',
        image: item.show.image?.medium,
        summary: item.show.summary,
        status: item.show.status,
        nextAirDate: 'Check calendar' // We'll get real dates in the ICS
      }));
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch from TVMaze' });
    }
  });

  app.post('/api/subscribe', (req, res) => {
    const { userId, showId, showName, network } = req.body;
    if (!userId || !showId) return res.status(400).json({ error: 'Missing data' });

    // Ensure user exists
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!userExists) {
      db.prepare('INSERT INTO users (id) VALUES (?)').run(userId);
    }

    // Check limit
    const count = db.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ?').get(userId) as { count: number };
    if (count.count >= 10) {
      return res.status(400).json({ error: 'Max 10 shows allowed! Delete some to add more.' });
    }

    try {
      db.prepare('INSERT OR IGNORE INTO subscriptions (user_id, show_id, show_name, network) VALUES (?, ?, ?, ?)')
        .run(userId, showId, showName, network);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/unsubscribe', (req, res) => {
    const { userId, showId } = req.body;
    db.prepare('DELETE FROM subscriptions WHERE user_id = ? AND show_id = ?').run(userId, showId);
    res.json({ success: true });
  });

  app.get('/api/subscriptions', (req, res) => {
    const { userId } = req.query;
    const subs = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').all(userId);
    res.json(subs);
  });

  app.get('/api/schedule', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const subs = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').all(userId) as any[];
    const schedule: any[] = [];

    for (const sub of subs) {
      try {
        const response = await axios.get(`https://api.tvmaze.com/shows/${sub.show_id}/episodes`);
        const episodes = response.data;
        const now = new Date();

        episodes.forEach((ep: any) => {
          if (ep.airstamp) {
            const airDate = new Date(ep.airstamp);
            // Include episodes from 7 days ago to 30 days in the future
            if (airDate > addDays(now, -7) && airDate < addDays(now, 30)) {
              schedule.push({
                showId: sub.show_id,
                showName: sub.show_name,
                episodeName: ep.name,
                season: ep.season,
                number: ep.number,
                airDate: ep.airstamp,
                summary: ep.summary,
                network: sub.network
              });
            }
          }
        });
      } catch (error) {
        console.error(`Failed to fetch schedule for show ${sub.show_id}`);
      }
    }

    // Sort by date
    schedule.sort((a, b) => new Date(a.airDate).getTime() - new Date(b.airDate).getTime());
    res.json(schedule);
  });

  // ICS Generation
  app.get('/ics/:userId', async (req, res) => {
    const { userId } = req.params;
    const subs = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').all(userId) as any[];

    if (subs.length === 0) {
      return res.status(404).send('No subscriptions found for this user.');
    }

    const calendar = ical({ name: 'My TV Calendar' });
    calendar.method(ICalCalendarMethod.PUBLISH);

    for (const sub of subs) {
      try {
        // Fetch episodes for this show
        const response = await axios.get(`https://api.tvmaze.com/shows/${sub.show_id}/episodes`);
        const episodes = response.data;

        episodes.forEach((ep: any) => {
          if (ep.airstamp) {
            const airDate = new Date(ep.airstamp);
            // Only include future episodes or recent past (e.g., last 30 days)
            if (airDate > addDays(new Date(), -30)) {
              calendar.createEvent({
                start: airDate,
                end: addDays(airDate, 0.04), // ~1 hour
                summary: `${sub.show_name} - ${ep.name} (S${ep.season}E${ep.number})`,
                description: `Network: ${sub.network}\nSeason ${ep.season}, Episode ${ep.number}\n\n${ep.summary?.replace(/<[^>]*>?/gm, '') || ''}`,
                url: ep.url
              });
            }
          }
        });
      } catch (error) {
        console.error(`Failed to fetch episodes for show ${sub.show_id}`);
      }
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tv-calendar.ics"');
    res.send(calendar.toString());
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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
