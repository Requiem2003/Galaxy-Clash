// File: Game/plugins/gc-players-layout-fix.js
// Moves "Budget / Spent / Left" chips onto their own line under each Player row
// and prevents overlap with the player header. Works even if the UI renders later.

(function () {
  const CSS = `
/* Put player rows in a vertical stack with spacing */
.gc-fix-player-row{ display:flex; flex-direction:column; gap:.5rem; }

/* A dedicated line for the chips */
.gc-fix-player-metrics{ display:flex; flex-wrap:wrap; gap:.4rem; }

/* Make sure pills aren't absolutely positioned or transformed */
.gc-fix-chip{ position:static !important; transform:none !important; }

/* Optional: ensure the row’s header doesn't collide with metrics */
.gc-fix-player-row .gc-fix-player-top{ display:flex; justify-content:space-between; align-items:center; }
`;
  function injectCSS(){
    if (document.getElementById('gc-players-fix-style')) return;
    const s = document.createElement('style');
    s.id = 'gc-players-fix-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Heuristics to find "chip" nodes (works with your current UI text)
  function isChip(el){
    const t = (el.textContent || '').trim();
    return /^(Budget|Spent|Left)\b/i.test(t);
  }

  // Find a playable "player row" container that holds those chips
  function findPlayerRows(){
    // Look for any element that contains BOTH "Player" and at least one chip
    const candidates = Array.from(document.querySelectorAll('*'));
    const rows = new Set();
    for (const el of candidates){
      const txt = (el.textContent || '');
      if (!/Player\s*\d+/i.test(txt)) continue;
      // Does it have Budget/Spent/Left somewhere inside?
      if (txt.match(/\b(Budget|Spent|Left)\b/i)) rows.add(el);
    }
    return Array.from(rows);
  }

  function normalizeRow(row){
    if (!row || row.classList.contains('gc-fix-player-row')) return;
    row.classList.add('gc-fix-player-row');

    // Collect chips found anywhere inside this row
    const chips = Array.from(row.querySelectorAll('*')).filter(isChip);
    if (!chips.length) return;

    // Create a top wrapper (optional) if you need future tweaks
    if (!row.querySelector('.gc-fix-player-top')){
      const top = document.createElement('div');
      top.className = 'gc-fix-player-top';
      // Move the first child (usually the header) into "top"
      while (row.firstElementChild && !/Budget|Spent|Left/i.test(row.firstElementChild.textContent||'')){
        top.appendChild(row.firstElementChild);
      }
      row.insertBefore(top, row.firstChild);
    }

    // Ensure a metrics line exists
    let metrics = row.querySelector('.gc-fix-player-metrics');
    if (!metrics){
      metrics = document.createElement('div');
      metrics.className = 'gc-fix-player-metrics';
      row.appendChild(metrics);
    }

    // Move all chip nodes into the metrics line and defuse absolute positioning
    chips.forEach(ch => {
      ch.classList.add('gc-fix-chip');
      if (ch.parentElement !== metrics) metrics.appendChild(ch);
    });
  }

  function applyFix(){
    injectCSS();
    const rows = findPlayerRows();
    rows.forEach(normalizeRow);
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyFix();
    // Keep fixing if UI changes (adding players, randomize, etc.)
    const mo = new MutationObserver(applyFix);
    mo.observe(document.body, { childList:true, subtree:true });
  });
})();
