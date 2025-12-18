
### Grantify - Loans and Grants 

A loan and grants application platform for Nigerian small businesses and families.

## Features

- Loan application forms (Standard & Fast-Track)
- Admin dashboard for managing applications
- Testimonials management with approval workflow
- Qualified persons list
- Ad management
- Repayment content management

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Vercel Serverless Functions
- **Database**: Neon PostgreSQL
- **Deployment**: Vercel

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (create `.env` file):
   ```bash
   DATABASE_URL=your_neon_connection_string
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

## Deploy to Vercel

### 1. Database Setup (Neon PostgreSQL)

1. Create a free account at [Neon Console](https://console.neon.tech)
2. Create a new project
3. Copy your connection string (it looks like `postgresql://user:password@host/database?sslmode=require`)
4. Run the schema to create all tables:
   ```bash
   psql $DATABASE_URL -f server/schema.sql
   ```

### 2. Vercel Deployment

1. Push your code to GitHub
2. Import the project to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`: Your Neon connection string
   - `SEED_ADMIN_USERNAME`: (Optional) Admin username
   - `SEED_ADMIN_PASSWORD`: (Optional) Admin password
4. Deploy!

### 3. First-Time Setup

After deployment, the database will be automatically seeded with initial data on first visit. You can also manually trigger seeding by calling `POST /api/seed`.

## API Endpoints

### Applications
- `GET /api/applications` - List all applications
- `POST /api/applications` - Submit new application

### Testimonials
- `GET /api/testimonials` - List all testimonials
- `PUT /api/testimonials/:id` - Update testimonial
- `POST /api/testimonials` - Bulk save (replace all)

### Qualified Persons
- `GET /api/qualified` - List qualified persons
- `POST /api/qualified` - Bulk save (replace all)

### Advertising
- `GET /api/ads` - Get ad configuration
- `POST /api/ads` - Update ad configuration

### Admin Users
- `GET /api/admins` - List admin users
- `POST /api/admins` - Bulk save (replace all)
- `POST /api/auth/login` - Admin login

### Content
- `GET /api/content/repayment` - Get repayment page content
- `POST /api/content/repayment` - Update repayment page content

### Database
- `POST /api/seed` - Seed database with initial data (only seeds empty tables)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `SEED_ADMIN_USERNAME` | Admin username for seeding | No |
| `SEED_ADMIN_PASSWORD` | Admin password for seeding | No |
| `SEED_STAFF_USERNAME` | Staff username for seeding | No |
| `SEED_STAFF_PASSWORD` | Staff password for seeding | No |


