// File: Game/plugins/gc-battle.js
// Purpose: Deterministic, evented version of the text battle engine. Backward compatible.
(function(){
  const g = (typeof window!=='undefined') ? window : globalThis;
  const BUS = g.GC && g.GC.bus;
  const SAVE = g.GC && g.GC.save;

  // Why: stable, reproducible results for the same teams; no global GC.random mutation.
  function xfnv1a(str){ let h = 2166136261 >>> 0; for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(seed){ let s = seed >>> 0; return function(){ s += 0x6D2B79F5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // --- Safe shims to match baseline helpers ---
  const clamp = g.clamp || ((x)=> Math.max(10, Math.min(99, Math.round(x))));
  const dName = g.displayName || ((n)=> String(n||'').replace(/\s*\(.*/, '').trim());
  const tagOf  = g.tagFromName || ((n)=>'special');
  const log    = g.log || ((t)=> console.log(t));

  // Compact text helpers
  function fmtPct(x){ return Math.round(x*100) + '%'; }

  // --- Stat model mapping (derived from computeStats/effectiveStats) ---
  function toCombatStats(unit, team){
    const base = (g.Auras && g.Auras.effectiveStats) ? g.Auras.effectiveStats(unit, team)
                                                     : g.computeStats(unit);
    const ATK = base.attack, DEF = base.defense, CTRL= base.control, MOB = base.mobility, SUP = base.support, SUR = base.survivability;
    const hpMax     = Math.round(80 + SUR*1.3 + DEF*0.8);
    const damageMin = Math.round(8 + ATK*0.55);
    const damageMax = Math.round(damageMin * (1.25 + ATK/200));
    const accuracy  = clamp(55 + CTRL*0.35);
    const evasion   = clamp(5  + MOB*0.25);
    const critPct   = clamp(7  + CTRL*0.20 + ATK*0.05);
    const critMult  = 1.35 + (ATK/140);
    const block     = clamp(3  + DEF*0.22);
    const support   = SUP;
    return { base, hpMax, damageMin, damageMax, accuracy, evasion, critPct, critMult, block, support,
             tag: base.tag || tagOf(unit.name) };
  }

  function makeFighter(unit, team){
    const cs = toCombatStats(unit, team);
    return { name: dName(unit.name), rawName: String(unit.name||''), cost: unit.cost||0, tag: cs.tag,
             stats: cs, hp: cs.hpMax, alive: true, cooldown: 0, focus: 0, shield: 0 };
  }

  function teamFromPlayer(p){
    const fighters = p.picks.map(u => makeFighter(u, p.picks));
    return { name: p.name, rawPicks: p.picks, units: fighters, morale: 100 };
  }

  function aliveUnits(team){ return team.units.filter(u=>u.alive); }
  function totalHP(team){ return team.units.reduce((a,u)=> a + (u.alive?(u.hp+u.shield):0), 0); }
  function totalPower(team){ return team.units.reduce((a,u)=> a + (u.alive? (u.cost||1) : 0), 0); }

  // All RNG is injected via `R()` after seeding for a battle
  let R = { next: Math.random, between: (min,max)=> min + (max-min)*Math.random(), pick: (arr)=> arr[(Math.random()*arr.length)|0]||arr[0], chance: (p)=> Math.random() < p };

  function seedFromTeams(P1, P2, gore){
    const s = [gore||'cin', P1.name, ...P1.picks.map(u=>u.name+'#'+(u.cost||0)), '|', P2.name, ...P2.picks.map(u=>u.name+'#'+(u.cost||0))].join('|');
    return xfnv1a(s);
  }

  function reseed(seed){
    const rnd = mulberry32(seed);
    R = {
      next: rnd,
      between: (min,max)=> min + (max-min)*rnd(),
      pick: (arr)=> arr[(rnd()*arr.length)|0] || arr[0],
      chance: (p)=> rnd() < p
    };
  }

  function pickTarget(actor, enemyTeam){
    const candidates = aliveUnits(enemyTeam);
    if(!candidates.length) return null;
    const weights = candidates.map(t => {
      const wThreat = (t.stats.damageMax + t.stats.accuracy + t.stats.critPct)/100;
      const wLowHP  = (t.hp + t.shield) / t.stats.hpMax;
      const bias = (t.tag==='commander')? 1.25 : 1.0;
      return Math.max(0.05, bias * (0.65*wThreat + 0.6*(1-wLowHP)));
    });
    const sum = weights.reduce((a,b)=>a+b,0);
    let r = R.next()*sum;
    for(let i=0;i<candidates.length;i++){ r -= weights[i]; if(r<=0) return candidates[i]; }
    return candidates[0];
  }

  function rollHit(actor, target){
    const acc = actor.stats.accuracy + actor.focus*3;
    const eva = target.stats.evasion;
    const hitPct = clamp(acc - eva*0.6);
    return R.chance(hitPct/100);
  }

  function rollCrit(actor){ return R.chance(actor.stats.critPct/100); }
  function rollDamage(actor){ return Math.round(R.between(actor.stats.damageMin, actor.stats.damageMax)); }

  function maybeSupport(actor, team){
    const allies = aliveUnits(team);
    if(allies.length<=1) return false;
    const low = allies.filter(a => (a.hp + a.shield) < a.stats.hpMax*0.55);
    if(!low.length) return false;
    const urge = 0.18 + (actor.stats.support/200);
    if(!R.chance(urge)) return false;
    const target = low.sort((a,b)=> (a.hp+a.shield)/a.stats.hpMax - (b.hp+b.shield)/b.stats.hpMax)[0];
    const base = Math.round(10 + actor.stats.support*0.9);
    if(actor.tag==='commander' || actor.tag==='jedi'){
      const val = Math.round(base*0.7); target.shield += val; log(`🛡️  ${actor.name} throws a shield over ${target.name}, absorbing ${val}.`);
      BUS && BUS.emit && BUS.emit('support', { type:'shield', actor, target, val });
    }else{
      target.hp = Math.min(target.stats.hpMax, target.hp + base); log(`✚  ${actor.name} stabilizes ${target.name}, restoring ${base} HP.`);
      BUS && BUS.emit && BUS.emit('support', { type:'heal', actor, target, val: base });
    }
    actor.focus = Math.min(5, actor.focus + 1);
    return true;
  }

  function applyDamage(target, dmg){
    let remaining = dmg;
    if(target.shield>0){ const s = Math.min(target.shield, remaining); target.shield -= s; remaining -= s; }
    const reduced = Math.max(1, Math.round(remaining - target.stats.block*0.4));
    target.hp -= reduced;
    return reduced;
  }

  function describeStrike(actor, target, dmg, crit, gore){
    const places=["the dune ridge","a shattered durasteel wall","a crashed walker","the lava flats","the hangar mouth","the gantry edge"];
    const verbs =["rakes","slashes","hammers","lances","buries shots into","catches" ];
    const hits  =["center mass","the visor","the ribcage","the servo joint","the abdomen","the pauldron gap"];
    const where = R.pick(places), v=R.pick(verbs), h=R.pick(hits);
    const base  = `${actor.name} ${v} ${target.name} at ${h} near ${where} for ${dmg}${crit?" (CRIT)":""}.`;
    if(gore==='off') return base;
    if(gore==='cinematic') return base + (crit?" Sparks flare as the blow lands true.":" Dust kicks up from the impact.");
    const goreLines=["Bone splinters; a wet gasp follows.","A spray of carbon scoring rings the wound.","Blood fans across the ground in a hot mist.","Armor peels with a sick metallic shriek.","Viscera strings in the air before slapping stone."];
    return base + ' ' + R.pick(goreLines);
  }

  function onKill(actor, target, enemyTeam, allyTeam, gore){
    target.alive=false; target.hp=0; target.shield=0;
    const swing = Math.max(6, Math.round(4 + (target.cost||1)*2));
    enemyTeam.morale = Math.max(0, enemyTeam.morale - swing);
    allyTeam.morale  = Math.min(150, allyTeam.morale + Math.round(swing/2));
    const lines = { off: `${target.name} collapses; ${enemyTeam.name} stagger (-${swing} morale).`,
                    cinematic: `${target.name} goes down hard; ${enemyTeam.name} reels (-${swing} morale).`,
                    graphic: `${target.name} is pulped; ${enemyTeam.name}'s line buckles (-${swing} morale).` };
    log('☠️  ' + lines[gore]);
    BUS && BUS.emit && BUS.emit('kill', { actor, target, swing });
  }

  function initiativeOrder(allUnits){
    // Why: tiny spread keeps initiative interesting but reproducible.
    return [...allUnits].sort((a,b)=> (b.stats.accuracy + b.stats.evasion*0.5 + R.between(0,8)) - (a.stats.accuracy + a.stats.evasion*0.5 + R.between(0,8)));
  }

  function takeTurn(actor, allyTeam, enemyTeam, gore){
    if(!actor.alive) return;
    if(maybeSupport(actor, allyTeam)) return;
    const target = pickTarget(actor, enemyTeam); if(!target) return;
    if(!rollHit(actor, target)){
      log(`🌀  ${actor.name} whiffs as ${target.name} slips the attack.`); actor.focus = Math.min(5, actor.focus + 1); BUS && BUS.emit && BUS.emit('miss', { actor, target }); return;
    }
    let dmg = rollDamage(actor); const crit = rollCrit(actor);
    if(crit){ dmg = Math.round(dmg * actor.stats.critMult); actor.focus = 0; } else { actor.focus = Math.min(4, actor.focus + 1); }
    const applied = applyDamage(target, dmg);
    log('⚔️  ' + describeStrike(actor, target, applied, crit, gore));
    BUS && BUS.emit && BUS.emit('hit', { actor, target, dmg: applied, crit });
    if(target.hp<=0 && target.alive){ onKill(actor, target, enemyTeam, allyTeam, gore); }
  }

  function routed(team){ return team.morale<=12 || aliveUnits(team).length===0; }

  function roundSim(teams, round, gore){
    const [A,B] = teams; const all = [...aliveUnits(A), ...aliveUnits(B)]; if(!all.length){ log('Both sides are spent; only echoes remain.'); return { ticks: 0 }; }
    log(`— ROUND ${round} —`);
    let ticks = 0;
    while(!routed(A) && !routed(B) && ticks < 40){
      ticks++;
      const order = initiativeOrder([...aliveUnits(A), ...aliveUnits(B)]);
      for(const actor of order){
        const allyTeam  = A.units.includes(actor) ? A : B;
        const enemyTeam = allyTeam===A ? B : A;
        BUS && BUS.emit && BUS.emit('turn', { round, actor });
        takeTurn(actor, allyTeam, enemyTeam, gore);
        if(routed(A) || routed(B)) break;
      }
    }
    const aAlive=aliveUnits(A).length, bAlive=aliveUnits(B).length; const aHP=totalHP(A), bHP=totalHP(B);
    log(`⏱️  Round ${round} ends after ${ticks} ticks.`);
    log(`   ${A.name}: ${aAlive} alive, ${aHP} total HP, morale ${A.morale}`);
    log(`   ${B.name}: ${bAlive} alive, ${bHP} total HP, morale ${B.morale}`);
    if(routed(A) && !routed(B)) log(`➡️  ${B.name} drives ${A.name} back.`);
    else if(routed(B) && !routed(A)) log(`➡️  ${A.name} overwhelms ${B.name}.`);
    else if(aHP>bHP) log(`➡️  ${A.name} edges out control of the field.`);
    else if(bHP>aHP) log(`➡️  ${B.name} edges out control of the field.`);
    else log(`➡️  Stalemate—the front lines hold.`);
    log('');
    BUS && BUS.emit && BUS.emit('round:end', {
  AName: A.name, BName: B.name,
  // Prefer full roster at start of battle:
  // AUnits: (A.rawPicks||[]).map(u=>u.name),
  // BUnits: (B.rawPicks||[]).map(u=>u.name),
  // Or survivors-only each round:
  AUnits: aliveUnits(A).map(u => u.rawName || u.name),
  BUnits: aliveUnits(B).map(u => u.rawName || u.name),

  round, ticks,
  A: { alive: aAlive, hp: aHP, morale: A.morale },
  B: { alive: bAlive, hp: bHP, morale: B.morale }
});

    return { ticks };
  }

  function declareOutcome(teams){
    const [A,B] = teams; const aAlive=aliveUnits(A).length, bAlive=aliveUnits(B).length; const aHP=totalHP(A), bHP=totalHP(B); const aPow=totalPower(A), bPow=totalPower(B);
    log('— OUTCOME —');
    if(aAlive===0 && bAlive===0){ log('Draw: both forces annihilated.'); return { winner:null, reason:'mutual annihilation' }; }
    if(aAlive>0 && bAlive===0){ log(`${A.name} wins by rout.`); return { winner:A.name, reason:'rout' }; }
    if(bAlive>0 && aAlive===0){ log(`${B.name} wins by rout.`); return { winner:B.name, reason:'rout' }; }
    const aScore = aHP + aPow*25 + A.morale*2; const bScore = bHP + bPow*25 + B.morale*2;
    if(aScore>bScore){ log(`Result: ${A.name} claims the field.`); return { winner:A.name, reason:'score', scores:{A:aScore,B:bScore} }; }
    if(bScore>aScore){ log(`Result: ${B.name} claims the field.`); return { winner:B.name, reason:'score', scores:{A:aScore,B:bScore} }; }
    log('Result: Draw — shattered remnants on both sides.'); return { winner:null, reason:'draw', scores:{A:aScore,B:bScore} };
  }

  // Public hook: override the existing button handler (back‑compat)
  g.runBattle = function(){
    if(!g.PLAYERS || g.PLAYERS.length<2){ alert('Add two players first.'); return; }
    const gore = (document.getElementById('gore')||{}).value || 'cinematic';
    const players = JSON.parse(JSON.stringify(g.PLAYERS));
    const P1 = players[0], P2 = players[1];

    // Seed once per battle for determinism based on teams + gore
    const seed = seedFromTeams(P1, P2, gore);
    reseed(seed);
    if(g.GC && g.GC.random && typeof g.GC.random.setSeed === 'function'){ g.GC.random.setSeed(seed); } // why: visible seed for other systems

    g.clearLog && g.clearLog();
    log('GALAXY CLASH — Text Battle Simulation');

    const teams = [teamFromPlayer(P1), teamFromPlayer(P2)];

    // Pre-battle reveals
    const leaderNames = (g.Auras && g.Auras.leadersOnTeam) ? [ g.Auras.leadersOnTeam(P1.picks).map(a=>a.leader), g.Auras.leadersOnTeam(P2.picks).map(a=>a.leader) ] : [[],[]];
    log(`Sides: ${teams[0].name} vs ${teams[1].name}`);
    log(`${teams[0].name} fields ${aliveUnits(teams[0]).length} units` + (leaderNames[0].length? ` (Leaders: ${leaderNames[0].join(', ')})` : ''));
    log(`${teams[1].name} fields ${aliveUnits(teams[1]).length} units` + (leaderNames[1].length? ` (Leaders: ${leaderNames[1].join(', ')})` : ''));
    log('');

    BUS && BUS.emit && BUS.emit('battle:start', { seed, teams: teams.map(t=>({ name:t.name, count:t.units.length })) });

    for(let r=1;r<=3;r++) roundSim(teams, r, gore);
    const outcome = declareOutcome(teams);

    const summary = { seed, gore, A: { name: teams[0].name, hp: totalHP(teams[0]), morale: teams[0].morale, alive: aliveUnits(teams[0]).length },
                      B: { name: teams[1].name, hp: totalHP(teams[1]), morale: teams[1].morale, alive: aliveUnits(teams[1]).length }, outcome };

    SAVE && typeof SAVE.set==='function' && SAVE.set('battle.last', summary);
    BUS && BUS.emit && BUS.emit('battle:end', summary);
    return summary;
  };

  // Optional: expose an API for testing
  g.Battle = { toCombatStats, makeFighter, teamFromPlayer, roundSim, declareOutcome };
})();