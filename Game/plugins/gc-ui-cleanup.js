// File: Game/plugins/gc-ui-cleanup.js
// Single, safe pass that:
// - Hides Python cinematic & legacy floating buttons
// - Hides the old "Run Battle" button
// - Ensures there's ONE button: "Begin Battle" that triggers the Browser cinematic
// - Collapses the big empty spacer in the Setup panel
// - Tightens the top hero spacing

(function () {
  const CSS = `
/* Hide any legacy cinematic buttons that were injected earlier */
#gc-ai-btn, #gc-cine-btn, #gc-cineb-btn { display:none !important; }

/* Make our final button look primary and full-width */
.gc-begin-battle {
  width:100%;
  padding:.65rem .85rem;
  border:0; border-radius:.65rem;
  font-weight:800; cursor:pointer;
  background:#2aa3ff; color:#061019;
  box-shadow:0 4px 10px rgba(0,0,0,.2);
}

/* Nudge the setup header area tighter */
.gc-tight-top { margin-top: 6px !important; padding-top: 6px !important; }

/* Just in case a spacer div is eating vertical space */
.gc-kill-spacer { display:none !important; height:0 !important; padding:0 !important; margin:0 !important; }
  `;

  function css(){
    if (document.getElementById('gc-ui-cleanup-style')) return;
    const s = document.createElement('style');
    s.id = 'gc-ui-cleanup-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function text(el){ return (el.textContent || '').replace(/\s+/g,' ').trim().toLowerCase(); }

  function hidePythonCinematic(){
    // By id (from earlier snippet) or by label text
    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter(el => /cinematic\s*\(python\)/i.test(el.textContent||'') || el.id === 'gc-ai-btn');
    candidates.forEach(el => el.style.display = 'none');
  }

  function findRunBattle(){
    // Exact text first (matches your UI)
    for (const el of document.querySelectorAll('button, [role="button"]')) {
      if (text(el) === 'run battle') return el;
    }
    // common fallbacks
    return document.querySelector('#battleStart, #btnStartBattle, .start-battle, [data-action="start-battle"]');
  }

  function findSetupColumn(){
    // Heuristics: nearest container that has "Setup" + the budget slider label
    let setup = null;
    const all = document.querySelectorAll('section, aside, div, main');
    for (const el of all) {
      const t = text(el);
      if (t.includes('setup') && (t.includes('default budget') || t.includes('budget'))) { setup = el; break; }
    }
    // fallback: left column
    return setup || document.querySelector('.setup, #setup') || document.body;
  }

  function ensureBeginBattle(){
    const runBtn = findRunBattle();
    if (runBtn) {
      // Hide the original "Run Battle" button
      runBtn.style.display = 'none';
    }

    // If a Begin Battle already exists, done.
    if (document.getElementById('gc-begin-battle')) return;

    // Create our single action button that calls Browser Cinematic
    const begin = document.createElement('button');
    begin.id = 'gc-begin-battle';
    begin.className = 'gc-begin-battle';
    begin.textContent = 'Begin Battle';
    begin.onclick = () => {
      if (window.gcRunCinematic) window.gcRunCinematic();
      else alert('Browser Cinematic plugin not loaded.');
    };

    // Place it where Run Battle lived, or at top of controls in Setup
    if (runBtn && runBtn.parentElement) {
      runBtn.insertAdjacentElement('afterend', begin);
    } else {
      const setup = findSetupColumn();
      // place near the budget slider or first button area
      const anchor = Array.from(setup.querySelectorAll('button, input, .slider, .range, .controls'))[0] || setup.firstElementChild;
      (anchor && anchor.parentElement ? anchor.parentElement : setup).insertBefore(begin, anchor ? anchor.nextSibling : null);
    }
  }

  function collapseSetupSpacer(){
    const setup = findSetupColumn();
    if (!setup) return;

    // Find a very tall empty element near the top and kill it
    // (Your screenshot shows a big blank area above the slider.)
    let cursor = setup.firstElementChild;
    let attempts = 0;
    while (cursor && attempts < 6) {
      const txt = text(cursor);
      const rect = cursor.getBoundingClientRect();
      const isHuge = rect.height > 140;
      const looksEmpty = txt.length < 4 && cursor.querySelectorAll('button,input,select,textarea').length === 0;
      if (isHuge && looksEmpty) {
        cursor.classList.add('gc-kill-spacer');
        break;
      }
      cursor = cursor.nextElementSibling;
      attempts++;
    }

    // Make the immediate header tighter (if present)
    const h = Array.from(setup.querySelectorAll('h1,h2,h3,header')).find(n => /setup/i.test(n.textContent||''));
    if (h && h.parentElement) {
      h.parentElement.classList.add('gc-tight-top');
    }
  }

  function tightenTopHero(){
    // Reduce empty space around the big STAR WARS banner and top controls
    // Try to find a very tall hero container near the top of the page
    const top = document.body;
    const candidates = Array.from(top.children);
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      const isHero = rect.height > 180 && (/(star|wars|galaxy clash)/i.test(el.textContent||'') || el.querySelector('img, svg'));
      if (isHero) {
        // Remove excess bottom margin/padding
        el.style.marginBottom = '8px';
        el.style.paddingBottom = '0px';
        break;
      }
    }
  }

  function run(){
    css();
    hidePythonCinematic();
    ensureBeginBattle();
    collapseSetupSpacer();
    tightenTopHero();
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
