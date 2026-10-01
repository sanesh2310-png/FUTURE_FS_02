import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Admin } from './models.js';
import auth from './auth.js';
import leads from './leads.js';

const { MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, PORT = 5000 } = process.env;
if (!MONGODB_URI || !JWT_SECRET) {
  console.error('Missing MONGODB_URI or JWT_SECRET. Make sure server/.env exists and is filled in.');
  process.exit(1);
}

const dbUp = () => mongoose.connection.readyState === 1;
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json({ limit: '50kb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, database: dbUp() ? 'connected' : 'not connected' }));

// Answer clearly (instead of hanging) while the database is unreachable
app.use('/api', (_req, res, next) => dbUp() ? next() : res.status(503).json({
  error: 'The server cannot reach the database. Check MONGODB_URI in server/.env and the Atlas Network Access list, then read the server terminal.',
}));
app.use('/api/auth', auth);
app.use('/api/leads', leads);

app.use((err, _req, res, _next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(', ') });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

async function ensureAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  try {
    const email = ADMIN_EMAIL.trim().toLowerCase();
    if (!(await Admin.exists({ email }))) {
      await Admin.create({ email, password: await bcrypt.hash(ADMIN_PASSWORD, 10) });
      console.log('Admin account created for', email);
    }
  } catch (e) {
    if (e.code !== 11000) console.error('Admin setup failed:', e.message);
  }
}

async function connect() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    console.log('Database connected');
    await ensureAdmin();
  } catch (e) {
    console.error(`\nCould not connect to MongoDB: ${e.message}\n` +
      '  - Atlas: open Network Access and allow your IP ("Allow Access From Anywhere").\n' +
      '  - Check the username and password inside MONGODB_URI in server/.env.\n' +
      'Retrying in 5 seconds...\n');
    setTimeout(connect, 5000);
  }
}

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
connect();
