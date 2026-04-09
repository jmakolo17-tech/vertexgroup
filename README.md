# Vertex Group Africa — Full-Stack Application

MERN-stack backend + static frontend for the Vertex Group Africa website and internal dashboard.

---

## Project Structure

```
vertex-africa/
├── backend/          ← Node.js + Express + MongoDB API
│   ├── server.js
│   ├── config/db.js
│   ├── models/       ← User, Lead, Diagnostic, Newsletter, Client, Notification
│   ├── routes/       ← auth, leads, diagnostics, newsletter, clients, dashboard, users
│   ├── controllers/
│   ├── middleware/   ← JWT auth, file upload (multer)
│   └── utils/        ← email (nodemailer), seed script
└── frontend/
    ├── index.html    ← Vertex Group website (React via CDN)
    ├── dashboard.html← Internal intelligence dashboard
    └── config.js     ← Set API base URL here for production
```

---

## Quick Start (Local)

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm run seed                 # creates admin + team users in MongoDB
npm run dev                  # starts on http://localhost:5000
```

### 2. Frontend

Open `frontend/index.html` and `frontend/dashboard.html` directly in a browser,
or serve them with any static file server:

```bash
cd frontend
npx serve .                  # http://localhost:3000
```

The frontend will automatically connect to `http://localhost:5000`.

---

## Environment Variables (`backend/.env`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `PORT` | Server port (default `5000`) |
| `FRONTEND_URL` | Comma-separated allowed CORS origins |
| `EMAIL_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `EMAIL_USER` | SMTP username / sender address |
| `EMAIL_PASS` | SMTP password / app password |
| `ANTHROPIC_API_KEY` | Claude API key for AI diagnostics |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password |

---

## API Endpoints

### Public (no auth required)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/leads/contact` | Website contact form |
| `POST` | `/api/leads/quote` | Quote request form |
| `POST` | `/api/diagnostics` | Submit AI business diagnostic |
| `GET`  | `/api/diagnostics/:id/result` | Poll diagnostic result |
| `POST` | `/api/newsletter/subscribe` | Newsletter subscription |
| `POST` | `/api/newsletter/unsubscribe` | Unsubscribe |

### Protected (JWT Bearer token)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Dashboard login |
| `GET`  | `/api/auth/me` | Current user |
| `GET`  | `/api/dashboard/stats` | Overview metrics + charts |
| `GET`  | `/api/dashboard/notifications` | Notification feed |
| `PATCH`| `/api/dashboard/notifications/read-all` | Mark all read |
| `GET`  | `/api/leads` | List/search leads |
| `PATCH`| `/api/leads/:id` | Update stage, assignment, value |
| `POST` | `/api/leads/:id/notes` | Add CRM note |
| `GET`  | `/api/clients` | Active client list |
| `PATCH`| `/api/clients/:id/kpis` | Update KPI tracking |
| `GET`  | `/api/users` | Team members (admin only) |
| `POST` | `/api/users` | Create team member (super_admin) |

---

## Deployment

### Backend → Render / Railway / Heroku
1. Push `backend/` to a Git repo
2. Set all environment variables in the platform dashboard
3. Build command: `npm install`
4. Start command: `node server.js`
5. Run `npm run seed` once via the platform console

### Frontend → Netlify / Vercel / GitHub Pages
1. Edit `frontend/config.js` and set `window.VERTEX_API_BASE` to your backend URL
2. Deploy the `frontend/` folder as a static site
3. Set `FRONTEND_URL` in your backend env to the deployed frontend URL (for CORS)

---

## Dashboard Login (after seeding)

| Email | Password | Role |
|---|---|---|
| `admin@vertexgroup.africa` | *(set in .env)* | Super Admin |
| `k.asante@vertexgroup.africa` | `Vertex2025!` | Salesperson |
| `f.ndiaye@vertexgroup.africa` | `Vertex2025!` | Coach |
| `jp.mbeki@vertexgroup.africa` | `Vertex2025!` | Salesperson |
| `a.diallo@vertexgroup.africa` | `Vertex2025!` | Coach |

> **Change all passwords immediately after first login.**
# vertexgroup
