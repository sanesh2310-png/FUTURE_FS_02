# FUTURE_FS_02 – Leadlane (Mini CRM)

A small CRM for managing client leads that arrive from website contact forms. Built for the Future Interns Full Stack Web Development internship, Task 2.

## Features
- **Contact form endpoint** (`POST /api/leads`): any website form can send leads in
- **Secure admin login** (JWT, bcrypt-hashed password); only admins can read or change leads
- **Overview dashboard**: totals, conversion rate, conversion funnel, lead sources with conversion by channel, new leads per week, follow-ups due, latest leads
- **Leads table** with search, stage filters and a pipeline stage indicator
- **Board view**: drag leads between New, Contacted, Converted and Lost
- **Lead details**: stage stepper, mark as lost, edit details, next follow-up date
- **Notes and follow-ups**: each note can carry a follow-up date; overdue ones are highlighted
- **New lead form** with stage, follow-up date, the lead's message and a first note

## Tech stack
React (Vite) · Node.js · Express · MongoDB (Mongoose) · JWT

## Quick start on Windows
Double-click `start.bat`. It installs packages the first time, starts the API and the dashboard, and opens the app in Edge. Keep the two windows it opens running.

## Run it locally
Requires Node 18+ and a MongoDB database (a free MongoDB Atlas cluster works).

```bash
# Terminal 1: API
cd server
cp .env.example .env     # then fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run dev              # http://localhost:5000

# Terminal 2: dashboard
cd client
npm install
npm run dev              # http://localhost:5173
```
Sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `server/.env`. To see a lead arrive from a website form, open `http://localhost:5173/contact-demo.html` and submit it.

## API
| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | none | Get a token |
| POST | `/api/leads` | none | Create a lead (contact form). Admins may also set stage, follow-up date and a first note |
| GET | `/api/leads` | admin | List leads |
| PATCH | `/api/leads/:id` | admin | Update stage, follow-up date or details |
| POST | `/api/leads/:id/notes` | admin | Add a note, optionally with a follow-up date |
| DELETE | `/api/leads/:id` | admin | Delete a lead |

## Notes
Never commit `server/.env`. Ideas for next steps: email alerts for new leads, login rate limiting, pagination, CSV export.
