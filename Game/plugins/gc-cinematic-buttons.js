// File: Game/plugins/gc-cinematic-buttons.js
// SAFEST: Only adds buttons after the "Run Battle" button. Touches nothing else.

(function () {
  const CSS = `
#gc-cine-stack{display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem}
.gc-cine-btn{width:100%;padding:.6rem .8rem;border:0;border-radius:.65rem;font-weight:700;cursor:pointer}
.gc-cine-btn.ghost{background:#111826;color:#e9eef3}
#gc-cineb-btn,#gc-ai-btn,#gc-cine-btn{display:none!important} /* hide legacy floating buttons */
`;
  function css(){ if(!document.getElementById('gc-cine-stack-style')){
    const s=document.createElement('style'); s.id='gc-cine-stack-style'; s.textContent=CSS; document.head.appendChild(s);
  }}

  function findRunBattle(){
    // Try exact text first (matches your screenshot)
    for (const el of document.querySelectorAll('button, [role="button"]')) {
      const t=(el.textContent||'').trim().toLowerCase();
      if (t==='run battle') return el;
    }
    // Common fallbacks
    return document.querySelector('#battleStart, #btnStartBattle, .start-battle, [data-action="start-battle"]');
  }

  function attach(){
    if(document.getElementById('gc-cine-stack')) return true;
    const anchor = findRunBattle();
    if(!anchor || !anchor.parentElement) return false;

    const stack = document.createElement('div');
    stack.id='gc-cine-stack';

    const bBrowser = document.createElement('button');
    bBrowser.className='gc-cine-btn ghost';
    bBrowser.textContent='Cinematic (Browser)';
    bBrowser.onclick = () => {
      if (window.gcRunCinematic) window.gcRunCinematic();
      else alert('Browser Cinematic plugin not loaded.');
    };
    stack.appendChild(bBrowser);

    if (window.gcRunCinematicRemote) {
      const bPy=document.createElement('button');
      bPy.className='gc-cine-btn ghost';
      bPy.textContent='Cinematic (Python)';
      bPy.onclick=()=>window.gcRunCinematicRemote();
      stack.appendChild(bPy);
    }

    if (window.gcShowLocalReport) {
      const bLocal=document.createElement('button');
      bLocal.className='gc-cine-btn ghost';
      bLocal.textContent='Cinematic (Local Report)';
      bLocal.onclick=()=>window.gcShowLocalReport();
      stack.appendChild(bLocal);
    }

    anchor.insertAdjacentElement('afterend', stack);
    return true;
  }

  function start(){
    css();
    if (attach()) return;
    // If the panel renders later, watch only the Setup column for safety
    const setup = document.querySelector('section, .setup, #setup, [data-panel="setup"]') || document.body;
    const mo = new MutationObserver(() => { if (attach()) mo.disconnect(); });
    mo.observe(setup, { childList:true, subtree:true });
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
})();
