# Granti Server (Legacy Express Backend)

> **Note:** This Express.js server is provided for local development or self-hosted deployments. For production, we recommend using the **Vercel Serverless Functions** in the `/api` directory instead.

This directory contains the backend server and database schema for the Granti loan application system.

## Files

- **index.js**: Express.js server with REST API endpoints (for local development)
- **schema.sql**: PostgreSQL database schema for Neon

## Recommended: Vercel + Neon Deployment

For production, deploy to **Vercel** using the serverless functions in `/api`. See the main README for deployment instructions.

## Alternative: Self-Hosted Express Server

If you prefer to run your own Express backend:

### Database Setup

1. Create a new project at [Neon Console](https://console.neon.tech)
2. Copy your connection string
3. Set the `DATABASE_URL` environment variable in `.env`:
   ```
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```
4. Run the schema file to create all tables:
   ```bash
   psql $DATABASE_URL -f server/schema.sql
   ```

### Running the Server

```bash
cd server
npm install express cors pg dotenv
node index.js
```

The server will run on port 3000 (or the PORT environment variable).

Set `VITE_API_URL=http://localhost:3000` in your frontend `.env` file.
