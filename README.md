# danshaw.dev — my personal site

A static, zero-backend personal site: home/about, work (pulled live from GitHub), writing (blog), and a password-gated admin panel so I can manage posts myself.

## Before I deploy

1. **Set my own admin password.** In `js/admin.js`:
   ```js
   const ADMIN_PASSWORD = 'changeme-dan2026';
   ```
   Read the security note below first — this is a light gate, not real auth.

2. **Update contact links.** In `index.html`, swap the placeholder `mailto:hello@danshaw.dev` and LinkedIn URL for my real ones.

3. **Swap in real photos.** Each dashed "photo placeholder" box in the "Off duty" section on `index.html` is a plain `<div class="photo-slot">`. Replace it with an `<img>` tag once I've picked images, e.g.:
   ```html
   <img src="assets/img/golf.jpg" alt="On the course" style="width:100%; border-radius:2px; margin-top:16px;">
   ```
   Images go in `assets/img/`.

## Deploying

Plain HTML/CSS/JS — no build step. Easiest free options:

- **GitHub Pages:** push this folder to a repo, enable Pages on the `main` branch, done.
- **Netlify / Vercel:** drag-and-drop the folder or connect the repo; both auto-detect static sites.

Point the domain's DNS at whichever I choose.

## How the blog works (and its one real limitation)

Posts are stored in `data/posts.json` and loaded into the browser's `localStorage` on first visit. The admin panel at `/admin.html` reads and writes to that same local storage — so I can draft, edit, and delete posts entirely in the browser.

**The catch:** `localStorage` is per-browser, per-device. If I write a post on my laptop, it won't appear for site visitors (or on my phone) until I:

1. Click **Export posts.json** in the admin panel.
2. Replace `data/posts.json` in the repository with the downloaded file.
3. Push/redeploy.

That's the trade-off of having no backend or database — free hosting, no dependencies, at the cost of a manual publish step. Fine for now since I'm the only one writing.

### If I want real one-click publishing later

Swap the storage layer for something with a small always-on backend, e.g.:
- **Supabase** or **Firebase** (free tier) — a `posts` table, admin panel writes directly to it, `blog.html`/`post.html` read from it.
- A tiny serverless function (Cloudflare Worker / Vercel function) backed by KV or a JSON file in a private repo, triggered by the admin panel.

Either removes the export/import step and the localStorage limitation entirely.

## Security note on the admin page

The password check in `js/admin.js` runs entirely in the browser — anyone who views page source can read the password. It's enough to stop a casual visitor from finding the editor UI, but it is **not** real authentication. Not reusing a real password here, and not relying on this to protect anything sensitive. Real login is part of the Supabase/Firebase upgrade path above if I need it later.

## Favicon & link previews (Open Graph)

- Favicon: `assets/img/favicon.svg` (modern browsers) with `favicon-512.png` / `apple-touch-icon.png` as fallbacks — a "DS" monogram with the same status-dot accent as the nav logo.
- Every page has Open Graph + Twitter Card tags so links preview properly on LinkedIn, Slack, iMessage, etc. They currently point at `https://www.danshaw.dev/...` — **update the domain in the `og:url`/`og:image` tags once the real domain's live**, otherwise the preview image won't load.
- `assets/img/og-image.png` is the 1200×630 share image used everywhere. Easy to regenerate or swap for something else any time — it's a plain static PNG.
- `post.html` updates its own title/description via JS for anyone browsing in a real browser, but most link-preview bots (LinkedIn especially) don't execute JavaScript, so shared post links currently show the generic site preview rather than that post's own title/excerpt. Fixing that properly needs server-side rendering or a prerender step — a contained follow-up, not a rebuild, if it starts to matter.

## The signature element — plotter-bot

A small canvas animation on the homepage: a robot moves at constant speed along a single-stroke path, drawing a trail that spells out "DAN SHAW," lifting its pen between letters like a real plotter, then pausing, fading, and looping.

- Lives in `js/robot-trail.js`, rendered inside `.signature-strip` on `index.html` only.
- Respects `prefers-reduced-motion` — draws the finished, static trail with no animation for anyone with that OS setting on.
- To change the wording it plots, edit the `WORD` constant near the top of `js/robot-trail.js`. Only `D A N S H A W` and space have letterforms defined right now — extend the `LETTERS` object for other letters.

## Structure

```
index.html      Home — hero, experience timeline, personal section, contact
projects.html   Work — live GitHub repos (fallback data if the API is rate-limited)
blog.html       Writing — post list
post.html       Single post view (?slug=your-post-slug)
admin.html      Password-gated post editor
css/style.css   Design system
js/             Shared logic (nav, GitHub fetch, post storage, admin, markdown render)
data/posts.json Seed posts (loaded into localStorage on first visit)
```
