# Peak

Personal, self-hosted nutrition tracking. Log meals, track macros, plan your week.

No cloud. No AI. No subscriptions. Your data stays on your machine.

---

## Features

- **Meal logging** — log breakfast, lunch, dinner, snacks, and desserts with serving sizes
- **Macro tracking** — calories, protein, carbs, and fat per meal and per day
- **History** — filterable log with per-category breakdowns
- **Weekly planner** — drag meals into a 7-day grid, copy a day across the whole week
- **Meal catalog** — store recipes with ingredients, source URLs, and recipe text
- **Tester mode** — one-click seed with 15 sample meals and photos to try the app instantly

---

## Quick start (Docker)

**Requirements:** Docker + Docker Compose

```bash
git clone <your-repo-url> peak
cd peak
docker compose up -d
```

Open **http://localhost:3001** in your browser.

Data is stored in a named Docker volume (`peak_data`) and persists across restarts and rebuilds.

### Optional: password protect the app

Create a `.env` file alongside `docker-compose.yml`:

```
APP_PASSWORD=yourpassword
```

Then rebuild:

```bash
docker compose up -d --build
```

---

## Local development

**Requirements:** Node.js 20+

### 1. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Start the backend

```bash
cd backend
node src/index.js
```

Backend runs at **http://localhost:3001**. There is no nodemon — restart manually after backend changes:

```bash
pkill -f "node src/index.js" && node src/index.js &
```

### 3. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend runs at **http://localhost:5173** and proxies `/api` and `/uploads` to the backend automatically.

---

## Production build

The Dockerfile builds the Vite frontend and serves it statically from the Express backend — single container, single port.

```bash
docker compose build
docker compose up -d
```

---

## Project structure

```
peak/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express app entry point
│   │   ├── db/               # SQLite schema + connection
│   │   ├── middleware/        # Auth
│   │   └── routes/           # meals, logs, nutrition, plans, seed
│   └── data/                 # SQLite DB + uploaded photos (gitignored)
├── frontend/
│   └── src/
│       ├── pages/            # Dashboard, LogMeal, History, Meals, WeeklyPlan
│       ├── components/       # Nav
│       └── api.js            # Typed API client
├── Dockerfile
└── docker-compose.yml
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, CSS Modules, react-router-dom |
| Backend | Express 5, better-sqlite3, multer |
| Database | SQLite (WAL mode) |
| Container | Docker + Docker Compose |
| Fonts | Bebas Neue (display), Inter (UI) |

---

## Design principles

- **No AI anywhere** — nutrition values are entered manually; no AI recipes, no image recognition
- **Self-hosted** — all data lives on your machine or home server
- **Single user** — no accounts, no multi-tenancy
- **Single container** — one `docker compose up` and it runs

---

## Deploying to a home server

1. Clone the repo on your server
2. Add a `.env` file with `APP_PASSWORD=yourpassword`
3. Run `docker compose up -d --build`
4. Point a reverse proxy (nginx, Caddy) at port `3001` if you want HTTPS

The `peak_data` volume holds your database and photos — back it up with:

```bash
docker run --rm -v peak_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/peak-backup.tar.gz /data
```
