/* ============================================================
   POST STORE
   Posts live in localStorage (key: dan_blog_posts_v1) so the
   admin page can create/edit/delete them from this browser.
   On first visit, we seed from data/posts.json.

   IMPORTANT LIMITATION (see admin.html notice + README):
   localStorage is per-browser, per-device. Edits made in the
   admin panel only exist in that browser until you export and
   commit posts.json back into the repo. This is the honest
   trade-off of a zero-backend static site — see README.md for
   the upgrade path if you want true multi-device publishing.
   ============================================================ */

const POSTS_KEY = 'dan_blog_posts_v1';

async function seedPostsIfEmpty() {
  const existing = localStorage.getItem(POSTS_KEY);
  if (existing) return;
  try {
    const res = await fetch('data/posts.json', { cache: 'no-store' });
    const seed = await res.json();
    localStorage.setItem(POSTS_KEY, JSON.stringify(seed));
  } catch (e) {
    localStorage.setItem(POSTS_KEY, JSON.stringify([]));
  }
}

function getPosts() {
  try {
    return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function getPublishedPosts() {
  return getPosts()
    .filter(p => p.status === 'published')
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getPostBySlug(slug) {
  return getPosts().find(p => p.slug === slug);
}

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* Minimal markdown -> HTML. Supports: #/##/### headers, bold, italic,
   links, inline code, fenced code blocks, unordered/ordered lists,
   blockquotes, paragraphs. Deliberately small — enough for technical posts. */
function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let inCode = false, codeBuf = [];
  let listBuf = [], listType = null;

  function flushList() {
    if (listBuf.length) {
      html += `<${listType}>${listBuf.map(li => `<li>${inline(li)}</li>`).join('')}</${listType}>`;
      listBuf = [];
      listType = null;
    }
  }

  function inline(text) {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  for (const raw of lines) {
    const line = raw;
    if (line.trim().startsWith('```')) {
      if (!inCode) { inCode = true; codeBuf = []; }
      else { html += `<pre><code>${codeBuf.join('\n').replace(/</g,'&lt;')}</code></pre>`; inCode = false; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    if (/^###\s+/.test(line)) { flushList(); html += `<h3>${inline(line.replace(/^###\s+/,''))}</h3>`; continue; }
    if (/^##\s+/.test(line)) { flushList(); html += `<h2>${inline(line.replace(/^##\s+/,''))}</h2>`; continue; }
    if (/^#\s+/.test(line)) { flushList(); html += `<h2>${inline(line.replace(/^#\s+/,''))}</h2>`; continue; }
    if (/^>\s?/.test(line)) { flushList(); html += `<blockquote>${inline(line.replace(/^>\s?/,''))}</blockquote>`; continue; }
    if (/^[-*]\s+/.test(line)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listBuf.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listBuf.push(line.replace(/^\d+\.\s+/, ''));
      continue;
    }
    flushList();
    if (line.trim() === '') { continue; }
    html += `<p>${inline(line)}</p>`;
  }
  flushList();
  return html;
}
