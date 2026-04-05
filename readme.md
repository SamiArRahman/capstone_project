hi

## Run locally

**Requirements:** Node.js, MongoDB Atlas (or other Mongo) URI.

1. **API** — from `schedulo/server`:
   - Copy `schedulo/.env.example` to `schedulo/server/.env` and set `MONGO_URI` and `JWT_SECRET`.
   - `npm install` then `npm start` → **http://localhost:4000** (health: `/api/health`).

2. **Web app** — from `schedulo/client`:
   - `npm install` then `npm start` → **http://localhost:3000** (proxies `/api` to port 4000).

From `schedulo`: `npm install` then `npm run dev` — API on **4000**, app on **3000**.

## Login (seed users)

After the API connects to Mongo once, these are created if missing:

| Role     | Username   | Password       |
|----------|------------|----------------|
| Manager  | `manager`  | `Manager1234!` |
| Employee | `employee` | `Employee1234!` |

Override via `SEED_*` env vars in `schedulo/server/.env` (see `server/src/config.js`).

## Deploy (Vercel)

Set project env: `MONGO_URI`, `JWT_SECRET`. Root directory: `schedulo`. Atlas **Network Access** must allow your deploy environment.
