import { Router } from 'express';
import { Lead, STATUSES } from './models.js';
import { requireAuth, isAdmin } from './auth.js';

const r = Router();
const str = (v) => (typeof v === 'string' ? v.trim() : '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

// PUBLIC: website contact forms post here
r.post('/', wrap(async (req, res) => {
  const b = req.body;
  const data = {
    name: str(b.name), email: str(b.email), phone: str(b.phone),
    message: str(b.message), source: str(b.source) || 'Website',
  };
  // Only a signed-in admin may set the stage, follow-up date or a first note.
  // Anonymous website visitors always create a plain "new" lead.
  if (isAdmin(req)) {
    if (STATUSES.includes(b.status)) data.status = b.status;
    if (b.followUpDate) data.followUpDate = b.followUpDate;
    if (str(b.note)) data.notes = [{ text: str(b.note), followUp: b.followUpDate || null }];
  }
  const lead = await Lead.create(data);
  res.status(201).json({ ok: true, id: lead._id });
}));

// Everything below needs an admin token
r.use(requireAuth);

r.get('/', wrap(async (req, res) => {
  const { q = '', status = '' } = req.query;
  const filter = {};
  if (STATUSES.includes(status)) filter.status = status;
  if (q) {
    const re = new RegExp(esc(String(q)), 'i');
    filter.$or = [{ name: re }, { email: re }, { source: re }];
  }
  res.json(await Lead.find(filter).sort({ createdAt: -1 }));
}));

r.get('/stats', wrap(async (_req, res) => {
  const [total, groups, due] = await Promise.all([
    Lead.countDocuments(),
    Lead.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Lead.countDocuments({ followUpDate: { $lte: new Date() }, status: { $ne: 'converted' } }),
  ]);
  const c = Object.fromEntries(groups.map((g) => [g._id, g.n]));
  res.json({
    total, new: c.new || 0, contacted: c.contacted || 0, converted: c.converted || 0, due,
    rate: total ? Math.round(((c.converted || 0) / total) * 100) : 0,
  });
}));

r.patch('/:id', wrap(async (req, res) => {
  const b = req.body, patch = {};
  for (const k of ['name', 'email', 'phone', 'source']) if (k in b) patch[k] = str(b[k]);
  if ('status' in b) {
    if (!STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status' });
    patch.status = b.status;
  }
  if ('followUpDate' in b) patch.followUpDate = b.followUpDate || null;
  const lead = await Lead.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
}));

r.post('/:id/notes', wrap(async (req, res) => {
  const text = str(req.body.text);
  if (!text) return res.status(400).json({ error: 'Write a note first' });
  const followUp = req.body.followUp || null;
  const update = { $push: { notes: { $each: [{ text, followUp }], $position: 0 } } };
  if (followUp) update.$set = { followUpDate: followUp }; // the lead's next follow-up
  const lead = await Lead.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
}));

r.delete('/:id', wrap(async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json({ ok: true });
}));

export default r;
