// === GC Randomizer (Sticky + Per-Player buttons) ===
/*
 * GC_RandomizerSticky.js — "Randomize Team" + sticky rosters/skip
 * -----------------------------------------------------------------
 * Include this AFTER your core scripts and BEFORE GC_BattleEngine.js (or after it—either is fine).
 * It injects a 🎲 Randomize Current Team button and makes the left roster
 * panel and the Skip button stay accessible while scrolling.
 */
(function(){
  const g = (typeof window!=='undefined')? window : globalThis;

  // --- STICKY UI -----------------------------------------------------------
  function injectStickyCSS(){
    if(document.getElementById('gc-sticky-ui')) return;
    const css = `
      /* Keep header & controls available */
      header{ position: sticky; top:0; z-index:50; }
      .container{ align-items: start; }
      /* Make the left panel (Setup/Players/Options) sticky */
      .container > aside.panel{ position: sticky; top:72px; max-height: calc(100vh - 84px); overflow:auto; }
      /* Ensure the global Skip button is clickable above grids */
      #btnGlobalSkip{ position: relative; z-index: 60; pointer-events: auto; }
    `;
    const el = document.createElement('style');
    el.id = 'gc-sticky-ui';
    el.textContent = css;
    document.head.appendChild(el);
  }

  // --- RANDOMIZER ---------------------------------------------------------
  function readBans(){ try{ return JSON.parse(localStorage.getItem('gc_bans')||'[]'); }catch(e){ return []; } }
  function isBannedName(name){
    const bans = readBans();
    const key = String((g.displayName? g.displayName(name): name)||'').trim().toLowerCase();
    return bans.map(x=>String(x).toLowerCase()).includes(key);
  }

  function poolUnitsForEdition(){
    const edition = (document.getElementById('edition')||{}).value || 'core';
    return (g.DB && g.DB.units ? g.DB.units : []).filter(u=>{
      const nf = ((u.source||'').toLowerCase().includes('non-force'));
      if(edition==='core' && nf) return false;
      if(edition==='nonforce' && !nf) return false;
      if(isBannedName(u.name)) return false;
      return true;
    });
  }

  function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=(Math.random()* (i+1))|0; [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

  function randomizeTeam(index){
    if(!Array.isArray(g.PLAYERS) || g.PLAYERS.length===0){ if(g.resetPlayers) g.resetPlayers(); }
    if(!Array.isArray(g.PLAYERS) || !g.PLAYERS[index]){ alert('No player at index '+index); return; }
    const p = g.PLAYERS[index];

    // 1) Clear this player's picks & spent, then recompute heroes taken
    p.picks = []; p.spent = 0;
    if(g.recomputeHeroesTaken) g.recomputeHeroesTaken();

    // 2) Build a randomized pool (respect edition & bans); bias to affordable units
    const pool = shuffle(poolUnitsForEdition().slice());

    // 3) Draft until budget is near-exhausted or we run out of options
    let guard = 0;
    while(p.spent < p.budget && guard < 500){
      guard++;
      // Filter candidates that we can still afford and that aren't already taken (hero uniqueness)
      const remaining = p.budget - p.spent + 1e-6;
      const candidates = pool.filter(u=>{
        if(u.cost > remaining) return false;
        // Avoid duplicates of the same card for variety
        if(p.picks.some(x=> (g.displayName? g.displayName(x.name): x.name) === (g.displayName? g.displayName(u.name): u.name))) return false;
        // Unique hero rule across all teams
        if(g.isHero && g.isHero(u.name)){
          const key = g.heroKey? g.heroKey(u.name) : String((g.displayName? g.displayName(u.name): u.name)).toLowerCase();
          if(g.HEROES_TAKEN && g.HEROES_TAKEN.has(key)) return false;
        }
        return true;
      });
      if(!candidates.length) break;

      // Prefer mid/low-cost when remaining budget is tight to avoid early dead-ends
      const tight = remaining <= 2.5;
      const poolPick = tight ? candidates.filter(c=>c.cost<=remaining && c.cost<=2.5) : candidates;
      const choice = poolPick.length ? poolPick[(Math.random()*poolPick.length)|0] : candidates[(Math.random()*candidates.length)|0];
      if(!choice) break;

      // Apply pick (without using pick()) to avoid rotating CURRENT_PLAYER
      p.picks.push(choice);
      p.spent += choice.cost;
      if(g.isHero && g.isHero(choice.name)){
        const key = g.heroKey? g.heroKey(choice.name) : String((g.displayName? g.displayName(choice.name): choice.name)).toLowerCase();
        if(g.HEROES_TAKEN) g.HEROES_TAKEN.add(key);
      }
    }

    if(g.renderPlayers) g.renderPlayers();
    if(g.updateTurnIndicator) g.updateTurnIndicator();
  }

  function randomizeActiveTeam(){
    const idx = ((g.CURRENT_PLAYER||1)-1) % (g.PLAYERS? g.PLAYERS.length:1);
    randomizeTeam(idx);
  }

  function randomizeAllTeams(){ if(!Array.isArray(g.PLAYERS)) return; for(let i=0;i<g.PLAYERS.length;i++) randomizeTeam(i); }

  // --- UI injection --------------------------------------------------------
  function injectRandomizeButton(){
    if(document.getElementById('btnRandomizeTeam')) return;
    // Find the controls row that contains Add/Reset Player buttons
    const labels = Array.from(document.querySelectorAll('label'));
    const playersLabel = labels.find(l=>/players/i.test(l.textContent||''));
    let targetControls = null;
    if(playersLabel){
      // The controls for players are just above the Players label
      // Try to find the previous sibling controls block
      let prev = playersLabel.previousElementSibling;
      while(prev && !/controls/i.test(prev.className||'')) prev = prev.previousElementSibling;
      targetControls = prev;
    }
    if(!targetControls){
      // Fallback: first .controls inside the left panel
      targetControls = document.querySelector('.container > aside.panel .controls');
    }
    if(!targetControls) return;

    const btn = document.createElement('button');
    btn.id = 'btnRandomizeTeam';
    btn.className = 'ghost';
    btn.type = 'button';
    btn.innerText = '🎲 Randomize Current Team';
    btn.title = 'Fill the current player\'s roster within budget, respecting bans & unique heroes';
    btn.addEventListener('click', randomizeActiveTeam);
    targetControls.appendChild(btn);

    // Optional: tiny button to randomize everyone (hidden by default)
    const btnAll = document.createElement('button');
    btnAll.id = 'btnRandomizeAllTeams';
    btnAll.className = 'ghost';
    btnAll.type = 'button';
    btnAll.style.display = 'none';
    btnAll.innerText = '🎲 Randomize All Teams';
    btnAll.title = 'Fill all teams to budget';
    btnAll.addEventListener('click', randomizeAllTeams);
    targetControls.appendChild(btnAll);
  }
  // --- PER-PLAYER BUTTONS -------------------------------------------------
  function ensureButtonForContainer(container, index){
    if(!container) return;
    if(container.querySelector('.btnPerPlayerRandomize')) return;
    container.style.position = container.style.position || 'relative';
    const btn = document.createElement('button');
    btn.className = 'ghost tiny btnPerPlayerRandomize';
    btn.type = 'button';
    btn.title = 'Randomize this player\'s team';
    btn.textContent = '🎲';
    Object.assign(btn.style, { position:'absolute', top:'6px', right:'6px', padding:'2px 6px', fontSize:'14px', lineHeight:'1' });
    btn.addEventListener('click', function(ev){ ev.stopPropagation(); try{ randomizeTeam(index); }catch(e){ console.warn('Randomize failed', e); }});
    container.appendChild(btn);
  }

  function attachPerPlayerButtons(){
    try{
      const leftPanel = document.querySelector('.container > aside.panel') || document.querySelector('aside.panel');
      const players = Array.isArray(g.PLAYERS) ? g.PLAYERS : [];
      if(!leftPanel || players.length===0) return;

      // Try common player container selectors first
      let cards = leftPanel.querySelectorAll('.player, .player-card, .playerBox, .playerItem, .roster .card, [data-role="player"], .playerSection');

      if(cards.length===players.length){
        cards.forEach((el, i)=> ensureButtonForContainer(el, i));
      } else {
        // Fallback: create a slim toolbar with per-player buttons near the Players label
        let bar = document.getElementById('gcPerPlayerBar');
        if(!bar){
          const labels = Array.from(leftPanel.querySelectorAll('label'));
          const playersLabel = labels.find(l=>/players/i.test(l.textContent||''));
          bar = document.createElement('div');
          bar.id = 'gcPerPlayerBar';
          bar.style.display = 'flex';
          bar.style.gap = '6px';
          bar.style.flexWrap = 'wrap';
          bar.style.margin = '6px 0 10px 0';
          if(playersLabel && playersLabel.parentElement){ playersLabel.parentElement.insertBefore(bar, playersLabel.nextSibling); }
          else { leftPanel.insertBefore(bar, leftPanel.firstChild); }
        }
        // Rebuild
        bar.innerHTML='';
        players.forEach((p,i)=>{
          const b = document.createElement('button');
          b.className = 'ghost tiny';
          b.type = 'button';
          b.title = `Randomize ${p.name||('Player '+(i+1))}`;
          b.textContent = `🎲 P${i+1}`;
          b.addEventListener('click', ()=> randomizeTeam(i));
          bar.appendChild(b);
        });
      }
    }catch(e){ console.warn('[PerPlayerButtons] attach failed', e); }
  }

  // Patch renderPlayers to re-attach buttons after DOM updates (robust)
  function hookRenderPlayers(){
    if(g.__gcPerPlayerHooked) return;
    if(typeof g.renderPlayers === 'function'){
      const _orig = g.renderPlayers;
      g.renderPlayers = function(){
        const r = _orig.apply(this, arguments);
        try{ attachPerPlayerButtons(); }catch(e){}
        return r;
      };
      g.__gcPerPlayerHooked = true;
    }
  }
  // Wait for renderPlayers if not yet defined
  if(typeof g.renderPlayers !== 'function'){
    const iv = setInterval(()=>{ if(typeof g.renderPlayers === 'function'){ hookRenderPlayers(); clearInterval(iv); } }, 50);
    setTimeout(()=> clearInterval(iv), 6000);
  } else { hookRenderPlayers(); }

  // Observe #players for DOM changes to keep buttons present
  function observePlayersContainer(){
    const c = document.getElementById('players');
    if(!c || c.__gcObserver) return;
    const obs = new MutationObserver(()=>{ try{ attachPerPlayerButtons(); }catch(e){} });
    obs.observe(c, { childList:true, subtree:true });
    c.__gcObserver = obs;
  }


  // Boot
  function init(){
    try{
      injectStickyCSS();
      injectRandomizeButton();
      attachPerPlayerButtons();
      observePlayersContainer();
      hookRenderPlayers();
    }catch(e){ console.warn('[RandomizerSticky] init failed', e); }
  } }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }

  // Expose API
  g.randomizeTeam = randomizeTeam; // <-- export so other scripts (per-player buttons) can call it
  g.randomizeActiveTeam = randomizeActiveTeam;
  g.randomizeAllTeams = randomizeAllTeams;
})();

// GC_PerPlayerButtons.js — drop-in per-player 🎲 buttons (robust)
(function(){
  const g = (typeof window!=='undefined')? window : globalThis;

  function ensureCSS(){
    if(document.getElementById('gc-per-player-css')) return;
    const el = document.createElement('style');
    el.id = 'gc-per-player-css';
    el.textContent = `
      .btnPerPlayerRandomize {
        margin-left:auto;
        padding: 2px 8px;
        font-size: 14px;
        line-height: 1;
      }
      /* Make sure buttons remain clickable in sticky/scroll scenarios */
      #players .player { position: relative; }
    `;
    document.head.appendChild(el);
  }

  function attachButtons(){
    ensureCSS();
    const playersRoot = document.getElementById('players');
    if(!playersRoot) return;

    const cards = playersRoot.querySelectorAll(':scope > .player');
    // If template differs, allow fallback to any direct child as a card
    const nodes = cards.length ? cards : playersRoot.children;
    Array.from(nodes).forEach((card, i) => {
      if(!card || card.nodeType !== 1) return;
      // Try to locate the top row (first div) to place the button inline
      let topRow = card.querySelector(':scope > div');
      if(!topRow) topRow = card;

      if(topRow.querySelector('.btnPerPlayerRandomize')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ghost tiny btnPerPlayerRandomize';
      btn.textContent = '🎲';
      btn.title = 'Randomize this player\'s team';
      btn.addEventListener('click', function(ev){
        ev.stopPropagation();
        try {
          if(typeof g.randomizeTeam === 'function'){ g.randomizeTeam(i); }
          else if(typeof g.randomizeActiveTeam === 'function'){
            const prev = g.CURRENT_PLAYER;
            g.CURRENT_PLAYER = (i+1);
            try { g.randomizeActiveTeam(); } finally { g.CURRENT_PLAYER = prev; }
          } else {
            alert('randomizeTeam() not found. Make sure GC_RandomizerSticky.js is included.');
          }
        } catch(e){ console.warn('Randomize failed', e); }
      });
      // place at end of top row so it sits to the right
      topRow.appendChild(btn);
    });
  }

  // Hook renderPlayers so buttons reappear after re-render
  function hookRenderPlayers(){
    if(g.__gcPerPlayerBtnsHooked) return;
    if(typeof g.renderPlayers === 'function'){
      const _orig = g.renderPlayers;
      g.renderPlayers = function(){
        const r = _orig.apply(this, arguments);
        try { attachButtons(); } catch(e){}
        return r;
      };
      g.__gcPerPlayerBtnsHooked = true;
    }
  }

  // Observe the players container for changes
  function observePlayers(){
    const root = document.getElementById('players');
    if(!root || root.__gcObserver) return;
    const obs = new MutationObserver(() => { try { attachButtons(); } catch(e){} });
    obs.observe(root, { childList:true, subtree:true });
    root.__gcObserver = obs;
  }

  function init(){
    attachButtons();
    observePlayers();
    hookRenderPlayers();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // If renderPlayers is defined later, hook it when it appears
  if(typeof g.renderPlayers !== 'function'){
    const iv = setInterval(() => {
      if(typeof g.renderPlayers === 'function'){ hookRenderPlayers(); clearInterval(iv); }
    }, 50);
    setTimeout(() => clearInterval(iv), 6000);
  }
})();
