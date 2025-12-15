# Granti Server

This directory contains the backend server and database schema for the Granti loan application system.

## Files

- **index.js**: Express.js server with REST API endpoints
- **schema.sql**: PostgreSQL database schema for Neon

## Database Setup

### Using Neon PostgreSQL

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

### Schema Overview

The schema includes 6 tables:

1. **applications**: Loan application data with status tracking
2. **testimonials**: Success stories with voting metrics (likes, loves, claps)
3. **qualified_persons**: List of approved applicants
4. **ads**: Advertising configuration (singleton)
5. **admin_users**: Admin authentication with role-based access
6. **repayment_content**: Dynamic content for repayment page (singleton)

### Features

- ✅ Auto-updating timestamps on all tables
- ✅ Performance indexes on frequently queried columns
- ✅ Data integrity constraints (CHECK, UNIQUE, NOT NULL)
- ✅ Idempotent design - safe to run multiple times
- ✅ Compatible with Neon PostgreSQL

## Running the Server

```bash
npm install
npm start
```

The server will run on port 3000 (or the PORT environment variable).

## API Endpoints

### Applications
- `GET /applications` - List all applications
- `POST /applications` - Submit new application

### Testimonials
- `GET /testimonials` - List all testimonials
- `PUT /testimonials/:id` - Update testimonial
- `POST /testimonials` - Bulk save (replace all)

### Qualified Persons
- `GET /qualified` - List qualified persons
- `POST /qualified` - Bulk save (replace all)

### Advertising
- `GET /ads` - Get ad configuration
- `POST /ads` - Update ad configuration

### Admin Users
- `GET /admins` - List admin users
- `POST /admins` - Bulk save (replace all)
- `POST /auth/login` - Admin login

### Content
- `GET /content/repayment` - Get repayment page content
- `POST /content/repayment` - Update repayment page content
