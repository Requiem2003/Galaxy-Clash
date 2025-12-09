// Game/plugins/gc-cinematic-remote.js
(function(){
  const g = (typeof window!=='undefined') ? window : globalThis;
  g.GC = g.GC || {};
  const BUS = g.GC.bus;

  const CSS = `
#gc-ai-btn{position:fixed;right:12px;top:52px;z-index:9999;padding:.5rem .7rem;border:0;border-radius:.6rem;box-shadow:0 4px 10px rgba(0,0,0,.2);font-weight:600;cursor:pointer}
#gc-ai-modal{position:fixed;inset:0;display:none;background:rgba(0,0,0,.65);z-index:9998}
#gc-ai-card{position:absolute;left:50%;top:5%;transform:translateX(-50%);width:min(920px,92vw);max-height:90vh;overflow:auto;background:#0b0c10;color:#e9eef3;border-radius:14px;box-shadow:0 25px 80px rgba(0,0,0,.45);padding:22px}
#gc-ai-card h1{margin:.1rem 0 1rem 0;font-size:1.3rem}
#gc-ai-card pre{white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.95rem;line-height:1.35}
#gc-ai-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-bottom:8px}
#gc-ai-actions button{padding:.35rem .6rem;border-radius:.5rem;border:0;cursor:pointer}
  `;

  function ui(){
    if(document.getElementById('gc-ai-style')) return;
    const s=document.createElement('style'); s.id='gc-ai-style'; s.textContent=CSS; document.head.appendChild(s);

    const m=document.createElement('div'); m.id='gc-ai-modal';
    const c=document.createElement('div'); c.id='gc-ai-card';
    const actions=document.createElement('div'); actions.id='gc-ai-actions';
    const copy=document.createElement('button'); copy.textContent='Copy'; copy.onclick=()=>navigator.clipboard.writeText(pre.textContent||'');
    const close=document.createElement('button'); close.textContent='Close'; close.onclick=()=>{m.style.display='none';};
    const pre=document.createElement('pre'); pre.id='gc-ai-pre';
    const h=document.createElement('h1'); h.textContent='Cinematic Story (Python AI)';
    actions.append(copy, close); c.append(actions, h, pre); m.appendChild(c); document.body.appendChild(m);

    const b=document.createElement('button'); b.id='gc-ai-btn'; b.textContent='Cinematic (Python)';
    b.title='Generate a cinematic report using the Python AI';
    b.onclick=generate;
    document.body.appendChild(b);
  }

  let lastRound = null;
  if(BUS && BUS.on){
    BUS.on('round:end', payload => { lastRound = payload; }); // we’ll use names + units from here
  }

  function buildConfig(){
    // Use the last battle’s names + units (added by the small patch in gc-battle.js)
    const AName = lastRound?.AName || 'Team A';
    const BName = lastRound?.BName || 'Team B';
    const AUnits = (lastRound?.AUnits || []).map(String);
    const BUnits = (lastRound?.BUnits || []).map(String);

    // Fallback: if not available, show a minimal config so user still sees something
    if (!AUnits.length || !BUnits.length){
      console.warn('No unit arrays on last round; falling back to placeholders.');
    }

    return {
      budget: 9999,
      teams: [
        { name: AName, units: AUnits.length? AUnits : ['Darth Vader','Stormtrooper'] },
        { name: BName, units: BUnits.length? BUnits : ['Saw Gerrera','Clone Trooper'] }
      ],
      battlefield: {
        location: 'fog-shrouded ruins of an ancient temple',
        weather: 'torrential rain under flashes of lightning',
        terrain: 'thick jungle overgrowth and crumbling stone'
      }
    };
  }

  async function generate(){
    try{
      const cfg = buildConfig();
      const r = await fetch('/cinematic', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(cfg)
      });
      const text = await r.text();
      const pre=document.getElementById('gc-ai-pre');
      pre.textContent = text || 'No output.';
      document.getElementById('gc-ai-modal').style.display='block';
    }catch(err){
      const pre=document.getElementById('gc-ai-pre');
      pre.textContent = 'Error: ' + (err?.message || String(err));
      document.getElementById('gc-ai-modal').style.display='block';
    }
  }

  document.addEventListener('DOMContentLoaded', ui);
  window.gcRunCinematicRemote = generate;   // or whatever function triggers remote Python
})();
