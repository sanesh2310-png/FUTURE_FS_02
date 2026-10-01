import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from './models.js';

const r = Router();

r.post('/login', async (req, res, next) => {
  try {
    const { email = '', password = '' } = req.body;
    const admin = await Admin.findOne({ email: String(email).toLowerCase() });
    if (!admin || !(await bcrypt.compare(String(password), admin.password))) {
      return res.status(401).json({ error: 'Wrong email or password' });
    }
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (e) { next(e); }
});

export function isAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { jwt.verify(token, process.env.JWT_SECRET); return true; } catch { return false; }
}

export function requireAuth(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: 'Please log in' });
}

export default r;
