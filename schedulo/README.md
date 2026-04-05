# Schedulo

Schedulo now has a persisted backend for Vercel deployment:

- MongoDB-backed employee, manager, shift, availability, PTO, swap request, and audit data
- Hashed passwords with JWT-based auth
- Manager-only protection for employee management and scheduling actions
- Vercel API entrypoints under `/api`
- CRA frontend configured to use the same `/api` routes in production and a local proxy in development

## Environment Variables

Copy `.env.example` to `server/.env` for local development, then fill in:

- `MONGO_URI`
- `JWT_SECRET`

You can also override the seed credentials with the `SEED_*` variables.

## Local Development

From the `schedulo` folder:

```bash
npm install
npm run dev
```

That starts:

- the backend on `http://localhost:4000`
- the React app on `http://localhost:3000`

## Vercel

Set these project environment variables in Vercel:

- `MONGO_URI`
- `JWT_SECRET`
- optional `SEED_MANAGER_*` and `SEED_EMPLOYEE_*`

Vercel will:

- build the React app into `client/build`
- serve the backend from the `api/` directory

## Seed Accounts

If the database is empty, the backend seeds:

- `manager / Manager1234!`
- `employee / Employee1234!`

Change these via env vars before production if you do not want the defaults.
