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
- PTO request workflow
- shift swap workflow
- employee management for managers
- audit log tracking

## Project Structure

- `client/` - React frontend
- `server/` - Express API and MongoDB models
- `api/` - Vercel serverless entry points

## Prerequisites

Before running the project locally, make sure you have:

- Node.js and npm installed
- a MongoDB connection string
  - MongoDB Atlas is fine
  - a local MongoDB instance is also fine

## Environment Variables

Create `server/.env` and add:

```env
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
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

The simplest deployment setup for this repo is two separate Vercel projects:

### Frontend project

Configure a Vercel project with:

- Root Directory: `schedulo/client`

Environment variables:

- `REACT_APP_API_BASE=https://your-backend-domain.vercel.app/api`

### Backend project

Configure a second Vercel project with:

- Root Directory: `schedulo/server`

Environment variables:

- `MONGO_URI`
- `JWT_SECRET`

Notes:

- The frontend already reads `REACT_APP_API_BASE` and falls back to `/api` for local use.
- The backend is an Express app and can be deployed directly from `schedulo/server`.
- This avoids Hobby-plan serverless function count limits and avoids mixing the static SPA build with backend routing in one Vercel project.
