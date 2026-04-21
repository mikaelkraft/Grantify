## Grantify

Grantify is a Nigeria-focused matching and discovery platform that helps users find relevant grants and reputable loan providers, read community content, and make more informed decisions.

Important:
- Grantify does not issue loans or grants directly.
- Any final decision and terms are determined by third-party providers.

## Autoblog (Vercel Cron)

If enabled, a daily blog post can be auto-published via the cron defined in [vercel.json](vercel.json) at the path `/api/cron/daily-blog`.

### Cron authentication (why you may see 401)

The endpoint is protected. In Vercel, the recommended way to secure cron jobs is to set `CRON_SECRET` in your Vercel Environment Variables. When `CRON_SECRET` is set, Vercel Cron Jobs will call your cron URL with:

- `Authorization: Bearer <CRON_SECRET>`

This repo also supports `BLOG_CRON_SECRET` for manual/local triggering (`/api/cron/daily-blog?key=...`).

If your logs show `401 Unauthorized` from `vercel-cron/1.0`, it usually means:

- You set `BLOG_CRON_SECRET`, but did not set `CRON_SECRET` in Vercel (so Vercel didn’t attach the Authorization header).

Fix:

- In Vercel → Project → Settings → Environment Variables: set `CRON_SECRET` to the same value as `BLOG_CRON_SECRET`.

## Offsite Blog Image Uploads

To reduce Vercel bandwidth/storage usage (and avoid storing images in Postgres), the Admin blog editor can upload images directly to offsite storage using signed upload URLs.

Supported providers:

- `s3` (S3/R2-compatible object storage)
- `onedrive` (uses your OneDrive quota; requires OAuth)
- `gdrive` (uses your Google Drive quota; requires OAuth)

### Environment variables

- `OFFSITE_UPLOADS_ENABLED=true`

Pick a provider:

- `OFFSITE_UPLOADS_PROVIDER=s3` (default)
- `OFFSITE_UPLOADS_PROVIDER=onedrive`
- `OFFSITE_UPLOADS_PROVIDER=gdrive`

### Google Drive configuration

Required:

- `GDRIVE_CLIENT_ID`
- `GDRIVE_CLIENT_SECRET`

Optional (defaults shown):

- `GDRIVE_REDIRECT_URI` (default: `https://<your-domain>/api/uploads/gdrive/callback`)

How to generate `GDRIVE_CLIENT_ID` / `GDRIVE_CLIENT_SECRET`:

1. Go to Google Cloud Console → create/select a project.
2. APIs & Services → Library → enable **Google Drive API**.
3. APIs & Services → OAuth consent screen:
	- Choose **External** (typical) or **Internal** (Workspace only).
	- Add your app name and support email.
	- Add test users (your Google account) if the app is in testing.
4. APIs & Services → Credentials → Create Credentials → **OAuth client ID**.
	- Application type: **Web application**.
	- Authorized redirect URIs: add the exact callback URL(s) you will use:
	  - Production: `https://<your-domain>/api/uploads/gdrive/callback`
	    - For this repo’s production domain: `https://grantify.help/api/uploads/gdrive/callback`
	  - Local dev (optional): `http://localhost:3001/api/uploads/gdrive/callback`
5. Copy the generated values into environment variables:
	- `GDRIVE_CLIENT_ID` (Client ID)
	- `GDRIVE_CLIENT_SECRET` (Client secret)

Notes:

- The redirect URI must match exactly (including `http` vs `https` and port). If you use local dev, set `GDRIVE_REDIRECT_URI=http://localhost:3001/api/uploads/gdrive/callback`.
- Google only returns a refresh token the first time you consent for a given client + user. If you don’t get a refresh token, remove the app from your Google Account → Security → Third-party access, then reconnect.

Connect once (as an Admin):

- When prompted in the Admin UI during an image upload, complete the Google consent flow in the newly opened tab/window, then retry the upload.

Notes:

- Uploaded images are stored under `Grantify/blog-images` in your Drive.
- Public visitors can view images via `/api/uploads/gdrive/image?id=<fileId>` (the server streams the bytes from Drive).

### OneDrive (free) configuration

Required:

- `ONEDRIVE_CLIENT_ID`
- `ONEDRIVE_CLIENT_SECRET`

Optional (defaults shown):

- `ONEDRIVE_TENANT` (default `consumers` for personal OneDrive)
- `ONEDRIVE_REDIRECT_URI` (default: `https://<your-domain>/api/uploads/onedrive/callback`)

Connect once (as an Admin):

- When prompted in the Admin UI during an image upload, complete the OneDrive consent flow in the newly opened tab/window, then retry the upload.

Notes:

- After upload, the server creates an anonymous share link so images are viewable by anyone.

### S3/R2 configuration

Required:

- `S3_BUCKET` (bucket name)
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL` (public base URL where objects are served, e.g. `https://pub-<id>.r2.dev` or your custom domain)

Optional (needed for Cloudflare R2 and some S3-compatible providers):

- `S3_ENDPOINT` (e.g. `https://<accountid>.r2.cloudflarestorage.com`)
- `S3_REGION` (defaults to `auto`)

### Notes

- The upload endpoint is `POST /api/uploads/image` and requires an Admin session.
- The browser uploads the file directly to storage with `PUT` (the server only generates the signed URL).
- Your bucket must allow CORS for `PUT` from your site origin.
