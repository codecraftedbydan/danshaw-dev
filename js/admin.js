/* ============================================================
   ADMIN PANEL
   Set your own password below before you deploy. This is a
   client-side check only — fine for keeping casual visitors
   out of an editor UI, but anyone who views source can read it.
   Don't use it to protect anything truly sensitive. See the
   README for how to add real auth later if you want it.
   ============================================================ */

const ADMIN_PASSWORD = 'AIcouldguessthis!'; 
const SESSION_KEY = 'dan_admin_unlocked';

let editingSlug = null;

document.addEventListener('DOMContentLoaded', async () => {
  await seedPostsIfEmpty();

  const gate = document.getElementById('admin-gate');
  const panel = document.getElementById('admin-panel');
  const form = document.getElementById('gate-form');
  const input = document.getElementById('gate-password');
  const error = document.getElementById('gate-error');

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, '1');
    gate.style.display = 'none';
    panel.style.display = 'block';
    renderPostList();
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') unlock();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value === ADMIN_PASSWORD) {
      unlock();
    } else {
      error.textContent = 'Incorrect password.';
      input.value = '';
    }
  });

  document.getElementById('new-post-btn').addEventListener('click', () => openEditor(null));
  document.getElementById('editor-cancel').addEventListener('click', closeEditor);
  document.getElementById('editor-form').addEventListener('submit', handleSave);
  document.getElementById('export-btn').addEventListener('click', exportPosts);
  document.getElementById('import-input').addEventListener('change', importPosts);
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  });
});

function renderPostList() {
  const posts = getPosts().sort((a, b) => new Date(b.date) - new Date(a.date));
  const el = document.getElementById('post-mgmt-list');
  if (!posts.length) {
    el.innerHTML = `<div class="empty-state mono">No posts yet. Click "New post" to write your first one.</div>`;
    return;
  }
  el.innerHTML = posts.map(p => `
    <div class="post-mgmt-row">
      <div>
        <strong>${p.title}</strong>
        <div class="mono" style="color:var(--grey-2); font-size:11.5px; margin-top:4px;">
          ${formatDate(p.date)} · ${p.status.toUpperCase()}
        </div>
      </div>
      <div class="pm-actions">
        <button class="pm-btn" data-edit="${p.slug}">Edit</button>
        <button class="pm-btn danger" data-delete="${p.slug}">Delete</button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
    openEditor(getPostBySlug(btn.dataset.edit));
  }));
  el.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Delete this post? This can\'t be undone.')) {
      const posts = getPosts().filter(p => p.slug !== btn.dataset.delete);
      savePosts(posts);
      renderPostList();
    }
  }));
}

function openEditor(post) {
  editingSlug = post ? post.slug : null;
  document.getElementById('editor-title').textContent = post ? 'Edit post' : 'New post';
  document.getElementById('f-title').value = post ? post.title : '';
  document.getElementById('f-excerpt').value = post ? post.excerpt : '';
  document.getElementById('f-tags').value = post ? (post.tags || []).join(', ') : '';
  document.getElementById('f-status').value = post ? post.status : 'draft';
  document.getElementById('f-date').value = post ? post.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  document.getElementById('f-body').value = post ? post.body : '';
  document.getElementById('editor-modal').style.display = 'flex';
}

function closeEditor() {
  document.getElementById('editor-modal').style.display = 'none';
}

function handleSave(e) {
  e.preventDefault();
  const title = document.getElementById('f-title').value.trim();
  if (!title) return;

  const posts = getPosts();
  const slug = editingSlug || slugify(title);
  const newPost = {
    slug,
    title,
    excerpt: document.getElementById('f-excerpt').value.trim(),
    tags: document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    status: document.getElementById('f-status').value,
    date: document.getElementById('f-date').value,
    body: document.getElementById('f-body').value
  };

  const idx = posts.findIndex(p => p.slug === (editingSlug || slug));
  if (idx >= 0) posts[idx] = newPost;
  else posts.push(newPost);

  savePosts(posts);
  closeEditor();
  renderPostList();
}

function exportPosts() {
  const posts = getPosts();
  const blob = new Blob([JSON.stringify(posts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'posts.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importPosts(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const posts = JSON.parse(reader.result);
      savePosts(posts);
      renderPostList();
      alert('Posts imported into this browser.');
    } catch (err) {
      alert('Could not parse that file — make sure it\'s a valid posts.json export.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
