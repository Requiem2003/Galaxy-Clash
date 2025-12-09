// File: Game/plugins/gc-battle-dropdown.js
// Wraps the existing "Start Battle" button with a split-button + dropdown for cinematic modes.

(function(){
  const CSS = `
.gc-battle-split{display:inline-flex;position:relative;gap:4px;vertical-align:middle}
.gc-battle-caret{padding:.45rem .55rem;border-radius:.5rem;border:0;cursor:pointer;font-weight:600}
.gc-battle-caret:after{content:"▾";display:inline-block;margin-left:2px}
.gc-battle-menu{position:absolute;top:100%;right:0;min-width:240px;background:#0b0c10;color:#e9eef3;border-radius:10px;box-shadow:0 18px 48px rgba(0,0,0,.4);padding:6px;display:none;z-index:99999}
.gc-battle-menu.open{display:block}
.gc-battle-item{padding:.5rem .6rem;border-radius:.4rem;cursor:pointer;user-select:none}
.gc-battle-item:hover{background:#151820}
.gc-battle-sep{height:1px;background:#1f232b;margin:.35rem .2rem}
  `;
  function injectCSS(){
    if(document.getElementById('gc-battle-dd-style')) return;
    const s=document.createElement('style'); s.id='gc-battle-dd-style'; s.textContent=CSS; document.head.appendChild(s);
  }

  function findStartButton(){
    const selectors = [
      'button[id*="start" i]',
      'button[id*="battle" i]',
      '.start-battle',
      '[data-action="start-battle"]',
      '#battleStart', '#btnStartBattle'
    ];
    for(const sel of selectors){
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // text-based fallback
    for (const el of document.querySelectorAll('button, [role="button"]')) {
      const t = (el.textContent||'').trim();
      if (/^(start|begin)\b.*battle/i.test(t)) return el;
    }
    return null;
  }

  function wrapStart(btn){
    // If already wrapped, return its container
    if(btn && btn.parentElement && btn.parentElement.classList.contains('gc-battle-split')){
      return btn.parentElement;
    }
    const wrap = document.createElement('span');
    wrap.className = 'gc-battle-split';
    btn.parentElement.insertBefore(wrap, btn);
    wrap.appendChild(btn);
    return wrap;
  }

  function buildMenu(anchor, wrap){
    const caret = document.createElement('button');
    caret.className = 'gc-battle-caret';
    caret.type = 'button';
    caret.title = 'More battle options';

    const menu = document.createElement('div');
    menu.className = 'gc-battle-menu';

    // Items
    const mkItem = (label, fn, visible=true) => {
      const it = document.createElement('div');
      it.className = 'gc-battle-item';
      it.textContent = label;
      if(!visible){ it.style.display='none'; }
      it.onclick = () => { closeMenu(); fn && fn(); };
      return it;
    };

    const runStandard = mkItem('Run Standard Battle', () => anchor.click(), true);
    const cineBrowser = mkItem('Cinematic (Browser)', () => {
      if (window.gcRunCinematic) window.gcRunCinematic();
      else alert('Browser Cinematic plugin not loaded.');
    }, true);
    const cinePython = mkItem('Cinematic (Python)', () => {
      if (window.gcRunCinematicRemote) window.gcRunCinematicRemote();
      else alert('Python Cinematic plugin not loaded.');
    }, !!window.gcRunCinematicRemote);
    const cineLocal = mkItem('Cinematic (Local Report)', () => {
      if (window.gcShowLocalReport) window.gcShowLocalReport();
      else alert('Local Report plugin not loaded.');
    }, !!window.gcShowLocalReport);

    menu.appendChild(runStandard);
    menu.appendChild(document.createElement('div')).className = 'gc-battle-sep';
    menu.appendChild(cineBrowser);
    menu.appendChild(cinePython);
    menu.appendChild(cineLocal);

    wrap.appendChild(caret);
    wrap.appendChild(menu);

    function toggleMenu(){ menu.classList.toggle('open'); }
    function closeMenu(){ menu.classList.remove('open'); }
    caret.addEventListener('click', (e)=>{ e.stopPropagation(); toggleMenu(); });
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMenu(); });

    // Remove old floating/inlined cinematic buttons if present
    const oldIds = ['gc-cineb-btn','gc-ai-btn','gc-cine-btn'];
    oldIds.forEach(id => { const el = document.getElementById(id); if(el) el.remove(); });

    return { caret, menu };
  }

  function mount(){
    const start = findStartButton();
    if(!start) return false;
    const wrap = wrapStart(start);
    buildMenu(start, wrap);
    return true;
  }

  function startWhenReady(){
    if(mount()) return;
    const mo = new MutationObserver(() => { if(mount()) mo.disconnect(); });
    mo.observe(document.body, { childList:true, subtree:true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectCSS();
    startWhenReady();
  });
})();
