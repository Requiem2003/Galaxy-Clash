// File: Game/plugins/gc-players-overlap-fix.js
// Safe fix: if the "Budget/Spent/Left" pills overlap "Player X", push them down.
// Does not move DOM nodes; only sets inline styles when an actual overlap is detected.

(function () {
  function isVisible(el){
    if(!el) return false;
    const s = getComputedStyle(el);
    return s.display!=='none' && s.visibility!=='hidden' && el.offsetParent!==null;
  }

  // Find the closest ancestor that likely represents one "player row"
  function findPlayerRow(el){
    let n = el, hops = 0;
    while (n && hops < 6) {
      if ((n.textContent||'').match(/\bPlayer\s*\d+/i)) return n;
      n = n.parentElement; hops++;
    }
    return null;
  }

  function findHeaderInRow(row){
    // Find the element that actually renders "Player X"
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_ELEMENT, null);
    let best = null;
    while (walker.nextNode()){
      const el = walker.currentNode;
      if (!isVisible(el)) continue;
      const t = (el.textContent||'').trim();
      if (/^Player\s*\d+$/i.test(t) || /^Player\s*\d+(\s*·.*)?$/i.test(t)) { best = el; break; }
    }
    // Fallback: the row itself
    return best || row;
  }

  function isChip(el){
    const t = (el.textContent||'').trim();
    return /^(Budget|Spent|Left)\b/i.test(t);
  }

  function chipsInRow(row){
    const chips = [];
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_ELEMENT, null);
    while (walker.nextNode()){
      const el = walker.currentNode;
      if (!isVisible(el)) continue;
      if (isChip(el)) chips.push(el);
    }
    return chips;
  }

  function rect(el){
    try { return el.getBoundingClientRect(); } catch { return {top:0,bottom:0}; }
  }

  function fixOneRow(row){
    const header = findHeaderInRow(row);
    const pills  = chipsInRow(row);
    if (!header || !pills.length) return;

    const hb = rect(header);
    // find the first pill that visually sits closest under the header
    pills.sort((a,b) => rect(a).top - rect(b).top);
    const first = pills[0];
    const pb = rect(first);

    // If the first pill’s top is above the header’s bottom, they overlap
    const overlap = pb.top < hb.bottom - 2;

    if (overlap) {
      // If the pill is absolutely positioned, neutralize it only for this case
      const cs = getComputedStyle(first);
      if (cs.position === 'absolute' || cs.position === 'fixed') {
        first.style.position = 'static';
        first.style.transform = 'none';
      }
      // Push it down just enough so it clears the header + small cushion
      const delta = Math.max(8, Math.ceil(hb.bottom - pb.top + 8));
      // Add margin on the *container* line if possible; else on the pill
      const line = first.parentElement || first;
      // Keep it inline but allow starting on a new visual line
      line.style.display = (getComputedStyle(line).display === 'inline') ? 'inline-block' : getComputedStyle(line).display;
      line.style.marginTop = delta + 'px';
    }
  }

  function run(){
    // Find rows that contain both "Player <n>" and at least one chip word
    const candidates = Array.from(document.querySelectorAll('*'))
      .filter(el => /\bPlayer\s*\d+/.test(el.textContent||'') && /\b(Budget|Spent|Left)\b/.test(el.textContent||''));
    // Deduplicate by walking up to the row container
    const rows = new Set(candidates.map(findPlayerRow).filter(Boolean));
    rows.forEach(fixOneRow);
  }

  function start(){
    run();
    const mo = new MutationObserver(() => run());
    mo.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('resize', run);
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
})();
