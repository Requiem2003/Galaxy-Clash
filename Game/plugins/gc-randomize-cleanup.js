// File: Game/plugins/gc-randomize-hide.js
// Hides per-player "Randomize" buttons; keeps "Randomize Current Team".
(function () {
  function hidePerPlayerRandomize(){
    const nodes = document.querySelectorAll('button, [role="button"]');

    const norm = el => (el.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
    const isGlobal = el => /randomize current team/i.test((el.textContent||''));

    for (const el of nodes){
      const t = norm(el);
      const a = (el.getAttribute('aria-label')||'').toLowerCase();
      const title = (el.getAttribute('title')||'').toLowerCase();

      const mentionsRand = /randomize/.test(t) || /randomize/.test(a) || /randomize/.test(title);
      if (!mentionsRand) continue;
      if (isGlobal(el)) continue; // keep the global one

      // Consider it "per-player" if any ancestor mentions "Player 1/2/3..."
      let inPlayer = false, n = el, hops = 0;
      while (n && hops < 4){ // stay close; don't bubble to whole panel
        const txt = (n.textContent || '');
        if (/\bPlayer\s*\d+/i.test(txt)) { inPlayer = true; break; }
        n = n.parentElement; hops++;
      }
      if (inPlayer){
        el.style.display = 'none';   // hide (do not remove)
      }
    }
  }

  function start(){
    hidePerPlayerRandomize();
    const mo = new MutationObserver(hidePerPlayerRandomize);
    mo.observe(document.body, { childList:true, subtree:true });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
})();
