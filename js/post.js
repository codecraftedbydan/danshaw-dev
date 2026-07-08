async function initPost() {
  await seedPostsIfEmpty();
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const post = slug ? getPostBySlug(slug) : null;
  const container = document.getElementById('post-root');
  if (!container) return;

  if (!post || post.status !== 'published') {
    container.innerHTML = `
      <div class="post-hero wrap">
        <h1>Post not found</h1>
        <p class="lede" style="color:var(--grey-1); margin-top:16px;">This one might still be a draft, or the link's out of date.</p>
        <a href="blog.html" class="btn" style="margin-top:30px; display:inline-flex;">← Back to writing</a>
      </div>`;
    document.title = 'Not found — Dan Shaw';
    return;
  }

  document.title = `${post.title} — Dan Shaw`;
  const desc = post.excerpt || post.title;
  const setMeta = (id, val) => { const el = document.getElementById(id); if (el) el.setAttribute('content', val); };
  setMeta('og-title', `${post.title} — Dan Shaw`);
  setMeta('og-desc', desc);
  setMeta('tw-title', `${post.title} — Dan Shaw`);
  setMeta('tw-desc', desc);

  container.innerHTML = `
    <div class="post-hero wrap">
      <div class="p-date mono">${formatDate(post.date)}</div>
      <h1>${post.title}</h1>
      ${post.tags && post.tags.length ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    </div>
    <div class="post-body wrap">
      ${renderMarkdown(post.body || '')}
      <a href="blog.html" class="btn" style="margin-top:40px; display:inline-flex;">← Back to writing</a>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', initPost);
