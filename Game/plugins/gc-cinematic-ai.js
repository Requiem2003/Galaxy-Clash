// File: Game/plugins/gc-cinematic-ai.js
// In-browser Cinematic Storytelling AI (no server)
// Upgraded: large-name coverage + auto-tagging + rich synergies & auras

(function(){
  const g = (typeof window!=='undefined') ? window : globalThis;
  g.GC = g.GC || {};
  const BUS = g.GC.bus;

  // ----------------------------- UI -----------------------------
  const CSS = `
/* modal + card (unchanged) */
#gc-cineb-modal{position:fixed;inset:0;display:none;background:rgba(0,0,0,.65);z-index:9998}
#gc-cineb-card{position:absolute;left:50%;top:5%;transform:translateX(-50%);width:min(980px,92vw);max-height:90vh;overflow:auto;background:#0b0c10;color:#e9eef3;border-radius:14px;box-shadow:0 25px 80px rgba(0,0,0,.45);padding:22px}
#gc-cineb-card h1{margin:.1rem 0 1rem 0;font-size:1.3rem}
#gc-cineb-card pre{white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.95rem;line-height:1.35}
#gc-cineb-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-bottom:8px}
#gc-cineb-actions button{padding:.35rem .6rem;border-radius:.5rem;border:0;cursor:pointer}

/* inline group next to Start Battle */
.gc-cine-inline-group{display:inline-flex;gap:.5rem;vertical-align:middle;margin-left:.5rem}

/* button styling */
#gc-cineb-btn{padding:.4rem .6rem;border:0;border-radius:.5rem;font-weight:600}

/* fallback (only if we can’t find an anchor) */
#gc-cineb-btn.gc-cine-fallback{position:fixed;right:12px;top:92px;z-index:9999}
`;
function findBattleAnchor(){
  // Try common selectors first
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
  // Text-based fallback
  for (const el of document.querySelectorAll('button, [role="button"]')) {
    const t = (el.textContent || '').trim();
    if (/^start\b.*battle/i.test(t) || /^begin\b.*battle/i.test(t)) return el;
  }
  return null;
}

function placeCinematicButton(btn){
  const anchor = findBattleAnchor();
  if (anchor && anchor.parentElement) {
    let group = anchor.nextElementSibling;
    // Reuse existing group if our class already present
    if (!(group && group.classList && group.classList.contains('gc-cine-inline-group'))) {
      group = document.createElement('div');
      group.className = 'gc-cine-inline-group';
      anchor.insertAdjacentElement('afterend', group);
    }
    group.appendChild(btn);
    return true;
  }
  return false;
}

function placeOrObserve(btn){
  if (placeCinematicButton(btn)) return;
  // If anchor appears later (tab switch / async UI), observe DOM until found
  const mo = new MutationObserver(() => {
    if (placeCinematicButton(btn)) mo.disconnect();
  });
  mo.observe(document.body, { childList: true, subtree: true });
  // While waiting, keep a non-intrusive fallback so users can still click
  btn.classList.add('gc-cine-fallback');
  // document.body.appendChild(btn);
}
  function ui(){
  if(document.getElementById('gc-cineb-style')) return;

  // styles
  const s=document.createElement('style'); s.id='gc-cineb-style'; s.textContent=CSS; document.head.appendChild(s);

  // modal
  if(!document.getElementById('gc-cineb-modal')){
    const m=document.createElement('div'); m.id='gc-cineb-modal';
    const c=document.createElement('div'); c.id='gc-cineb-card';
    const actions=document.createElement('div'); actions.id='gc-cineb-actions';
    const copy=document.createElement('button'); copy.textContent='Copy'; copy.onclick=()=>navigator.clipboard.writeText(pre.textContent||'');
    const close=document.createElement('button'); close.textContent='Close'; close.onclick=()=>{m.style.display='none';};
    const pre=document.createElement('pre'); pre.id='gc-cineb-pre';
    const h=document.createElement('h1'); h.textContent='Cinematic Story (Browser AI)';
    actions.append(copy, close); c.append(actions, h, pre); m.appendChild(c); document.body.appendChild(m);
  }

  // button
  let b=document.getElementById('gc-cineb-btn');
  if(!b){
    b=document.createElement('button');
    b.id='gc-cineb-btn';
    b.textContent='Cinematic (Browser)';
    b.title='Generate a cinematic report using the in-browser AI';
    b.onclick=runCinematic;
  }

  // try to dock it next to Start Battle
  placeOrObserve(b);
}

  let lastRound = null;
  if(BUS && BUS.on){
    BUS.on('round:end', payload => { lastRound = payload; });
  }

  // ---------------------- Power Tiers ----------------------
  const TIERS = {
    1: { cost:120, hp:180, dmg:[32,55], acc:80, eva:20, crit:20, critMult:1.6, block:20 }, // top heroes / bosses
    2: { cost:90,  hp:150, dmg:[24,40], acc:72, eva:18, crit:16, critMult:1.5, block:16 }, // elite / named specialists
    3: { cost:45,  hp:120, dmg:[16,28], acc:64, eva:15, crit:12, critMult:1.4, block:12 }, // line troops
    4: { cost:30,  hp:105, dmg:[12,22], acc:58, eva:12, crit:10, critMult:1.35,block:10 }  // militia / fodder
  };

  // ---------------------- Known Heroes & Units (seed) ----------------------
  // We seed many big names; everything else is inferred by heuristics (below).
  const KNOWN = {
    // Sith / Dark Side
    "Darth Vader":        { tier:1, tag:"sith",    aura:"dark_presence" },
    "Emperor Palpatine":  { tier:1, tag:"sith",    aura:"terror" },
    "Darth Maul":         { tier:1, tag:"sith" },
    "Count Dooku":        { tier:1, tag:"sith" },
    "Darth Revan":        { tier:1, tag:"sith" },
    "Darth Sion":         { tier:1, tag:"sith" },
    "Darth Nihilus":      { tier:1, tag:"sith" },
    "Kylo Ren":           { tier:1, tag:"sith" },
    "Grand Inquisitor":   { tier:2, tag:"inquisitor" },
    "Snoke":              { tier:1, tag:"sith" },

    // Jedi / Light Side
    "Luke Skywalker":     { tier:1, tag:"jedi",    aura:"serenity" },
    "Mace Windu":         { tier:1, tag:"jedi",    aura:"serenity" },
    "Obi-Wan Kenobi":     { tier:1, tag:"jedi",    aura:"serenity" },
    "Ahsoka Tano":        { tier:2, tag:"jedi",    aura:"serenity" },
    "Qui-Gon Jinn":       { tier:1, tag:"jedi",    aura:"serenity" },
    "Plo Koon":           { tier:2, tag:"jedi",    aura:"serenity" },
    "Yoda":               { tier:1, tag:"jedi",    aura:"serenity" },

    // Nightsisters
    "Mother Talzin":      { tier:2, tag:"witch",   aura:"necromancy" },

    // Mandalorians / Bounty Hunters
    "Din Djarin":         { tier:2, tag:"mandalorian", aura:"beskar_tactics" },
    "Bo-Katan Kryze":     { tier:2, tag:"mandalorian", aura:"beskar_tactics" },
    "The Armorer":        { tier:2, tag:"mandalorian", aura:"beskar_tactics" },
    "Paz Vizsla":         { tier:2, tag:"mandalorian" },
    "Boba Fett":          { tier:2, tag:"bounty_hunter" },
    "Jango Fett":         { tier:2, tag:"bounty_hunter" },
    "Cad Bane":           { tier:2, tag:"bounty_hunter" },
    "Bossk":              { tier:2, tag:"bounty_hunter" },
    "Fennec Shand":       { tier:2, tag:"bounty_hunter" },

    // Clones / Troopers / Rebels / Empire
    "Captain Rex":        { tier:2, tag:"clone" },
    "Commander Cody":     { tier:2, tag:"clone" },
    "Clone Trooper":      { tier:3, tag:"clone" },
    "Stormtrooper":       { tier:3, tag:"trooper" },
    "Scout Trooper":      { tier:3, tag:"trooper" },
    "Mortar Stormtrooper":{ tier:3, tag:"trooper" },
    "Rebel Troopers":     { tier:3, tag:"rebel" },
    "Rebel Commandos":    { tier:3, tag:"commando" },
    "Royal Guard":        { tier:2, tag:"guardian" },
    "General Hux":        { tier:2, tag:"commander" },
    "Grand Admiral Thrawn": { tier:1, tag:"commander" },

    // Droids
    "Droideka":           { tier:2, tag:"droid",   aura:"shields" },
    "B1 Battledroids":    { tier:4, tag:"droid_b1" },
    "B2 Super Battle Droids": { tier:3, tag:"droid_b2" },
    "B3 Ultra Battle Droid":  { tier:2, tag:"droid_b3" },
    "ST-series Super Tactical": { tier:2, tag:"tactical_droid", aura:"droid_command" },
    "IG-11":              { tier:2, tag:"droid" },
    "IG-86 Sentinel Droids": { tier:2, tag:"droid" },
    "R2-D2":              { tier:3, tag:"droid_support" },
    "C-3PO":              { tier:4, tag:"droid_support" },

    // Rebels & Rogues
    "Saw Gerrera":        { tier:2, tag:"commander", aura:"renegade_grit" },
    "Jyn Erso":           { tier:2, tag:"rebel" },
    "Han Solo":           { tier:2, tag:"scoundrel" },
    "Chewbacca":          { tier:2, tag:"brute" },
    "Wicket":             { tier:3, tag:"ewok" },
    "Enfys Nest":         { tier:2, tag:"raider" },

    // Creatures / Others
    "Wookiee Warrior":    { tier:2, tag:"brute" },
    "Rancor":             { tier:1, tag:"beast" },
    "Tusken Raiders":     { tier:3, tag:"raider" },
    "Gungan Swordsman":   { tier:3, tag:"gungan" }
  };

  // ---------------------- Heuristics for Unknown Names ----------------------
  function tierFor(name){
    const n = name.toLowerCase();
    if (/(darth|yoda|snoke|skywalker|windu|thrawn|nihilus|plagueis)/.test(n)) return 1;
    if (/(inquisitor|bo-katan|ahsoka|mando|ezra|rex|cody|commander|fett|cad|baze|grievous|maul|kylo)/.test(n)) return 2;
    if (/(clone|storm|rebel|commando|jawas?|ewok|geonosian|tusken|wookie|scout|engineer|medic|guard|pirate)/.test(n)) return 3;
    if (/(b1|militia|raider|bandit|youngling|padawan|civilian)/.test(n)) return 4;
    return 3;
  }
  function tagFor(name){
    const n = name.toLowerCase();
    if (/darth|inquisitor|kylo|snoke|sith|palpatine|maul|dooku|nihilus|plagueis/.test(n)) return "sith";
    if (/jedi|padawan|youngling|ahsoka|obi|mace|plo|quigon|yoda|luke/.test(n)) return "jedi";
    if (/mandalorian|beskar|bo-katan|vizsla|mando|imperial super commando/.test(n)) return "mandalorian";
    if (/bounty|boba|jango|cad|bossk|fenn?ec/.test(n)) return "bounty_hunter";
    if (/clone/.test(n)) return "clone";
    if (/stormtrooper|first order trooper|imperial army trooper/.test(n)) return "trooper";
    if (/rebel|resistance/.test(n)) return "rebel";
    if (/droideka|ig-|b[123]\s*ultra|b[12]\s*super|sentinel droids|tactical/.test(n)) return "droid";
    if (/droid/.test(n)) return "droid";
    if (/nightsister|talzin/.test(n)) return "witch";
    if (/inquisitor/.test(n)) return "inquisitor";
    if (/ewok/.test(n)) return "ewok";
    if (/gungan/.test(n)) return "gungan";
    if (/wookie/.test(n)) return "brute";
    if (/commando|saboteur/.test(n)) return "commando";
    if (/scoundrel|smuggler|han/.test(n)) return "scoundrel";
    if (/beast|rancor|wampa/.test(n)) return "beast";
    return "soldier";
  }
  function auraFor(name, tag){
    const n = name.toLowerCase();
    if (tag==='sith' && /vader/.test(n)) return 'dark_presence';
    if (tag==='sith' && /palpatine|sidious|snoke/.test(n)) return 'terror';
    if (tag==='jedi') return 'serenity';
    if (tag==='mandalorian') return 'beskar_tactics';
    if (tag==='witch' || /talzin/.test(n)) return 'necromancy';
    if (/tactical/.test(n)) return 'droid_command';
    if (/droideka/.test(n)) return 'shields';
    if (/saw gerrera/.test(n)) return 'renegade_grit';
    return null;
  }

  // ---------------------- Build Unit Statlines ----------------------
  function statsFromTier(T){
    return {
      cost: T.cost, hpMax: T.hp, hp: T.hp,
      dmgMin: T.dmg[0], dmgMax: T.dmg[1],
      acc: T.acc, eva: T.eva, crit: T.crit, critMult: T.critMult, block: T.block
    };
  }
  function statLine(name){
    const known = KNOWN[name];
    const tier = TIERS[ known?.tier || tierFor(name) ];
    const tag  = known?.tag || tagFor(name);
    const aura = known?.aura || auraFor(name, tag);
    return { name, tag, aura, ...statsFromTier(tier) };
  }

  // ---------------------- RNG ----------------------
  function xfnv1a(str){ let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619);} return h>>>0; }
  function mulberry32(seed){ let s=seed>>>0; return function(){ s += 0x6D2B79F5; let t=Math.imul(s^(s>>>15),1|s); t^=t+Math.imul(t^(t>>>7),61|t); return ((t^(t>>>14))>>>0)/4294967296; }; }
  let R = { next:Math.random, chance:(p)=>Math.random()<p, between:(a,b)=>a+(b-a)*Math.random(), pick:(arr)=>arr[(Math.random()*arr.length)|0]||arr[0] };
  function reseed(s){
    const r = mulberry32(s);
    R = {
      next: r,
      chance: (p)=> r() < p,
      between: (a,b)=> a+(b-a)*r(),
      pick: (arr)=> arr[(r()*arr.length)|0] || arr[0]
    };
  }

  // ---------------------- Team Build ----------------------
  // NEW: build from live selection in the left panel
function teamsFromPLAYERS(){
  const P = (window.PLAYERS || []);
  if(!Array.isArray(P) || P.length < 2) return null;

  const AName  = P[0]?.name || "Team A";
  const BName  = P[1]?.name || "Team B";
  const AUnits = (P[0]?.picks || []).map(u => statLine(u.name));
  const BUnits = (P[1]?.picks || []).map(u => statLine(u.name));

  if (!AUnits.length || !BUnits.length) return null;

  return {
    A: { name: AName, units: AUnits, morale: 100 },
    B: { name: BName, units: BUnits, morale: 100 }
  };
}
  function buildTeamsFromLast(){
    const AName = lastRound?.AName || "Team A";
    const BName = lastRound?.BName || "Team B";
    const AUnits = (lastRound?.AUnits || []).map(String);
    const BUnits = (lastRound?.BUnits || []).map(String);
    if(!AUnits.length || !BUnits.length) return null;
    return {
      A: { name:AName, units:AUnits.map(statLine), morale:100 },
      B: { name:BName, units:BUnits.map(statLine), morale:100 }
    };
  }
  function promptTeams(){
    const AName = prompt("Team A name:", "Vader's Fist") || "Team A";
    const BName = prompt("Team B name:", "Saw's Renegades") || "Team B";
    const AUnits = (prompt("Team A units (comma-separated):", "Darth Vader, Emperor Palpatine, Stormtrooper, Stormtrooper")||"")
                    .split(",").map(s=>s.trim()).filter(Boolean);
    const BUnits = (prompt("Team B units (comma-separated):", "Saw Gerrera, Clone Trooper, Clone Trooper, Mother Talzin")||"")
                    .split(",").map(s=>s.trim()).filter(Boolean);
    if(!AUnits.length || !BUnits.length) return null;
    return {
      A: { name:AName, units:AUnits.map(statLine), morale:100 },
      B: { name:BName, units:BUnits.map(statLine), morale:100 }
    };
  }
  function totalCost(team){ return team.units.reduce((a,u)=>a+(u.cost||0),0); }
  function alive(units){ return units.filter(u=>u.hp>0); }

  // ---------------------- Auras & Synergies ----------------------
  function applyAuras(A, B){
    // Sith fear: enemy accuracy -10
    if(A.units.some(u=>u.aura==='dark_presence')) B.units.forEach(t=> t.acc = Math.max(30, t.acc - 10));
    if(B.units.some(u=>u.aura==='dark_presence')) A.units.forEach(t=> t.acc = Math.max(30, t.acc - 10));

    // Terror (Palpatine/Snoke): morale drip each round
    A._terror = A.units.some(u=>u.aura==='terror');
    B._terror = B.units.some(u=>u.aura==='terror');

    // Jedi serenity: allies +3 eva, +2 morale buffer
    if(A.units.some(u=>u.aura==='serenity')) A.units.forEach(t=> { t.eva += 3; }); A._serene = A.units.some(u=>u.aura==='serenity');
    if(B.units.some(u=>u.aura==='serenity')) B.units.forEach(t=> { t.eva += 3; }); B._serene = B.units.some(u=>u.aura==='serenity');

    // Mandalorians: beskar tactics (allies +3 block, +2 crit)
    if(A.units.some(u=>u.aura==='beskar_tactics')) A.units.forEach(t=> { t.block += 3; t.crit += 2; });
    if(B.units.some(u=>u.aura==='beskar_tactics')) B.units.forEach(t=> { t.block += 3; t.crit += 2; });

    // Clones near Jedi/Sith: +4 acc, +3 crit
    const AHasForce = A.units.some(u=>/jedi|sith|witch|inquisitor/.test(u.tag));
    const BHasForce = B.units.some(u=>/jedi|sith|witch|inquisitor/.test(u.tag));
    if(AHasForce) A.units.forEach(t=> { if(t.tag==='clone') { t.acc+=4; t.crit+=3; }});
    if(BHasForce) B.units.forEach(t=> { if(t.tag==='clone') { t.acc+=4; t.crit+=3; }});

    // Tactical droid commands B-series: +6 acc & +4 block to B1/B2/B3
    if(A.units.some(u=>u.aura==='droid_command')) A.units.forEach(t=> { if(/droid_b[123]/.test(t.tag)||t.tag==='droid') { t.acc+=6; t.block+=4; }});
    if(B.units.some(u=>u.aura==='droid_command')) B.units.forEach(t=> { if(/droid_b[123]/.test(t.tag)||t.tag==='droid') { t.acc+=6; t.block+=4; }});

    // Droideka shields: first two hits reduced heavily
    A._shielded = A.units.filter(u=>u.aura==='shields').map(()=>2).reduce((a,x)=>a+x,0); // count total shield charges
    B._shielded = B.units.filter(u=>u.aura==='shields').map(()=>2).reduce((a,x)=>a+x,0);

    // Nightsister revive
    A._canRevive = A.units.some(u=>u.aura==='necromancy');
    B._canRevive = B.units.some(u=>u.aura==='necromancy');

    // Rebel leadership: commanders give +1 eva & +1 crit to rebels/commandos/scoundrels
    if(A.units.some(u=>u.tag==='commander')) A.units.forEach(t=> { if(/rebel|commando|scoundrel/.test(t.tag)) { t.eva+=1; t.crit+=1; }});
    if(B.units.some(u=>u.tag==='commander')) B.units.forEach(t=> { if(/rebel|commando|scoundrel/.test(t.tag)) { t.eva+=1; t.crit+=1; }});
  }

  // Nightsister revive
  function maybeRevive(team){
    if(!team._canRevive) return false;
    const deadPool = team._grave || [];
    if(!deadPool.length) return false;
    if(!R.chance(0.5)) return false;
    const who = deadPool.pop();
    who.hp = Math.round(who.hpMax*0.5);
    team.units.push(who);
    team._revived = (team._revived||0)+1;
    if(team._revived >= 1) team._canRevive = false;
    return true;
  }

  // -------------------------- Combat Core --------------------------
  function rollHit(a, t){
    const pct = Math.max(15, Math.min(95, a.acc - Math.round(t.eva*0.6)));
    return R.chance(pct/100);
  }
  function rollCrit(a){ return R.chance(Math.min(95, a.crit)/100); }
  function rollDmg(a){ return Math.round(R.between(a.dmgMin, a.dmgMax)); }

  function shieldReduce(team, raw){
    // use a shared pool for simplicity: any droideka presence soaks two heavy hits per round
    if((team===undefined) || raw<=0) return raw;
    const key = team === _A ? '_shielded' : '_shielded'; // placeholder; handled in applyDamage via team flag
    return raw;
  }

  function applyDamage(target, dmg){
    const reduced = Math.max(1, Math.round(dmg - target.block*0.35));
    target.hp -= reduced; return reduced;
  }

  function describeStrike(a, t, dmg, crit, gore){
    const places=["the dune ridge","a shattered durasteel wall","a crashed walker","the gantry","the hangar mouth","the rubble line"];
    const hits  =["center mass","the visor","the ribcage","the servo joint","the abdomen","the pauldron gap"];
    const base  = `${a.name} rakes ${t.name} at ${R.pick(hits)} by ${R.pick(places)} for ${dmg}${crit?' (CRIT)':''}.`;
    if(gore==='off') return base;
    if(gore==='cinematic') return base + (crit?" Sparks flare at impact.":" Dust plumes from the hit.");
    const goreLines=["Bone splinters in a wet crack.","Carbon scoring blacks the wound.","Blood mists over the stones.","Armor peels with a metal shriek.","Viscera strings before slapping stone."];
    return base + ' ' + R.pick(goreLines);
  }

  function pickTarget(actor, foes){
    const choices = alive(foes);
    if(!choices.length) return null;
    const weights = choices.map(t=>{
      const threat = (t.dmgMax + t.acc + t.crit)/100;
      const low    = 1 - (t.hp/t.hpMax);
      const bias   = (t.tag==='commander'||t.tag==='sith'||t.tag==='jedi') ? 1.2 : 1.0;
      return Math.max(0.05, bias*(0.65*threat + 0.6*low));
    });
    const sum = weights.reduce((a,b)=>a+b,0);
    let r = R.next()*sum;
    for(let i=0;i<choices.length;i++){ r -= weights[i]; if(r<=0) return choices[i]; }
    return choices[0];
  }

  function supportIfAny(actor, team, log){
    const friends = alive(team.units);
    if(friends.length <= 1) return false;
    const low = friends.slice().sort((a,b)=> (a.hp/a.hpMax)-(b.hp/b.hpMax))[0];
    if(low.hp/low.hpMax > 0.6) return false;
    if(!R.chance(0.18)) return false;
    const heal = Math.round(10 + (actor.crit*0.5));
    low.hp = Math.min(low.hpMax, low.hp + heal);
    log.push(`✚ ${actor.name} stabilizes ${low.name}, restoring ${heal}.`);
    return true;
  }

  function onKill(actor, target, A, B, log, gore){
    target.hp = 0;
    const team = (A.units.includes(target) ? A : B);
    team._grave = team._grave || [];
    team._grave.push(target);
    const enemy = (team===A?B:A);

    // Wookiee roar = ally morale bump on kill
    if(actor.tag==='brute') { (team.morale = Math.min(150, team.morale+3)); }

    const swing = Math.max(6, Math.round(4 + (target.cost||1)*2));
    team.morale  = Math.max(0, team.morale - swing);
    enemy.morale = Math.min(150, enemy.morale + Math.round(swing/2));
    log.push('☠ ' + (gore==='graphic'
      ? `${target.name} is pulped; ${team.name} buckle (-${swing} morale).`
      : `${target.name} goes down; ${team.name} reel (-${swing} morale).`));
  }

  function takeTurn(actor, A, B, log, gore){
    const foeTeam = A.units.includes(actor) ? B : A;
    const allyTeam= A.units.includes(actor) ? A : B;
    if(supportIfAny(actor, allyTeam, log)) return;
    const target = pickTarget(actor, foeTeam.units); if(!target) return;
    if(!rollHit(actor, target)){ log.push(`🌀 ${actor.name} whiffs as ${target.name} slips the attack.`); return; }
    let dmg = rollDmg(actor); const crit = rollCrit(actor); if(crit) dmg = Math.round(dmg*actor.critMult);

    // Droideka shield soak: first 2 hits per team per round are heavily reduced
    const enemyTeam = foeTeam;
    if(enemyTeam._shieldCharges>0){
      const soaked = Math.max(1, Math.round(dmg*0.35));
      enemyTeam._shieldCharges -= 1;
      dmg = soaked;
      log.push(`🔰 Shields flare and collapse under the barrage.`);
    }

    const applied = applyDamage(target, dmg);
    log.push('⚔ ' + describeStrike(actor, target, applied, crit, gore));
    if(target.hp<=0) onKill(actor, target, A, B, log, gore);
  }

  function routed(team){ return team.morale<=12 || alive(team.units).length===0; }

  // --------------------- Round Loop + Narrative ---------------------
  function roundSim(A, B, round, gore, bullets, losses){
    // reset droideka shields (team-wide) each round
    A._shieldCharges = A.units.some(u=>u.aura==='shields') ? 2 : 0;
    B._shieldCharges = B.units.some(u=>u.aura==='shields') ? 2 : 0;

    const order = [...alive(A.units), ...alive(B.units)]
      .sort(()=> R.next() - 0.5);
    const log = [];
    for(const actor of order){
      if(routed(A)||routed(B)) break;
      takeTurn(actor, A, B, log, gore);
    }

    // Terror drip
    if(A._terror) B.morale = Math.max(0, B.morale - 3);
    if(B._terror) A.morale = Math.max(0, A.morale - 3);

    // Record bullets (3-5 lines max)
    bullets.push(...log.slice(0,5));

    // Losses summary for this round
    const aDead = (A._grave||[]).filter(u=>u.hp===0 && !(A._graveCounted||new Set()).has?.(u));
    const bDead = (B._grave||[]).filter(u=>u.hp===0 && !(B._graveCounted||new Set()).has?.(u));
    A._graveCounted = A._graveCounted || new Set(); B._graveCounted = B._graveCounted || new Set();
    if(aDead.length){ losses.push(`${A.name}: ${aDead.length} down (${aDead.map(u=>u.name).join(', ')})`); aDead.forEach(u=>A._graveCounted.add(u)); }
    if(bDead.length){ losses.push(`${B.name}: ${bDead.length} down (${bDead.map(u=>u.name).join(', ')})`); bDead.forEach(u=>B._graveCounted.add(u)); }
  }

  function preBattleText(A, B){
    function strengths(team){
      const s=[];
      if(team.units.some(u=>/sith|inquisitor/.test(u.tag))) s.push("fear & battlefield control");
      if(team.units.some(u=>/jedi/.test(u.tag))) s.push("deflection & calm under fire");
      if(team.units.some(u=>/clone|trooper/.test(u.tag))) s.push("steady ranged fire");
      if(team.units.some(u=>/mandalorian/.test(u.tag))) s.push("beskar armor & brutal skirmishing");
      if(team.units.some(u=>/droid/.test(u.tag))) s.push("relentless mechanical advance");
      if(team.units.some(u=>/commander/.test(u.tag))) s.push("field leadership & cohesion");
      if(team.units.some(u=>/witch/.test(u.tag))) s.push("dark magic & recovery");
      return s.length?s.join('; '):'mixed capabilities';
    }
    function weaknesses(team){
      const w=[];
      if(team.units.length<=3) w.push("thin numbers / over-reliance on leaders");
      if(team.units.every(u=>u.tag==='soldier')) w.push("lack of specialists");
      return w.length?w.join('; '):'few obvious weaknesses';
    }
    return [
      `${A.name} enters the fray with ${strengths(A)}. However, they may suffer from ${weaknesses(A)}.`,
      `${B.name} enters the fray with ${strengths(B)}. However, they may suffer from ${weaknesses(B)}.`
    ].join('\n');
  }

  function composeReport(cfg, A, B, rounds, gore){
    const titleSpots = [
      "Fog-Shrouded Ruins Of An Ancient Temple",
      "Lava-Scored Gantries Of The Foundry",
      "Storm-Lit Graveyard Of Walkers",
      "Cracked Durasteel Plaza On Kuat"
    ];
    const battlefield = {
      location: cfg?.battlefield?.location || R.pick(titleSpots),
      weather:  cfg?.battlefield?.weather  || "torrential rain under flashes of lightning",
      terrain:  cfg?.battlefield?.terrain  || "broken cover and treacherous footing"
    };

    function rosterBlock(team){
      const cost = totalCost(team);
      const lines = team.units.map(u=>{
        const tier = Object.keys(TIERS).find(k=>TIERS[k].cost===u.cost) || '?';
        return `  - ${u.name} (Tier ${tier}, ${u.cost} pts)`;
      });
      return `**${team.name}** (Total: ${cost} pts)\n${lines.join('\n')}`;
    }

    const pre = [
      `On a ${battlefield.weather}, forces assemble at ${battlefield.location}. The terrain consists of ${battlefield.terrain}. Visibility is poor, and every shadow could hide an enemy.`,
      '', 'Team Rosters:', '', rosterBlock(A), '', rosterBlock(B), '', 'Pre-Battle Analysis:', preBattleText(A,B), ''
    ].join('\n');

    const out = [ `# The Battle of ${battlefield.location}`, '', pre ];
    for(let r=1;r<=3;r++){
      const bullets = rounds[r]?.bullets || [];
      const losses  = rounds[r]?.losses || [];
      out.push(`* Round ${r}`);
      if(!bullets.length) out.push('* Skirmish lines form; probing fire traded.');
      else bullets.forEach(b=> out.push(`* ${b}`));
      if(losses.length) out.push(`* Casualties this round: ${losses.join(' | ')}`);
      out.push(''); // space
    }

    const aSurv = alive(A.units).map(u=>u.name);
    const bSurv = alive(B.units).map(u=>u.name);
    out.push('Casualties & Survivors:');
    out.push(`Survivors for ${A.name}: ${aSurv.length? aSurv.join(', ') : 'None.'}`);
    out.push(`Survivors for ${B.name}: ${bSurv.length? bSurv.join(', ') : 'None.'}`);

    const aAlive = aSurv.length, bAlive = bSurv.length;
    let winner = (aAlive>bAlive) ? A.name : (bAlive>aAlive) ? B.name : (A.morale>=B.morale? A.name : B.name);
    out.push('', `Winner: **${winner}**`);
    const recap = (winner===A.name)
      ? `In the end, ${A.name} prevailed over ${B.name}. While ${B.name} fought bravely, ${A.name}'s remaining fighters outlasted their foes.`
      : `In the end, ${B.name} prevailed over ${A.name}. While ${A.name} fought bravely, ${B.name}'s remaining fighters outlasted their foes.`;
    out.push(recap);

    return out.join('\n');
  }

function simulate(cfg, gore='graphic'){
  // 1) Prefer live teams from UI
  let teams = teamsFromPLAYERS();

  // 2) Fallback: if a battle just ran and the engine emitted names/units, use that
  if(!teams){
    teams = buildTeamsFromLast();
  }

  // 3) If still nothing, don’t prompt — just tell the user what to do
  if(!teams){
    const msg = 'Select two players and add units to each team first.';
    if (window.gcToast) window.gcToast(msg, 1600, 'warn'); else alert(msg);
    throw new Error(msg);
  }

  // Deterministic seed based on the roster
  const seed = xfnv1a([
    teams.A.name, ...teams.A.units.map(u=>u.name),
    '|',
    teams.B.name, ...teams.B.units.map(u=>u.name)
  ].join('|'));
  reseed(seed);

  applyAuras(teams.A, teams.B);

  const rounds = { 1:{bullets:[],losses:[]}, 2:{bullets:[],losses:[]}, 3:{bullets:[],losses:[]} };

  for(let r=1;r<=3;r++){
    // Optional revive moments
    if(teams.A._canRevive && R.chance(0.15)) { if(maybeRevive(teams.A)) rounds[r].bullets.push('Mother Talzin whispers in thorned tongues—cold lungs shudder; a corpse lurches back to the line.'); }
    if(teams.B._canRevive && R.chance(0.15)) { if(maybeRevive(teams.B)) rounds[r].bullets.push('Night-sorcery crackles. Strings of shadow lever a fallen fighter upright.'); }

    roundSim(teams.A, teams.B, r, gore, rounds[r].bullets, rounds[r].losses);
    if(teams.A.morale<=12 || teams.B.morale<=12) break; // rout check
  }

  return composeReport(cfg, teams.A, teams.B, rounds, gore);
}


  async function runCinematic(){
    try{
      const report = simulate({
        battlefield: lastRound?.battlefield || {
          location: "fog-shrouded ruins of an ancient temple",
          weather:  "torrential rain under flashes of lightning",
          terrain:  "thick jungle overgrowth and crumbling stone"
        }
      }, 'graphic'); // gore: 'off' | 'cinematic' | 'graphic'
      document.getElementById('gc-cineb-pre').textContent = report;
      document.getElementById('gc-cineb-modal').style.display = 'block';
    }catch(err){
      const msg = (err && err.message) ? err.message : String(err||'Unknown error');
      document.getElementById('gc-cineb-pre').textContent = 'Error: ' + msg;
      document.getElementById('gc-cineb-modal').style.display = 'block';
    }
  }
  document.addEventListener('DOMContentLoaded', ui);

  // ✅ expose the runner so other scripts (Begin Battle) can call it
  (typeof window !== 'undefined' ? window : globalThis).gcRunCinematic = runCinematic;
})();