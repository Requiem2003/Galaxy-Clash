// File: Game/plugins/gc-players-layout-style.js
// Safe: only adds CSS + tiny class tags; DOES NOT move or remove nodes.
(function(){
  const CSS = `
/* Defuse any absolute/transform on the Budget/Spent/Left pills */
.gc-chip { position: static !important; transform: none !important; }

/* Put the first chip on a new line under the player header */
.gc-chip-first { display: block !important; margin-top: .35rem; }

/* Make all chips line up nicely */
.gc-chip, .gc-chip + .gc-chip {
  display: inline-flex !important;
  align-items: center;
  gap: .25rem;
  margin-right: .4rem;
  white-space: nowrap;
}
`;
  function injectCSS(){
    if(document.getElementById('gc-players-style')) return;
    const s = document.createElement('style');
    s.id = 'gc-players-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Mark “Budget / Spent / Left” elements as chips, but don't move them.
  function tagChips(){
    const all = document.querySelectorAll('*');
    for(const el of all){
      const t = (el.textContent || '').trim();
      if (!t) continue;
      if (/^(Budget|Spent|Left)\b/i.test(t)) el.classList.add('gc-chip');
    }
    // For each player block, ensure first chip forces a new line
    const containers = new Set();
    document.querySelectorAll('.gc-chip').forEach(ch => containers.add(ch.parentElement));
    containers.forEach(parent => {
      const chips = Array.from(parent.querySelectorAll('.gc-chip'));
      chips.forEach(c => c.classList.remove('gc-chip-first'));
      if (chips.length) chips[0].classList.add('gc-chip-first');
    });
  }

  function start(){
    injectCSS();
    tagChips();
    const mo = new MutationObserver(tagChips);
    mo.observe(document.body, { childList:true, subtree:true });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
})();
