# Deploying the eCabin Ledger API to SmarterASP.NET (iisnode)

The backend is a Node.js/Express app. SmarterASP.NET runs Node on Windows/IIS via
**iisnode**. The MSSQL database already lives on the same provider
(`sql8002.site4now.net`), so the API sits right next to it.

This repo is already configured for iisnode:
- `web.config` — iisnode handler + URL-rewrite (points at root `server.js`)
- `server.js` (root) — shim that loads `src/server.js`
- `src/config/env.js` — reads `process.env.PORT` (iisnode passes a named pipe, not a number)
- `src/app.js` — restores `req.url` from the `x-original-url` header

## 1. Create the Node site on SmarterASP.NET
1. Control panel → **Node.js Website** → create a new site (or attach to an existing
   domain). Note the temporary URL — it looks like `http://macron-001-site3.ktempurl.com`.
2. Set the Node version to a recent LTS in the panel.

## 2. Upload the app
Upload everything **except** `node_modules`, `.env`, `uploads/`, and `.git`:
- via the panel File Manager (zip + extract), or FTP.
- Then either run `npm install --production` from the panel's Node console, or upload a
  pre-built `node_modules`. (SmarterASP.NET supports `npm install` from the site's Node console.)

## 3. Production environment variables
Create `.env` in the site root (copy from `.env.example`) with **production** values:
```
DB_SERVER=sql8002.site4now.net
DB_PORT=1433
DB_USER=db_ac232d_android_admin
DB_PASSWORD=<the real password>
DB_NAME=db_ac232d_android
PORT=4000                # ignored under iisnode (named pipe), keep for local dev
NODE_ENV=production
CORS_ORIGIN=*            # tighten to the web-app origin(s) once known
JWT_SECRET=<long random string>   # REQUIRED — app now fails fast if missing
```
> `JWT_SECRET` is mandatory: it signs login tokens and gates `/uploads`. The app throws
> on startup if it's absent (see `src/config/env.js`).

## 4. Verify
- Hit `http://<your-ktempurl>/api/...` (e.g. the health/aircraft route).
- Check `logs/` (iisnode logging is enabled in `web.config`) if it 500s.
- `uploads/` must be writable — it's created at runtime; confirm the app pool can write.

## Notes
- **HTTP vs HTTPS:** the temp `ktempurl.com` URL is HTTP. The Android app has
  `usesCleartextTraffic: true` so HTTP works, but prefer HTTPS once a real domain + cert
  is attached, then update `EXPO_PUBLIC_API_URL` in the app's `eas.json`.
- **DB encryption:** `src/config/db.js` uses `encrypt: false, trustServerCertificate: true`,
  which matches SmarterASP.NET shared SQL.
- Max upload size is capped at 20 MB in `web.config` (`maxAllowedContentLength`).
