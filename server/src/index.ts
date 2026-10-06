import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { getDb } from './db/index';
import { runMigrations } from './db/migrate';
import authRoutes from './routes/auth';
import requestRoutes from './routes/requests';
import workItemRoutes from './routes/workItems';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const MemoryStore = require('memorystore')(session);

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

// Init DB
const db = getDb();
runMigrations(db);

// Middleware
app.use(express.json());

const isProd = process.env['NODE_ENV'] === 'production';

// Session
app.use(
  session({
    name: 'client_request_desk_session',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    secret: process.env['SESSION_SECRET'] ?? 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/work-items', workItemRoutes);

// Keep API health checks ahead of the production SPA fallback.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend in production
if (isProd) {
  const clientDist = path.join(__dirname, '../../../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
