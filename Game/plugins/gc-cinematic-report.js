<!-- File: Game/plugins/gc-cinematic-report.js -->
<script>
// Minimal Cinematic Battle Reporter (hooks into GC event bus)
(function () {
  const g = (typeof window !== 'undefined') ? window : globalThis;
  g.GC = g.GC || {};
  const BUS = g.GC && g.GC.bus;

  // --- tiny styles + modal UI ---
  const CSS = `
#gc-cine-btn{position:fixed;right:12px;top:12px;z-index:9999;padding:.5rem .7rem;border-radius:.6rem;border:0;box-shadow:0 4px 10px rgba(0,0,0,.2);font-weight:600;cursor:pointer}
#gc-cine-modal{position:fixed;inset:0;display:none;background:rgba(0,0,0,.65);z-index:9998}
#gc-cine-card{position:absolute;left:50%;top:5%;transform:translateX(-50%);width:min(920px,92vw);max-height:90vh;overflow:auto;background:#0b0c10;color:#e9eef3;border-radius:14px;box-shadow:0 25px 80px rgba(0,0,0,.45);padding:22px}
#gc-cine-card h1{margin:.1rem 0 1rem 0;font-size:1.3rem}
#gc-cine-card pre{white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.95rem;line-height:1.35}
#gc-cine-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-bottom:8px}
#gc-cine-actions button{padding:.35rem .6rem;border-radius:.5rem;border:0;cursor:pointer}
  `;
  function injectCSS(){
    if (document.getElementById('gc-cine-style')) return;
    const s = document.createElement('style');
    s.id = 'gc-cine-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function ensureUI(){
    if (document.getElementById('gc-cine-modal')) return;
    const m = document.createElement('div'); m.id='gc-cine-modal';
    const c = document.createElement('div'); c.id='gc-cine-card';
    const actions = document.createElement('div'); actions.id='gc-cine-actions';
    const copy = document.createElement('button'); copy.textContent='Copy'; copy.onclick=()=>navigator.clipboard.writeText(pre.textContent||'');
    const close= document.createElement('button'); close.textContent='Close'; close.onclick=()=>{ m.style.display='none'; };
    const pre  = document.createElement('pre'); pre.id='gc-cine-pre';
    const h = document.createElement('h1'); h.textContent='Cinematic Battle Report';
    actions.append(copy, close); c.append(actions, h, pre); m.appendChild(c); document.body.appendChild(m);
  }

  // --- capture + compose ---
  const State = {
    round: 0,
    AName: 'Team A', BName: 'Team B',
    bullets: {1:[],2:[],3:[]},
    losses:  {1:[],2:[],3:[]},
    last: null
  };

  function addBullet(r, t){ const a = State.bullets[r]||(State.bullets[r]=[]); if(a.length<5) a.push('• ' + t); }
  function addLoss(r, t){ const a = State.losses[r] ||(State.losses[r] =[]); if(a.length<8) a.push(' - ' + t); }

  function buildIntro(){
    return [
      `Battlefield: rain-slick ruins at dusk; visibility low, footing treacherous.`,
      `${State.AName}: ruthless control & discipline. ${State.BName}: agile skirmishers & ambush play.`
    ].join('\n');
  }
  function buildOutcome(){
    const s = State.last; if(!s) return 'Outcome unclear.';
    let winner = null;
    if (s.A.alive===0 || s.B.morale > s.A.morale) winner = State.BName;
    if (s.B.alive===0 || s.A.morale >= s.B.morale) winner = winner || State.AName;
    const recap = (winner===State.AName)
      ? `In the end, ${State.AName}'s fear tactics broke ${State.BName}.`
      : `Ultimately, ${State.BName}'s traps and grit toppled ${State.AName}.`;
    const sting = (winner===State.AName)
      ? `As dawn lifts, ${State.AName} hold the field among smoking ruins.`
      : `As the smoke thins, ${State.BName} stand bloodied but unbowed.`;
    return `Winner: **${winner}**\n\n${recap}\n${sting}`;
  }
  function compose(){
    const intro = buildIntro();
    const b1 = State.bullets[1].join('\n') || '• Skirmish lines form; probing fire traded.';
    const b2 = State.bullets[2].join('\n') || '• The fight intensifies; abilities swing momentum.';
    const b3 = State.bullets[3].join('\n') || '• Close-quarters climax decides the field.';
    const l1 = State.losses[1].join('\n'), l2 = State.losses[2].join('\n'), l3 = State.losses[3].join('\n');
    return [
      `# ${State.AName} vs ${State.BName}`, '',
      intro, '',
      'Round 1', b1, '', (l1? 'Casualties R1:\n'+l1+'\n':''),
      'Round 2', b2, '', (l2? 'Casualties R2:\n'+l2+'\n':''),
      'Round 3', b3, '', (l3? 'Casualties R3:\n'+l3+'\n':''),
      buildOutcome()
    ].join('\n');
  }
  function showReport(){
    const pre = document.getElementById('gc-cine-pre');
    pre.textContent = compose();
    document.getElementById('gc-cine-modal').style.display = 'block';
  }
  function addButton(){
    if (document.getElementById('gc-cine-btn')) return;
    const b=document.createElement('button');
    b.id='gc-cine-btn'; b.textContent='Cinematic Report'; b.title='Open the cinematic report for the last fight';
    b.onclick=showReport; document.body.appendChild(b);
  }

  function attachBus(){
    if(!BUS || !BUS.on){ console.warn('GC bus not found; cinematic reporter idle.'); return; }
    BUS.on('turn', ({round}) => { State.round = round||State.round||1; });
    BUS.on('hit',  ({actor,target,dmg,crit}) => addBullet(State.round||1, `${actor.name} hits ${target.name}${crit?' (CRIT)':''}, dealing ${dmg}.`));
    BUS.on('miss', ({actor,target})           => addBullet(State.round||1, `${actor.name} misses as ${target.name} slips away.`));
    BUS.on('kill', ({actor,target})           => { addBullet(State.round||1, `${actor.name} drops ${target.name}.`); addLoss(State.round||1, `${target.name} KIA`); });
    BUS.on('round:end', payload => {
      if (payload.AName) { State.AName = payload.AName; State.BName = payload.BName; }
      State.last = payload;
      if (payload.round>=3 || payload.A.alive===0 || payload.B.alive===0) setTimeout(showReport, 30);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectCSS(); ensureUI(); attachBus(); addButton();
	window.gcShowLocalReport = showReport;    // or whatever function opens the local report modal
  });
})();
</script>
