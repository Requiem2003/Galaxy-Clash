// File: Game/plugins/gc-ui.js
// Purpose: Build HUD + Live Log UI. No dependencies; listens to GC.bus.
(function(){
  const g = (typeof window!== 'undefined') ? window : globalThis;
  const GC = g.GC || (g.GC = {});
  const bus = GC.bus;

  // UI root
  const root = document.createElement('div');
  root.className = 'gcui-root';
  root.innerHTML = `
    <section class="gcui-hud">
      <div class="team team-a">
        <div class="team-meta"><span class="team-name" id="gcui-a-name">Team A</span><span class="team-seed" id="gcui-seed">seed –</span></div>
        <div class="bars">
          <div class="bar hp"><span class="label">HP</span><div class="fill" id="gcui-a-hp"></div><span class="val" id="gcui-a-hp-val">0</span></div>
          <div class="bar morale"><span class="label">Morale</span><div class="fill" id="gcui-a-morale"></div><span class="val" id="gcui-a-morale-val">0</span></div>
        </div>
      </div>
      <div class="team team-b">
        <div class="team-meta"><span class="team-name" id="gcui-b-name">Team B</span></div>
        <div class="bars">
          <div class="bar hp"><span class="label">HP</span><div class="fill" id="gcui-b-hp"></div><span class="val" id="gcui-b-hp-val">0</span></div>
          <div class="bar morale"><span class="label">Morale</span><div class="fill" id="gcui-b-morale"></div><span class="val" id="gcui-b-morale-val">0</span></div>
        </div>
      </div>
    </section>

    <aside class="gcui-log">
      <header>
        <div class="title">Battle Log</div>
        <div class="actions">
          <label class="chk"><input id="gcui-autoscroll" type="checkbox" checked> Autoscroll</label>
          <button id="gcui-copy-seed" title="Copy seed">Seed</button>
          <button id="gcui-share" title="Copy summary JSON">Share</button>
          <button id="gcui-clear" title="Clear log">Clear</button>
        </div>
      </header>
      <div class="list" id="gcui-loglist"></div>
    </aside>

    <footer class="gcui-controls">
      <button id="gcui-run">Start Battle</button>
      <button id="gcui-replay" disabled>Replay</button>
      <label class="speed">Speed <input id="gcui-speed" type="range" min="0.2" max="2" step="0.1" value="1"> <span id="gcui-speed-val">1.0x</span></label>
    </footer>
  `;
  document.body.appendChild(root);

  // Refs
  const $ = (sel) => root.querySelector(sel);
  const L = $('#gcui-loglist');
  const autoscroll = $('#gcui-autoscroll');
  const speed = $('#gcui-speed');
  const speedVal = $('#gcui-speed-val');
  const runBtn = $('#gcui-run');
  const replayBtn = $('#gcui-replay');
  const seedBadge = $('#gcui-seed');

  // Local state
  let lastSummary = null;
  let lastSeed = null;
  let lastTeams = null;

  // Helpers
  function write(type, text){
    const el = document.createElement('div'); el.className = 'item '+type; el.textContent = text;
    L.appendChild(el);
    if(autoscroll.checked) L.scrollTop = L.scrollHeight;
  }
  function setBar(idFill, idVal, pct, text){
    const f = $(idFill), v = $(idVal);
    f.style.width = Math.max(0, Math.min(100, pct)) + '%';
    v.textContent = text;
  }
  function updateHUDFromPayload(p){
    if(!p) return;
    const aHp = p.A.hp, bHp = p.B.hp; const maxHp = Math.max(1, aHp + bHp);
    setBar('#gcui-a-hp', '#gcui-a-hp-val', (aHp/maxHp)*100, String(aHp));
    setBar('#gcui-b-hp', '#gcui-b-hp-val', (bHp/maxHp)*100, String(bHp));
    setBar('#gcui-a-morale', '#gcui-a-morale-val', p.A.morale, String(p.A.morale));
    setBar('#gcui-b-morale', '#gcui-b-morale-val', p.B.morale, String(p.B.morale));
  }

  // Controls
  runBtn.onclick = () => { try { const s = g.runBattle && g.runBattle(); s && (lastSummary=s); } catch(e){ console.error(e); } };
  replayBtn.onclick = () => { if(!lastSummary) return; try { const s = g.runBattle && g.runBattle(); s && (lastSummary=s); } catch(e){} };
  $('#gcui-copy-seed').onclick = async () => { if(lastSeed==null) return; try{ await navigator.clipboard.writeText(String(lastSeed)); write('sys','Seed copied.'); }catch{} };
  $('#gcui-share').onclick = async () => { if(!lastSummary) return; try{ const text = JSON.stringify(lastSummary, null, 2); await navigator.clipboard.writeText(text); write('sys','Summary copied to clipboard.'); }catch{} };
  $('#gcui-clear').onclick = () => { L.innerHTML=''; };
  speed.oninput = (e)=>{
    const val = parseFloat(e.target.value || '1'); speedVal.textContent = val.toFixed(1)+'x';
    if(GC.time) GC.time.scale = val;
  };

  // Fallback log capture when no bus
  (function shimLog(){
    const orig = g.log || ((t)=> console.log(t));
    g.log = function(t){ write('txt', String(t)); return orig(t); };
  })();

  // Event wiring
  if(bus && bus.on){
    bus.on('app:ready', (e)=>{ write('sys','App ready.'); });
    bus.on('battle:start', ({ seed, teams })=>{
      L.innerHTML='';
      lastSeed = seed; lastTeams = teams; seedBadge.textContent = 'seed '+seed;
      $('#gcui-a-name').textContent = teams?.[0]?.name || 'Team A';
      $('#gcui-b-name').textContent = teams?.[1]?.name || 'Team B';
      write('sys', `Battle begins (seed ${seed}).`);
      replayBtn.disabled = true;
    });
    bus.on('turn', ({ round, actor })=>{ write('turn', `Round ${round}: ${actor.name} acts.`); });
    bus.on('hit', ({ actor, target, dmg, crit })=>{ write('hit', `${actor.name} hits ${target.name} for ${dmg}${crit?' (CRIT)':''}.`); });
    bus.on('miss', ({ actor, target })=>{ write('miss', `${actor.name} misses ${target.name}.`); });
    bus.on('support', ({ type, actor, target, val })=>{ if(type==='heal') write('heal', `${actor.name} heals ${target.name} for ${val}.`); else write('shield', `${actor.name} shields ${target.name} for ${val}.`); });
    bus.on('kill', ({ actor, target })=>{ write('kill', `${actor.name} defeats ${target.name}!`); });
    bus.on('round:end', (payload)=>{ updateHUDFromPayload(payload); write('sys', `Round ${payload.round} ends.`); });
    bus.on('battle:end', (summary)=>{
      lastSummary = summary; updateHUDFromPayload(summary);
      const who = summary?.outcome?.winner ? `${summary.outcome.winner} wins` : 'Draw';
      write('sys', `Battle ends → ${who}.`);
      replayBtn.disabled = false;
    });
  }
})();