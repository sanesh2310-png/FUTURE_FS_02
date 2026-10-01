import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  followUp: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String, required: [true, 'Email is required'], trim: true, lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email'],
    },
    phone: { type: String, trim: true, maxlength: 30 },
    message: { type: String, trim: true, maxlength: 2000 },
    source: { type: String, trim: true, default: 'Website', maxlength: 60 },
    status: { type: String, enum: ['new', 'contacted', 'converted', 'lost'], default: 'new' },
    followUpDate: { type: Date, default: null },
    notes: [noteSchema],
  },
  { timestamps: true }
);

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
});

export const Lead = mongoose.model('Lead', leadSchema);
export const Admin = mongoose.model('Admin', adminSchema);
export const STATUSES = ['new', 'contacted', 'converted', 'lost'];
