# Landing Pages (service pages on subdomains)

Landing pages such as `cbdt.taxalphonic.com` or `gst.taxalphonic.com` are created, built and
published in the admin panel (sidebar → **Landing Pages**). They use the existing Page Builder
and the website's existing page renderer. Adding a new service subdomain needs **no code change and
no new DNS record**: one wildcard DNS record and certificate serve every label.

## How it works

| Part | Where |
|---|---|
| Record + lifecycle | `landing_pages` (one row per page): service, title, subdomain `slug`, SEO, status, `publishedVersionId` |
| Draft content | A normal `pages` row (`pageId`, slug `landing-page/<slug>`, always status `draft`), edited with the Page Builder. `PageService` hides these rows from the Pages list and public page routes and refuses to publish or delete them there. |
| Live content | `landing_page_versions`: an immutable snapshot per publish (title, slug, service, blocks, SEO). The website reads only the version in `publishedVersionId`, so saving a draft never changes the live page. |
| Header / Body / Footer | One block list. `LandingHeader` and `LandingFooter` blocks are the regions (style: website header/footer, a page-specific "simple" one, or none; no block = website header/footer). The builder keeps them in their own areas; the backend allows one of each. Every other block is a normal Page Builder block, laid out like a service page (hero, main, right sidebar, full width). |
| Hostname → page | Website `proxy.js` + `lib/landingHost.mjs`: `<label>.<base domain>` is rewritten to `/landing-host/<label>` with an internal `x-ta-landing` header (stripped from incoming requests). The route loads `GET /api/v1/landing-pages/public/resolve?slug=<label>`; anything but a published page is a 404. Other paths on a landing host redirect to the same path on the main site. |

Decision: **several landing pages per service** are allowed (campaigns such as `gst` and
`gst-return`); the subdomain label is unique across all landing pages, archived ones included.

## Lifecycle

- **Create** (draft): service (optional), title, subdomain, SEO; starts from the landing template
  (header, hero, overview, enquiry form, footer) or the service page's own blocks.
- **Save draft**: `PUT /:id/draft` writes the draft page only.
- **Preview**: in the admin (Live Preview tab) with the website's own components, unsaved changes
  included; nothing is public. `GET /:id/preview` returns the saved draft (auth + `preview`).
- **Publish**: validates (block structure, one header/footer/hero, at least one body block, no
  `javascript:` links, Form/Packages blocks pick an active form/package), then in one transaction
  writes version N+1 and points `publishedVersionId` at it.
- **Unpublish**: back to draft, `publishedVersionId` cleared → the subdomain answers 404 at once.
- **Archive / Restore**: archived pages are offline and read-only; the subdomain stays reserved.
  Restore returns them as drafts. There is no hard delete.
- **Versions**: every publish is listed; "Copy into draft" puts an old version's blocks back into
  the draft (publish to make it live again); old versions can be deleted (not the live one).

The website fetches the published page with `cache: "no-store"`, so publish / unpublish show on the
next request (no cache to purge).

## API (`/api/v1/landing-pages`)

All admin routes need a login and the `LandingPages` permission named in brackets.

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/public/resolve?slug=` or `?host=` | public | Live version of a published page, else 404 |
| GET | `/` | read | List: `page, limit, search, status (draft/published/archived/all), serviceId, sortBy, sortOrder`; returns `counts` |
| GET | `/service-options` | read | Services for the form (id, title, slug, status) |
| GET | `/check-slug?slug=&exceptId=` | read | Normalised slug, availability and reason |
| POST | `/` | create | Create: `title, slug, serviceId?, copyServiceBlocks?, sections?, metaTitle, metaDescription, keywords, ogImage, robots` |
| GET | `/:id` | read | Details with the draft `sections`, live version, flags |
| PUT | `/:id` | update | Title, service, SEO, subdomain (not while live) |
| PUT | `/:id/draft` | update | Save the builder blocks (`{ sections }`) |
| GET | `/:id/preview` | preview | Saved draft, hydrated like the live page |
| GET | `/:id/validate` | publish | `{ ready, errors }` |
| POST | `/:id/publish` | publish | New version, live |
| POST | `/:id/unpublish` | unpublish | Offline, back to draft |
| POST | `/:id/archive`, `/:id/unarchive` | archive | Archive / restore as draft |
| GET | `/:id/versions` | read | Published versions |
| POST | `/:id/versions/:versionId/restore` | update | Copy a version into the draft |
| DELETE | `/:id/versions/:versionId` | publish | Delete an old version for good (the live one → 409); logged in the audit log |

Errors use the usual shape; validation problems are 422 with `errors: [{ field, message }]`,
lifecycle conflicts (e.g. editing an archived page) are 409. Swagger: `/api-docs`.

Permissions (module `LandingPages`): `read`, `create`, `update`, `preview`, `publish`,
`unpublish`, `archive`. The Admin role has all of them; tick them per role in Roles.

## Subdomain rules

Lowercase letters, digits and hyphens, 2–63 characters, not starting/ending with a hyphen, not only
digits, no `xx--` prefix. Reserved (never a landing page): www, admin, api, app, backend, frontend,
cms, mail/smtp/imap/ftp/cpanel/webmail…, cdn, static, assets, media, uploads, dev, staging, test,
demo, preview, blog, help, support, login, auth, portal, landing and more (`services/landing/subdomain.js`,
same list in the website's `lib/landingHost.mjs`). Add more with `LANDING_RESERVED_SUBDOMAINS`.

## Install / database

```bash
cd tax-alphonic-backend-by-ravi
npx sequelize-cli db:migrate          # 20261023000000-create-landing-pages, 20261023000001-seed-landing-page-permissions
npm test                              # unit tests (subdomain rules, block validation)
```

Rollback of the schema (drops both tables and the permissions; the draft pages stay in `pages`):

```bash
npx sequelize-cli db:migrate:undo     # permissions
npx sequelize-cli db:migrate:undo     # tables
```

## Environment variables

| Project | Variable | Default | Meaning |
|---|---|---|---|
| backend | `LANDING_BASE_DOMAINS` | `taxalphonic.com` | Base domain(s) for `?host=` resolving and the page URLs shown in the admin (first one) |
| backend | `LANDING_RESERVED_SUBDOMAINS` | – | Extra reserved labels, comma-separated |
| website | `LANDING_BASE_DOMAINS` | `taxalphonic.com,localhost` | Hosts whose first label is a landing page (`localhost` makes `cbdt.localhost:3000` work locally) |
| website | `LANDING_RESERVED_SUBDOMAINS` | – | Same extra labels as the backend |
| website | `SITE_URL` | `https://taxalphonic.com` | Main site, target of every non-`/` path on a landing host |

## What the server operator must do (once, not per service)

The application never touches DNS, certificates or the web server.

1. **DNS**: add a wildcard record for the website server, e.g.
   `*.taxalphonic.com  A  <website server IP>` (or `CNAME` to the website host). Existing records
   (`taxalphonic.com`, `www`, `frontend`, `admin`, `api`, mail…) take precedence over the wildcard
   and keep working.
2. **HTTPS**: a wildcard certificate for `*.taxalphonic.com` (Let's Encrypt needs the DNS-01
   challenge for wildcards; the hosting panel's AutoSSL can issue it when DNS is on the same
   account). A plain `taxalphonic.com` certificate does not cover subdomains.
3. **Reverse proxy** (LiteSpeed / Nginx / Apache): send `*.taxalphonic.com` to the same Next.js
   app as the main site and keep the original host:
   - pass `Host` or `X-Forwarded-Host` with the public name (`cbdt.taxalphonic.com`);
   - Nginx example:
     ```nginx
     server {
       listen 443 ssl http2;
       server_name *.taxalphonic.com;
       ssl_certificate     /etc/ssl/wildcard.taxalphonic.com/fullchain.pem;
       ssl_certificate_key /etc/ssl/wildcard.taxalphonic.com/privkey.pem;
       location / {
         proxy_pass http://127.0.0.1:3000;
         proxy_set_header Host $host;
         proxy_set_header X-Forwarded-Host $host;
         proxy_set_header X-Forwarded-Proto https;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
     }
     ```
   - On LiteSpeed / cPanel: add `*.taxalphonic.com` as a wildcard subdomain (or server alias) of
     the website's virtual host and keep the existing proxy rule to the Node app.
   - Hosts that must not be landing pages (`admin`, `api`, `frontend`, …) keep their own vhosts.
4. **Website env**: set `LANDING_BASE_DOMAINS=taxalphonic.com` (and `SITE_URL`) in the website's
   `.env`, rebuild (`npm run build`) and restart. Server Actions (forms) already accept
   `*.taxalphonic.com` in `next.config.mjs`.
5. **Backend env** (optional): `LANDING_BASE_DOMAINS=taxalphonic.com`.

## Example: cbdt.taxalphonic.com, then gst.taxalphonic.com

1. Admin → Landing Pages → **New Landing Page**: service *CBDT*, title, subdomain `cbdt`, SEO;
   *Create & open builder*.
2. Builder: set the Header / Footer style, edit the hero, pick the enquiry form in the Form block,
   add blocks; **Save draft**; check **Live Preview** (desktop / tablet / mobile).
3. **Publish**. `https://cbdt.taxalphonic.com` shows it as soon as the wildcard DNS / SSL / proxy
   above are in place (locally: `http://cbdt.localhost:3000`).
4. For GST: **New Landing Page** → service *GST*, subdomain `gst`, build, publish. Nothing else:
   the same wildcard serves `gst.taxalphonic.com`.

## Known limits

- Landing pages are not in the main sitemap and have no subdomain `robots.txt` (`/robots.txt` on a
  landing host redirects to the main site's). Use the SEO robots field for ads-only pages.
- The admin preview shows a labelled bar for the "Website header / footer" style; the live page
  shows the real ones.
- The draft `pages` row of a landing page shows in the Pages audit history; the landing page's own
  changes are logged under "Landing Pages".

## Form popups (2026-10-23)
Buttons can store `#form-<form id>` (open that form in a popup) or `#form` (the page's own Form block). On publish, `referencesOf` also checks the popup form ids (must exist and be active), and `validateSections` (strict) refuses `#form` when the page has no Form block with a form.
