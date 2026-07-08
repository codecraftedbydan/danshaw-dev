async function initBlogList() {
  await seedPostsIfEmpty();
  const posts = getPublishedPosts();
  const el = document.getElementById('post-list');
  if (!el) return;

  if (!posts.length) {
    el.innerHTML = `<div class="empty-state mono">No posts published yet. First one's coming — check back soon.</div>`;
    return;
  }

  el.innerHTML = posts.map(p => `
    <a class="post-row" href="post.html?slug=${encodeURIComponent(p.slug)}">
      <span class="p-date mono">${formatDate(p.date)}</span>
      <div>
        <h3>${p.title}</h3>
        <p>${p.excerpt || ''}</p>
        ${p.tags && p.tags.length ? `<div class="post-tags">${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
      </div>
      <span class="p-arrow">→</span>
    </a>
  `).join('');
}

document.addEventListener('DOMContentLoaded', initBlogList);
