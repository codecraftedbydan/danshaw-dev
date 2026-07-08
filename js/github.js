const GITHUB_USERNAME = 'codecraftedbydan';

/* Fallback in case the GitHub API is rate-limited or unreachable —
   keep this in sync roughly with reality; it's a safety net, not
   the source of truth. Live data always overrides this on load. */
const FALLBACK_PROJECTS = [
  {
    name: 'public-safety-agent',
    description: 'An agentic system that monitors, retrieves, and synthesises publicly available public-safety intelligence across the US and UK — delivering structured, queryable intelligence briefings on demand.',
    language: 'Python',
    html_url: `https://github.com/${GITHUB_USERNAME}/public-safety-agent`,
    topics: ['agents', 'langgraph', 'chromadb']
  },
  {
    name: 'pytorch-food-classifier',
    description: 'EfficientNet-B2 image classifier fine-tuned on Food-101 (101 classes, 101k images) with two-stage transfer learning and Grad-CAM interpretability visualisations. Built from scratch in PyTorch.',
    language: 'Python',
    html_url: `https://github.com/${GITHUB_USERNAME}/pytorch-food-classifier`,
    topics: ['pytorch', 'computer-vision']
  },
  {
    name: 'intent-classifier',
    description: 'PyTorch fine-tuning pipeline for intent classification using DistilBERT and BANKING77 — the same pattern used to replace keyword-based routing in a production support platform.',
    language: 'Python',
    html_url: `https://github.com/${GITHUB_USERNAME}/intent-classifier`,
    topics: ['distilbert', 'nlp', 'pytorch', 'transformers']
  },
  {
    name: 'EagleBankAPI',
    description: 'A REST API for a fictional bank built on .NET, implementing user management, account operations, and transaction handling with JWT authentication and Clean Architecture.',
    language: 'C#',
    html_url: `https://github.com/${GITHUB_USERNAME}/EagleBankAPI`,
    topics: ['dotnet', 'clean-architecture']
  },
  {
    name: 'web-scraper',
    description: 'A concurrent web scraper written in Go that fetches JSON data from multiple sources in parallel and persists results to Cassandra.',
    language: 'Go',
    html_url: `https://github.com/${GITHUB_USERNAME}/web-scraper`,
    topics: ['go', 'concurrency']
  },
  {
    name: 'healthy-url',
    description: 'A concurrent URL health-checker that polls endpoints in parallel and stores results in Cassandra for uptime analysis.',
    language: 'Go',
    html_url: `https://github.com/${GITHUB_USERNAME}/healthy-url`,
    topics: ['go', 'monitoring']
  }
];

async function loadProjects() {
  const grid = document.getElementById('proj-grid');
  if (!grid) return;

  let repos = null;
  try {
    const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`, {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (res.ok) {
      const data = await res.json();
      repos = data.filter(r => !r.fork).sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    }
  } catch (e) {
    repos = null;
  }

  const list = (repos && repos.length) ? repos : FALLBACK_PROJECTS;
  grid.innerHTML = list.map(renderCard).join('');
}

function renderCard(repo) {
  const desc = repo.description || 'No description yet.';
  const lang = repo.language || '—';
  const topics = (repo.topics || []).slice(0, 3);
  return `
    <a class="proj-card" href="${repo.html_url}" target="_blank" rel="noopener">
      <div class="proj-top">
        <h3>${repo.name}</h3>
        <span class="proj-lang mono">${lang}</span>
      </div>
      <p>${desc}</p>
      ${topics.length ? `<div class="proj-meta">${topics.map(t => `<span class="mono">#${t}</span>`).join('')}</div>` : ''}
      <span class="proj-link">View repository <span class="arrow">→</span></span>
    </a>`;
}

document.addEventListener('DOMContentLoaded', loadProjects);
