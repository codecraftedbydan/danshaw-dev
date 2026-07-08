# danshaw.dev — personal site

A static, zero-backend personal site: home/about, work (live from GitHub), writing (blog), and a password-gated admin panel for managing posts.

## Before you deploy

1. **Set your own admin password.** Open `js/admin.js` and change:
   ```js
   const ADMIN_PASSWORD = 'changeme-dan2026';
   ```
   Read the security note below first — this is a light gate, not real auth.

2. **Update contact links.** In `index.html`, swap the placeholder `mailto:hello@danshaw.dev` and LinkedIn URL for your real ones.

3. **Swap in real photos.** Each dashed "photo placeholder" box in the "Off duty" section on `index.html` is a plain `<div class="photo-slot">`. Replace it with an `<img>` tag once you've picked images, e.g.:
   ```html
   <img src="assets/img/golf.jpg" alt="On the course" style="width:100%; border-radius:2px; margin-top:16px;">
   ```
   Drop your images into `assets/img/`.

## Deploying

This is plain HTML/CSS/JS — no build step. Easiest free options:

- **GitHub Pages:** push this folder to a repo, enable Pages on the `main` branch, done.
- **Netlify / Vercel:** drag-and-drop the folder or connect the repo; both auto-detect static sites.

Point your domain's DNS at whichever you choose.

## How the blog works (and its one real limitation)

Posts are stored in `data/posts.json` and loaded into the browser's `localStorage` on first visit. The admin panel at `/admin.html` reads and writes to that same local storage — so you can draft, edit, and delete posts entirely in the browser.

**The catch:** `localStorage` is per-browser, per-device. If you write a post on your laptop, it won't appear for site visitors (or on your phone) until you:

1. Click **Export posts.json** in the admin panel.
2. Replace `data/posts.json` in your repository with the downloaded file.
3. Push/redeploy.

This is the honest trade-off of having no backend or database — it keeps hosting free and the whole thing dependency-free, at the cost of a manual publish step. It's a fine workflow if you're the only writer and you don't mind a `git commit` to go live.

### If you want real one-click publishing later

Swap the storage layer for something with a small always-on backend, e.g.:
- **Supabase** or **Firebase** (free tier) — a `posts` table, admin panel writes directly to it, `blog.html`/`post.html` read from it. A few hours of work, not a rebuild.
- A tiny serverless function (Cloudflare Worker / Vercel function) backed by KV or a JSON file in a private repo, triggered by the admin panel.

Either removes the export/import step and the localStorage limitation entirely. Happy to build either onto this if you want it later.

## Security note on the admin page

The password check in `js/admin.js` runs entirely in the browser — anyone who views page source can read the password. It's enough to stop a casual visitor from finding the editor UI, but it is **not** real authentication. Don't rely on it to protect anything sensitive, and don't reuse a real password you use elsewhere. If you want a real login, that's part of the Supabase/Firebase upgrade path above (it comes with proper auth built in).

## Favicon & link previews (Open Graph)

- Favicon: `assets/img/favicon.svg` (modern browsers) with `favicon-512.png` / `apple-touch-icon.png` as fallbacks — a "DS" monogram with the same status-dot accent as the nav logo.
- Every page now has Open Graph + Twitter Card tags so links preview properly on LinkedIn, Slack, iMessage, etc. They currently point at `https://www.danshaw.dev/...` — **update the domain in the `og:url`/`og:image` tags once you know your real domain**, otherwise the preview image won't load.
- `assets/img/og-image.png` is the 1200×630 share image used everywhere. Regenerate it (or swap in your own design/photo) any time — it's a plain static PNG.
- `post.html` updates its own title/description via JS for anyone browsing in a real browser, but most link-preview bots (LinkedIn especially) don't execute JavaScript, so shared post links will currently show the generic site preview rather than that post's own title/excerpt. Fixing that properly needs server-side rendering or a prerender step — flag it if that starts to matter and it's a contained follow-up, not a rebuild.

## The signature element — plotter-bot

Instead of the ASCII-particle effect (that one's a bit of a template move at this point — it's on a few portfolio sites already), the homepage has a small canvas animation: a robot moves at constant speed along a single-stroke path, drawing a trail that spells out "DAN SHAW," lifting its pen between letters like a real plotter, then pausing, fading, and looping.

- Lives in `js/robot-trail.js`, rendered inside `.signature-strip` on `index.html` only.
- Respects `prefers-reduced-motion` — it draws the finished, static trail with no animation for anyone with that OS setting on.
- To change the wording it plots, edit the `WORD` constant near the top of `js/robot-trail.js`. Only `D A N S H A W` and space have letterforms defined right now — extend the `LETTERS` object if you want other letters later.

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
