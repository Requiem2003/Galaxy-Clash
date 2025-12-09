// === GC Randomizer Shim (fallback APIs) ===

// GC_RandomizeShim.js — fallback shim for randomizeTeam/Active/All
// Purpose: If GC_RandomizerSticky.js failed to load, this script provides the
//          randomize APIs so PerPlayerButtons and UI can still work.
(function(){
  const g = (typeof window!=='undefined')? window : globalThis;
  if (typeof g.randomizeTeam === 'function' && typeof g.randomizeActiveTeam === 'function') {
    // Nothing to do; full randomizer present.
    return;
  }

  function displayName(n){ try{ return (g.displayName? g.displayName(n): String(n||'')).trim(); }catch(e){ return String(n||''); } }
  function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

  function readBans(){ try{ return JSON.parse(localStorage.getItem('gc_bans')||'[]'); }catch(e){ return []; } }
  function isBannedName(name){
    const bans = readBans().map(x=>String(x).toLowerCase());
    const key = displayName(name).toLowerCase();
    return bans.includes(key);
  }

  function poolUnitsForEdition(){
    const edition = (document.getElementById('edition')||{}).value || 'core';
    const units = (g.DB && Array.isArray(g.DB.units)) ? g.DB.units : [];
    return units.filter(u=>{
      const nf = ((u.source||'').toLowerCase().includes('non-force'));
      if(edition==='core' && nf) return false;
      if(edition==='nonforce' && !nf) return false;
      if(isBannedName(u.name)) return false;
      return true;
    });
  }

  function ensurePlayers(){
    if(!Array.isArray(g.PLAYERS) || !g.PLAYERS.length){
      if(typeof g.resetPlayers === 'function') g.resetPlayers();
    }
  }

  function randomizeTeam(index){
    ensurePlayers();
    if(!Array.isArray(g.PLAYERS) || !g.PLAYERS[index]){ alert('No player at index '+index); return; }
    const p = g.PLAYERS[index];
    p.picks = []; p.spent = 0;
    if(typeof g.recomputeHeroesTaken === 'function') g.recomputeHeroesTaken();
    if(!g.HEROES_TAKEN) g.HEROES_TAKEN = new Set();

    const pool = shuffle(poolUnitsForEdition().slice());

    let guard = 0;
    while(p.spent < p.budget && guard < 600){
      guard++;
      const remaining = p.budget - p.spent + 1e-6;
      const candidates = pool.filter(u=>{
        if(u.cost > remaining) return false;
        // unique within team
        if(p.picks.some(x=> displayName(x.name).toLowerCase() === displayName(u.name).toLowerCase())) return false;
        // global unique hero rule
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

      p.picks.push(choice);
      p.spent += choice.cost;
      if(typeof g.isHero === 'function' && g.isHero(choice.name)){
        const key = (typeof g.heroKey === 'function') ? g.heroKey(choice.name) : displayName(choice.name).toLowerCase();
        g.HEROES_TAKEN.add(key);
      }
    }

    if(typeof g.renderPlayers === 'function') g.renderPlayers();
    if(typeof g.updateTurnIndicator === 'function') g.updateTurnIndicator();
  }

  function randomizeActiveTeam(){
    ensurePlayers();
    const idx = ((g.CURRENT_PLAYER||1)-1) % (g.PLAYERS? g.PLAYERS.length:1);
    randomizeTeam(idx);
  }

  function randomizeAllTeams(){
    ensurePlayers();
    for(let i=0;i<(g.PLAYERS? g.PLAYERS.length:0); i++) randomizeTeam(i);
  }

  // Export (only if missing)
  if(typeof g.randomizeTeam !== 'function') g.randomizeTeam = randomizeTeam;
  if(typeof g.randomizeActiveTeam !== 'function') g.randomizeActiveTeam = randomizeActiveTeam;
  if(typeof g.randomizeAllTeams !== 'function') g.randomizeAllTeams = randomizeAllTeams;

  console.log('[GC_RandomizeShim] active — provided randomizeTeam/Active/All');
})();
