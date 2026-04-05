# Schedulo

Schedulo is a full-stack employee scheduling application built for workplace scheduling and staff management.

The project includes:

- a React frontend for managers and employees
- a Node.js and Express backend
- MongoDB persistence through Mongoose
- JWT-based authentication with hashed passwords

Employee accounts, manager accounts, schedules, availability, PTO requests, shift swap requests, and related app data are stored in MongoDB.

## Environment Variables

Create [server/.env](/capstone_project/schedulo/server/.env) and add:

```env
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
```

Optional seed overrides:

```env
SEED_MANAGER_USERNAME=manager
SEED_MANAGER_PASSWORD=Manager1234!
SEED_MANAGER_NAME=Store Manager
SEED_EMPLOYEE_USERNAME=employee
SEED_EMPLOYEE_PASSWORD=Employee1234!
SEED_EMPLOYEE_NAME=Sample Employee
```



## Running Locally

This project uses MongoDB for persistent storage. Even when running locally, the app is still using the real backend and database through `MONGO_URI`.

From [schedulo](/capstone_project/schedulo):


Terminal 1:

```powershell
cd c:\Users\sami\Documents\capstone\capstone_project\schedulo
npm --workspace server run dev
```

Terminal 2:

```powershell
cd c:\Users\sami\Documents\capstone\capstone_project\schedulo
npm --workspace client start
```

## Demo Accounts

For local demonstration, the backend can seed default accounts if they do not already exist in the database.

Example demo logins:

- Manager: `manager / Manager1234!`
- Employee: `employee / Employee1234!`

These are demo credentials for testing the application locally. They are not meant to replace the real database-backed authentication system.

## Backend and Database Notes

This application is not using only hardcoded local login logic.

The backend connects to MongoDB using `MONGO_URI`, and MongoDB is used to persist:

- manager and employee accounts
- login credentials
- employee availability
- generated and manual schedules
- PTO requests
- shift swap requests
- other employee scheduling data needed for the app to function

The seeded demo accounts are simply a convenient way to test the app after connecting the backend to MongoDB.

## Vercel

For deployment, configure the Vercel project with:

- `Root Directory = schedulo`
- `MONGO_URI`
- `JWT_SECRET`

Vercel will use the frontend build output and the API files in [api](capstone_project/schedulo/api).
