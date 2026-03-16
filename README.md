### Disclaimer ⚠️ 

` To whom it may concern, this script does not offer you loans nor trade user inputs, but it does match you to reputable grants and verified loan apps. Do not hesitate to read the Privacy Policy and Terms. In the future, it might come as one, but for now, it has a detailed page for CBN-licensed loan apps ` 


### Grantify - Loans and Grants 

A loan and grants application platform for Nigerian small businesses and families.

## Features

- Loan application forms (Standard & Fast-Track)
- Admin dashboard for managing applications
- Testimonials management with approval workflow
- Qualified persons list
- **Advertisement management with multiple placement positions**
- Repayment content management

## Advertisement System

Grantify includes a comprehensive ad management system supporting:
- Google AdSense
- Custom HTML/JavaScript ad codes
- Multiple ad placements (Head, Header, Body, Sidebar, Footer)
- Ad blocker detection
- Automatic script loading and initialization


## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Vercel Serverless Functions
- **Database**: Neon PostgreSQL
- **Deployment**: Vercel

## Autoblog (Vercel Cron)

Grantify can auto-publish a daily blog post via the cron defined in [vercel.json](vercel.json) (path: `/api/cron/daily-blog`).

Environment variables:
- `GROQ_API_KEY` (required): used to generate the daily article.
- `AUTOBLOG_ENABLED` (required): set to `true` to allow cron publishing.
- `UNSPLASH_ACCESS_KEY` (optional): higher-quality featured images via the Unsplash API. If omitted, the cron falls back to `source.unsplash.com` (no key required).
- `BLOG_CRON_SECRET` (optional): enables manual triggering without the Vercel cron header.

## That is all for now...
