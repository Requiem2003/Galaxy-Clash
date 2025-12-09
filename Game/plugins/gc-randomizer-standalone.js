// === GC Randomizer Standalone (global + per-player + sticky UI) ===

/* GC_RandomizerStandalone.js
 * One-file randomize button + per-player buttons + sticky UI.
 * Works even if your previous randomizer file failed to load.
 */
(function(){
  const g = (typeof window!=='undefined') ? window : globalThis;

  // ---------- Utility to work with global `let` or window props ----------
  function hasIdent(name){ try { return typeof eval(name) !== 'undefined'; } catch(e){ return false; } }
  function getIdent(name){ try { return eval(name); } catch(e){ return undefined; } }
  function setIdent(name, v){ try { eval(name+' = v'); return true; } catch(e){ g[name]=v; return true; } }
  function getPLAYERS(){ return hasIdent('PLAYERS') ? getIdent('PLAYERS') : g.PLAYERS; }
  function setPLAYERS(v){ if(hasIdent('PLAYERS')) setIdent('PLAYERS', v); else g.PLAYERS=v; }
  function getCURRENT_PLAYER(){ return hasIdent('CURRENT_PLAYER') ? getIdent('CURRENT_PLAYER') : g.CURRENT_PLAYER; }
  function setCURRENT_PLAYER(v){ if(hasIdent('CURRENT_PLAYER')) setIdent('CURRENT_PLAYER', v); else g.CURRENT_PLAYER=v; }

  // ---------- Sticky UI so rosters/skip stay accessible ----------
  (function ensureSticky(){
    if(document.getElementById('gc-standalone-sticky')) return;
    const s = document.createElement('style');
    s.id = 'gc-standalone-sticky';
    s.textContent = `
      header{ position: sticky; top:0; z-index: 50; }
      .container > aside.panel { position: sticky; top:72px; max-height: calc(100vh - 84px); overflow:auto; }
      #btnGlobalSkip{ position: relative; z-index: 60; pointer-events: auto; }
      .btnPerPlayerRandomize { margin-left:auto; padding:2px 8px; font-size:14px; line-height:1; }
      #gcPerPlayerBar { display:flex; gap:6px; flex-wrap:wrap; margin:6px 0 10px 0; }
    `;
    document.head.appendChild(s);
  })();

  // ---------- Pool building: DB.units preferred, DOM fallback ----------
  function displayName(n){ try{ return (g.displayName? g.displayName(n): String(n||'')).trim(); }catch(e){ return String(n||''); } }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }

  function readBans(){ try{ return JSON.parse(localStorage.getItem('gc_bans')||'[]'); }catch(e){ return []; } }
  function isBannedName(name){
    const bans = readBans().map(x=>String(x).toLowerCase());
    const key = displayName(name).toLowerCase();
    return bans.includes(key);
  }

  function domUnitPool(){
    // Try to read card data from the grid as a fallback.
    const cards = document.querySelectorAll('.grid .card, #roster .card, .cards .card');
    const out = [];
    cards.forEach(c=>{
      const name = c.getAttribute('data-name') || c.querySelector('.name, .title, .card-title')?.textContent?.trim();
      let costText = c.getAttribute('data-cost') || c.querySelector('.pill, .cost, [data-role="cost"]')?.textContent || '';
      let cost = parseFloat(String(costText).replace(/[^0-9.]+/g,''));
      if(name && !isNaN(cost)) out.push({ name, cost, source:'dom' });
    });
    return out;
  }

  function poolUnitsForEdition(){
    const edition = (document.getElementById('edition')||{}).value || 'core';
    let units = [];
    if(g.DB && Array.isArray(g.DB.units)) {
      units = g.DB.units.map(u=>({ name: u.name || u.id || String(u), cost: Number(u.cost)||1, source:(u.source||'db') }));
    } else {
      units = domUnitPool();
    }
    return units.filter(u=>{
      const nf = ((u.source||'')+' '+(u.name||'')).toLowerCase().includes('non-force');
      if(edition==='core' && nf) return false;
      if(edition==='nonforce' && !nf) return false;
      return !isBannedName(u.name);
    });
  }

  // ---------- Ensure players exist ----------
  function ensurePlayers(){
    let P = getPLAYERS();
    if(!Array.isArray(P) || !P.length){
      if(typeof g.resetPlayers === 'function') g.resetPlayers();
      P = getPLAYERS();
      if(!Array.isArray(P) || !P.length){
        // Last resort: create two players with default budget 15
        P = [{ name:'Player 1', picks:[], spent:0, budget:15 }, { name:'Player 2', picks:[], spent:0, budget:15 }];
        setPLAYERS(P);
      }
    }
    // Ensure fields
    P.forEach(p=>{ if(!Array.isArray(p.picks)) p.picks=[]; if(typeof p.spent!=='number') p.spent=0; if(typeof p.budget!=='number') p.budget=15; });
    return P;
  }

  // ---------- Randomize logic ----------
  if(typeof g.HEROES_TAKEN === 'undefined') g.HEROES_TAKEN = new Set();

  function randomizeTeam(index){
    const P = ensurePlayers();
    if(!Array.isArray(P) || !P[index]){ alert('No player at index '+index); return; }
    const p = P[index];
    const poolAll = poolUnitsForEdition();
    if(!poolAll.length){ alert('No unit pool found. Make sure DB.units is loaded or the roster cards are in the DOM.'); return; }

    // Reset this team
    p.picks = []; p.spent = 0;
    if(typeof g.recomputeHeroesTaken === 'function') g.recomputeHeroesTaken(); else g.HEROES_TAKEN = new Set();

    const pool = shuffle(poolAll.slice());
    let guard = 0;
    while(p.spent < p.budget && guard < 600){
      guard++;
      const remaining = p.budget - p.spent + 1e-6;
      const candidates = pool.filter(u=>{
        if(u.cost > remaining) return false;
        if(p.picks.some(x=> displayName(x.name).toLowerCase() === displayName(u.name).toLowerCase())) return false;
        if(typeof g.isHero === 'function' && g.isHero(u.name)){
          const key = (typeof g.heroKey === 'function') ? g.heroKey(u.name) : displayName(u.name).toLowerCase();
          if(g.HEROES_TAKEN.has(key)) return false;
        }
        return true;
      });
      if(!candidates.length) break;

      const tight = remaining <= 2.5;
      const poolPick = tight ? candidates.filter(c=>c.cost<=2.5) : candidates;
      const choice = (poolPick.length ? poolPick : candidates)[(Math.random()* (poolPick.length?poolPick.length:candidates.length))|0];
      if(!choice) break;

      // Prefer calling the app's pick() if it exists so UI state stays consistent
      if(typeof g.pick === 'function'){
        const prev = getCURRENT_PLAYER();
        setCURRENT_PLAYER(index+1);
        try { g.pick(choice); } finally { if(typeof prev!=='undefined') setCURRENT_PLAYER(prev); }
      } else {
        p.picks.push(choice);
        p.spent += (choice.cost||1);
      }

      if(typeof g.isHero === 'function' && g.isHero(choice.name)){
        const key = (typeof g.heroKey === 'function') ? g.heroKey(choice.name) : displayName(choice.name).toLowerCase();
        g.HEROES_TAKEN.add(key);
      }
    }

    if(typeof g.renderPlayers === 'function') g.renderPlayers();
    if(typeof g.updateTurnIndicator === 'function') g.updateTurnIndicator();
  }

  function randomizeActiveTeam(){
    const P = ensurePlayers();
    const idx = ((getCURRENT_PLAYER()||1)-1) % (P ? P.length : 1);
    randomizeTeam(idx);
  }
  function randomizeAllTeams(){ const P=ensurePlayers(); for(let i=0;i<(P?P.length:0);i++) randomizeTeam(i); }

  // Export API so buttons can call it
  g.randomizeTeam = randomizeTeam;
  g.randomizeActiveTeam = randomizeActiveTeam;
  g.randomizeAllTeams = randomizeAllTeams;

  // ---------- UI injection: global randomize + per-player buttons ----------
  function injectGlobalButton(){
    if(document.getElementById('btnRandomizeTeam')) return;
    const panel = document.querySelector('.container > aside.panel .controls') || document.querySelector('.controls');
    if(!panel) return;
    const btn = document.createElement('button');
    btn.id = 'btnRandomizeTeam';
    btn.className = 'ghost';
    btn.type = 'button';
    btn.textContent = '🎲 Randomize Current Team';
    btn.addEventListener('click', randomizeActiveTeam);
    panel.appendChild(btn);
  }

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
    const leftPanel = document.querySelector('.container > aside.panel') || document.querySelector('aside.panel');
    const players = Array.isArray(getPLAYERS()) ? getPLAYERS() : [];
    if(!leftPanel || players.length===0) return;

    let cards = leftPanel.querySelectorAll('.player, .player-card, .playerBox, .playerItem, .roster .card, [data-role="player"], .playerSection');
    if(cards.length === players.length){
      cards.forEach((el,i)=> ensureButtonForContainer(el, i));
    } else {
      let bar = document.getElementById('gcPerPlayerBar');
      if(!bar){
        const labels = Array.from(leftPanel.querySelectorAll('label'));
        const playersLabel = labels.find(l=>/players/i.test(l.textContent||''));
        bar = document.createElement('div');
        bar.id = 'gcPerPlayerBar';
        if(playersLabel && playersLabel.parentElement){ playersLabel.parentElement.insertBefore(bar, playersLabel.nextSibling); }
        else { leftPanel.insertBefore(bar, leftPanel.firstChild); }
      }
      bar.innerHTML='';
      players.forEach((p,i)=>{
        const b = document.createElement('button');
        b.className = 'ghost tiny'; b.type = 'button';
        b.title = `Randomize ${p.name||('Player '+(i+1))}`;
        b.textContent = `🎲 P${i+1}`;
        b.addEventListener('click', ()=> randomizeTeam(i));
        bar.appendChild(b);
      });
    }
  }

  // Keep buttons alive across re-renders
  function hookRenderPlayers(){
    if(g.__gcStandaloneHooked) return;
    if(typeof g.renderPlayers === 'function'){
      const _orig = g.renderPlayers;
      g.renderPlayers = function(){ const r = _orig.apply(this, arguments); try{ attachPerPlayerButtons(); }catch(e){} return r; };
      g.__gcStandaloneHooked = true;
    }
  }
  function observePlayersContainer(){
    const c = document.getElementById('players');
    if(!c || c.__gcObserver) return;
    const obs = new MutationObserver(()=>{ try{ attachPerPlayerButtons(); }catch(e){} });
    obs.observe(c, { childList:true, subtree:true });
    c.__gcObserver = obs;
  }

  function init(){
    try{
      injectGlobalButton();
      attachPerPlayerButtons();
      observePlayersContainer();
      hookRenderPlayers();
    }catch(e){ console.warn('[GC_RandomizerStandalone] init failed', e); }
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }

  console.log('[GC_RandomizerStandalone] ready');
})();
