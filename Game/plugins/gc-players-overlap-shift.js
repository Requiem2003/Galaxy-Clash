// File: Game/plugins/gc-players-overlap-shift.js
// No DOM moves. If "Budget/Spent/Left" overlaps "Player X", translate the pills down.

(function () {
  const PAD = 8; // pixels of breathing room under the header

  function isVisible(el){
    if(!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null;
  }

  function isChip(el){
    const t = (el.textContent || '').trim();
    return /^(Budget|Spent|Left)\b/i.test(t);
  }

  // find a logical container that contains both "Player N" and chips
  function findPlayerRows(){
    const all = Array.from(document.querySelectorAll('*'));
    const rows = new Set();
    for(const el of all){
      const txt = (el.textContent || '');
      if (!/\bPlayer\s*\d+/.test(txt)) continue;
      if (!/\b(Budget|Spent|Left)\b/.test(txt)) continue;
      rows.add(el);
    }
    return Array.from(rows);
  }

  function findHeader(row){
    // best guess: the element that literally renders "Player N"
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_ELEMENT, null);
    while (walker.nextNode()){
      const el = walker.currentNode;
      if (!isVisible(el)) continue;
      const t = (el.textContent || '').trim();
      if (/^Player\s*\d+$/i.test(t) || /^Player\s*\d+\s*$/i.test(t)) return el;
    }
    // fallback: first child with "Player"
    const el = Array.from(row.querySelectorAll('*')).find(n => /^Player\s*\d+/i.test((n.textContent||'').trim()));
    return el || row;
  }

  function rect(el){
    try{ return el.getBoundingClientRect(); } catch { return {top:0,bottom:0}; }
  }

  function clearShifts(row){
    row.querySelectorAll('.gc-chip-shift').forEach(el=>{
      el.style.transform = ''; // remove previous translate
      el.style.willChange = '';
      el.classList.remove('gc-chip-shift');
    });
  }

  function fixRow(row){
    if(!isVisible(row)) return;
    const header = findHeader(row);
    if(!header) return;

    // collect all pills in this row
    const pills = [];
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_ELEMENT, null);
    while (walker.nextNode()){
      const el = walker.currentNode;
      if (!isVisible(el)) continue;
      if (isChip(el)) pills.push(el);
    }
    if(!pills.length) return;

    // reset old shifts so measurements are clean
    clearShifts(row);

    const hb = rect(header);
    const baselineY = hb.bottom + PAD;

    // if none are overlapping, nothing to do
    const anyOverlap = pills.some(p => rect(p).top < baselineY - 2);
    if(!anyOverlap) return;

    // shift each pill down so it clears the header; stagger slightly to preserve spacing
    pills.forEach((p, i) => {
      const pb = rect(p);
      const dy = Math.max(0, Math.ceil(baselineY - pb.top + i * 2));
      if (dy > 0) {
        p.style.willChange = 'transform';
        p.style.transform = `translateY(${dy}px)`;
        p.classList.add('gc-chip-shift');
      }
    });
  }

  function run(){
    findPlayerRows().forEach(fixRow);
  }

  function start(){
    run();
    const mo = new MutationObserver(run);
    mo.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('resize', run);
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
})();
