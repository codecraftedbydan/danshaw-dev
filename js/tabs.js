document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.getElementById('exp-tabs');
  if (!tabs) return;
  const buttons = tabs.querySelectorAll('.exp-tab-btn');
  const panels = tabs.querySelectorAll('.exp-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      buttons.forEach(b => b.classList.toggle('active', b === btn));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === target));
    });
  });
});
