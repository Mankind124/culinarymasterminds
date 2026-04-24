# Culinary Masterminds

Marketing site, booking form, and admin dashboard for **Culinary Masterminds** — a Nigerian catering company in Gastonia, NC serving Charlotte, Greensboro, and surrounding areas.

- **Frontend**: hand-crafted HTML/CSS/JS — no build step
- **Backend**: Cloudflare Pages Functions (Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Cloudflare Pages

---

## What's in the box

```
.
├── index.html              Home
├── about.html              About
├── services.html           Services / Menu
├── gallery.html            Gallery
├── contact.html            Contact + Booking form
├── 404.html
├── admin/
│   ├── index.html          Admin login
│   └── dashboard.html      Bookings dashboard
├── css/styles.css          Brand stylesheet
├── js/
│   ├── main.js             Nav, scroll, lightbox
│   └── booking.js          Booking form submit handler
├── images/                 Brand photography
├── functions/              Cloudflare Pages Functions
│   ├── _middleware.js
│   └── api/
│       ├── bookings.js     POST /api/bookings (public)
│       └── admin/
│           ├── _auth.js          Shared HMAC session helper
│           ├── login.js          POST /api/admin/login
│           ├── logout.js         POST /api/admin/logout
│           ├── session.js        GET  /api/admin/session
│           └── bookings.js       GET / PATCH / DELETE /api/admin/bookings
├── schema.sql              D1 database schema
├── wrangler.toml           Cloudflare config
├── _headers                Edge security & caching headers
├── _redirects              Edge redirects
├── robots.txt
└── sitemap.xml
```

---

## Deploy to Cloudflare Pages (the easy path — recommended)

You don't need to install anything locally. Everything is done in the Cloudflare dashboard and on GitHub.

### 1. Push this folder to GitHub

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
# then on github.com create a new empty repo named "culinarymasterminds"
git remote add origin https://github.com/YOUR-USERNAME/culinarymasterminds.git
git push -u origin main
```

### 2. Create a Cloudflare account

Go to <https://dash.cloudflare.com/sign-up> — free.

### 3. Create a D1 database

In the dashboard:

- **Workers & Pages** → **D1** → **Create database**
- Name it: `culinarymasterminds-db`
- Once created, click into it → **Console** tab → paste in the contents of [`schema.sql`](./schema.sql) → **Execute**
- Copy the **Database ID** (you'll need it in step 5)

### 4. Connect Pages to GitHub

- **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
- Authorize Cloudflare to access GitHub, pick the `culinarymasterminds` repo
- **Build settings**:
  - Framework preset: **None**
  - Build command: *(leave empty)*
  - Build output directory: `/`
- Click **Save and Deploy**

After ~30 seconds the site will be live at `https://culinarymasterminds.pages.dev`.

### 5. Bind D1 + add secrets

In your Pages project → **Settings** → **Bindings**:

- **D1 database binding**: variable name `DB`, database `culinarymasterminds-db`

In **Settings** → **Variables and Secrets**, add (mark as **Encrypted**):

| Name              | Value                                                                 |
|-------------------|-----------------------------------------------------------------------|
| `ADMIN_PASSWORD`  | A strong password you'll use to log into `/admin`                     |
| `SESSION_SECRET`  | A long random string (≥ 32 chars). Generate one with any password tool. |
| `NOTIFY_WEBHOOK`  | *(optional)* A Discord/Slack webhook URL — new bookings get posted here |

Hit **Save**, then **Deployments** → **Retry deployment** so the new bindings take effect.

### 6. Try it

- Visit `https://culinarymasterminds.pages.dev/contact.html#book` and submit a test booking.
- Visit `https://culinarymasterminds.pages.dev/admin/`, log in with `ADMIN_PASSWORD`, and you'll see the booking.

### 7. (Optional) Custom domain

In your Pages project → **Custom domains** → **Set up a custom domain** → enter `culinarymasterminds.com` (or whatever you own). Cloudflare walks you through the DNS steps. SSL is automatic.

---

## Deploy via Wrangler CLI (alternative — needs Node.js)

If you have Node.js installed:

```bash
npm install -g wrangler
wrangler login

# 1. Create the database
wrangler d1 create culinarymasterminds-db

# 2. Apply schema
wrangler d1 execute culinarymasterminds-db --remote --file=./schema.sql

# 3. Set secrets
wrangler pages secret put ADMIN_PASSWORD --project-name culinarymasterminds
wrangler pages secret put SESSION_SECRET --project-name culinarymasterminds

# 4. Deploy
wrangler pages deploy . --project-name culinarymasterminds
```

> **Note:** This repo intentionally has *no* `wrangler.toml` because newer Wrangler versions
> auto-detect it as a Worker project and break the Pages deployment flow. All Pages bindings
> (D1 database `DB`, secrets `ADMIN_PASSWORD` and `SESSION_SECRET`) are configured via the
> Cloudflare dashboard under **Pages → Settings → Bindings / Variables and Secrets**.

---

## Local development

For a quick preview of the static pages, just open `index.html` in a browser. Booking submissions won't work locally without the Cloudflare functions running — to test those locally you need Wrangler:

```bash
npm install -g wrangler
wrangler pages dev . --d1=DB=culinarymasterminds-db
```

Create a `.dev.vars` file (gitignored) with local values:

```
ADMIN_PASSWORD=test123
SESSION_SECRET=any-long-random-string-for-local-dev-only
```

---

## Editing content

Most updates are simple text edits in the HTML files:

| Change             | Edit                                       |
|--------------------|--------------------------------------------|
| Phone / email      | Search-replace `(336) 338‑4912` and `culinarymasterminds@gmail.com` across all files |
| Menu items         | [`services.html`](./services.html)         |
| About text         | [`about.html`](./about.html)               |
| Gallery photos     | Drop new images into `/images/` and reference them in [`gallery.html`](./gallery.html) |
| Brand colors       | CSS variables at the top of [`css/styles.css`](./css/styles.css) |

After editing, commit and push to GitHub — Cloudflare auto-deploys on every push to `main`.

---

## Admin dashboard

Visit `/admin/` and log in with the `ADMIN_PASSWORD` secret you set in Cloudflare.

You can:
- See all booking requests with name, contact, event details
- Filter by status (new / contacted / confirmed / archived)
- Update status as you progress through each booking
- Delete bookings

Sessions last 8 hours, then you'll be asked to log in again.

---

## Brand info

- **Email**: culinarymasterminds@gmail.com
- **Phone**: (336) 338‑4912
- **Instagram**: [@culinarymasterminds](https://www.instagram.com/culinarymasterminds)
- **Service area**: Gastonia · Charlotte · Greensboro · surrounding NC
- **Status**: Licensed & Insured
