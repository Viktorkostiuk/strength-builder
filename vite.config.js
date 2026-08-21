import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve('workouts.json');

/**
 * Vite plugin: exposes /api/workouts endpoints backed by workouts.json on disk.
 * No extra npm packages needed — uses Vite's built-in Connect middleware.
 *
 * GET    /api/workouts          → returns all saved workouts
 * POST   /api/workouts          → saves a new workout, returns { ok, id }
 * DELETE /api/workouts/:id      → removes a workout by id
 */
function workoutLogPlugin() {
  return {
    name: 'workout-log',
    configureServer(server) {
      // Ensure log file exists
      if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, JSON.stringify({ workouts: [] }, null, 2));
      }

      const readLog  = () => JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
      const writeLog = data => fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));

      // Parse request body as JSON
      const parseBody = req => new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
        });
        req.on('error', reject);
      });

      server.middlewares.use('/api/workouts', async (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');

        try {
          // GET /api/workouts
          if (req.method === 'GET') {
            res.end(JSON.stringify(readLog()));
            return;
          }

          // POST /api/workouts
          if (req.method === 'POST') {
            const body    = await parseBody(req);
            const log     = readLog();
            const workout = { id: Date.now(), savedAt: new Date().toISOString(), ...body };
            log.workouts.push(workout);
            writeLog(log);
            res.end(JSON.stringify({ ok: true, id: workout.id }));
            return;
          }

          // DELETE /api/workouts/:id
          if (req.method === 'DELETE') {
            const id  = req.url.replace(/^\//, '');
            const log = readLog();
            log.workouts = log.workouts.filter(w => String(w.id) !== id);
            writeLog(log);
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          next();
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), workoutLogPlugin()],
});
