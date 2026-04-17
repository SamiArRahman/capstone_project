# Schedulo

Schedulo is a full-stack employee scheduling application for workplace scheduling and staff management.

It includes:

- a React frontend for managers and employees
- a Node.js and Express backend
- MongoDB persistence through Mongoose
- JWT-based authentication with hashed passwords

The app stores manager and employee accounts, schedules, availability, PTO requests, shift swap requests, and related scheduling data in MongoDB.

## Features

- manager and employee login
- seeded demo accounts for local testing
- employee availability management
- manual and auto-generated schedules
- employee profile email management
- finalized schedule emails for the selected week
- PTO request workflow
- shift swap workflow
- employee management for managers
- audit log tracking

## Project Structure

- `client/` - React frontend
- `server/` - Express API and MongoDB models
- `render.yaml` - Render blueprint for the backend service

## Prerequisites

Before running the project locally, make sure you have:

- Node.js and npm installed
- a MongoDB connection string
  - MongoDB Atlas is fine
  - a local MongoDB instance is also fine

## Environment Variables

Create `server/.env` from `server/.env.example` and add:

```env
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM=Schedulo <no-reply@example.com>
```

Optional seed overrides:

```env
SEED_MANAGER_USERNAME=manager
SEED_MANAGER_PASSWORD=Manager1234!
SEED_MANAGER_NAME=Store Manager
SEED_MANAGER_EMAIL=manager@schedulo.local
SEED_EMPLOYEE_USERNAME=employee
SEED_EMPLOYEE_PASSWORD=Employee1234!
SEED_EMPLOYEE_NAME=Sample Employee
SEED_EMPLOYEE_EMAIL=employee@schedulo.local
```

Notes:

- `MONGO_URI` is required for the app to function locally.
- The server has a local-development fallback for `JWT_SECRET`, but setting it explicitly is recommended.
- `CORS_ORIGIN` is optional locally, but recommended in production so only your frontend origin can call the API from the browser.
- SMTP settings are required if you want `Finalize Schedule` to send weekly schedule emails.

Create `client/.env` from `client/.env.example` if you want the frontend to call a deployed backend outside local development.

## Install Dependencies

Open a terminal in the `schedulo` folder, then run:

```bash
npm install
```

If PowerShell blocks `npm` on your machine, use one of these instead:

```powershell
npm.cmd install
```

or run the commands in Command Prompt instead of PowerShell.

## Run Locally

### Cross-platform method

Use two terminals from the `schedulo` folder.

Terminal 1:

```bash
npm --workspace server run dev
```

Terminal 2:

```bash
npm --workspace client start
```

The app should be available at:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`

The frontend proxies API requests to the backend during local development.



## Demo Accounts

After the backend successfully connects to MongoDB, it will seed demo accounts if they do not already exist:

- Manager: `manager / Manager1234!`
- Employee: `employee / Employee1234!`

If those usernames already exist in the database, the seed step is skipped.

## Troubleshooting

### `MONGO_URI is not configured`

Create `server/.env` and add a valid `MONGO_URI`.

### The frontend opens but API requests fail

Check that:

- the backend is running on port `4000`
- MongoDB is reachable from your machine
- the `MONGO_URI` value is correct

### PowerShell says running scripts is disabled

Use `npm.cmd` instead of `npm`, or run the commands in Command Prompt.

### Demo accounts do not work

Make sure the backend connected to MongoDB successfully on startup. The seed accounts are only created after a working database connection is established.

## Deployment Notes

This repo is a good fit for:

- Vercel for the React frontend
- Render for the Express + MongoDB backend

### Frontend on Vercel

Create a Vercel project with:

- Root Directory: `client`
- Framework Preset: Create React App

Set this environment variable in Vercel:

- `REACT_APP_API_BASE=https://your-render-service.onrender.com/api`

Notes:

- The frontend already reads `REACT_APP_API_BASE` in `client/src/lib/api.js`.
- `client/vercel.json` adds an SPA rewrite so React Router routes still load on refresh or direct navigation.

### Backend on Render

Create a Render Web Service with:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`

Required environment variables:

- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGIN=https://your-frontend-project.vercel.app`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

Notes:

- The backend already reads `PORT`, which matches Render's port-binding guidance.
- `render.yaml` is included if you want to create the service from a Blueprint instead of entering settings by hand.
- The API connects to MongoDB on demand, so you do not need a separate worker process.

### Suggested order

1. Deploy the backend to Render and confirm `GET /api/health` returns `{ "ok": true }`.
2. Add the Render URL to Vercel as `REACT_APP_API_BASE`.
3. Deploy the frontend to Vercel.
4. Set `CORS_ORIGIN` on Render to your final Vercel frontend URL and redeploy the backend.

### Free-tier warning

- Vercel Hobby is free for personal projects.
- Render Free works well for demos and capstones, but free web services spin down after 15 minutes of inactivity and are not recommended for production.
