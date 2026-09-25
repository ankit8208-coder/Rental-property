# Rental Property Management Portal

CountryEdu internship project MVP. This implementation intentionally uses a single Express service that serves the responsive frontend and REST API, making it easy for a beginner to run and deploy.

## Features
- Tenant / Owner registration and JWT login
- Role-based dashboards for Tenant, Property Owner and Admin
- Property CRUD
- Search + filters + detailed property view
- Property image upload
- Rental request submit / approve / reject
- User profile management
- Admin platform dashboard, user management and property approval
- SQLite relational database
- REST API + OpenAPI JSON
- Responsive UI
- Validation and error handling

## Demo accounts
- Admin: `admin@example.com` / `Admin@123`
- Owner: `owner@example.com` / `Owner@123`
- Tenant: `tenant@example.com` / `Tenant@123`

Change the demo passwords before any real production use.

## Run locally (Windows)
1. Install Node.js 20+.
2. Open this folder in Terminal / PowerShell.
3. Run `npm install`
4. Run `npm start`
5. Open `http://localhost:3000`

## Optional development mode
`npm run dev`

## API documentation
After the server starts, open:
`http://localhost:3000/api-docs.json`

## Notes for deployment
This is an MVP designed for demonstration. File uploads and SQLite data are stored on local disk. Some cloud hosts use ephemeral disks, so for a production-grade version replace SQLite with managed PostgreSQL and image storage with a persistent object-storage service.
