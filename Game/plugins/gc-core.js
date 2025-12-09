// === GC Core Bundle (Portraits + Leaders/Auras + Leader Badge) ===

// --- Begin GC_Portraits.js ---
/* 
GC_Portraits_EasyEdit.js
---------------------------------
Purpose:
  Make it simple to edit per-character portrait paths without touching complex code.

How to use:
  1) Edit the 'PORTRAIT_OVERRIDES' array below. Each entry looks like:
     { name: "Character Name", file: "portraits/Filename.ext", aliases: ["Alt Name 1", "Alt Name 2"] }

  2) Save this file next to your HTML and include it BEFORE </body>:
     <script src="GC_Portraits_EasyEdit.js"></script>

  3) Optional editor:
     Press ALT+P in the game to open a small Portrait Editor panel.
     - Search/select a character, change its 'file' path, add aliases, and Save.
     - Export JSON/CSV or Import JSON to bulk edit mappings.
     - Changes save to localStorage immediately and take effect on refresh.

Notes:
  - We map both exact names and normalized names (letters+digits only).
  - Manual overrides here take precedence over anything else.
  - A fuzzy fallback tries to match near-miss names (e.g., typos).
*/

(function(){
  // ====== 1) EDIT HERE: per-character overrides ======
  const PORTRAIT_OVERRIDES = [
    { name: "Aayla Secura", file: "portraits/Aayla-Secura.jpeg", aliases: ["Aayla-Secura", "Aayla_Secura"] },
    { name: "Admiral Akbar", file: "portraits/Admiral Akbar.jpg", aliases: ["Admiral-Akbar", "Admiral_Akbar"] },
    { name: "Ahsoka", file: "portraits/Ahsoka.webp", aliases: [] },
    { name: "Anakin Skywlker", file: "portraits/Anakin Skywlker.png", aliases: ["Anakin-Skywlker", "Anakin_Skywlker"] },
    { name: "Arc Troopers", file: "portraits/Arc Troopers.jpg", aliases: ["Arc-Troopers", "Arc_Troopers"] },
    { name: "Asajj Ventress", file: "portraits/Asajj-Ventress.webp", aliases: ["Asajj-Ventress", "Asajj_Ventress"] },
    { name: "B1 Battledroids", file: "portraits/B1 Battledroids.webp", aliases: ["B1_Battledroids", "B1-Battledroids"] },
    { name: "B3 Ultra Battle Droid", file: "portraits/B3_Ultra_Battle_Droid.webp", aliases: ["B3-Ultra-Battle-Droid", "B3_Ultra_Battle_Droid"] },
    { name: "Bad Batch Crosshair", file: "portraits/Bad Batch Crosshair.jpg", aliases: ["Bad_Batch_Crosshair", "Bad-Batch-Crosshair"] },
    { name: "Bastila Shan", file: "portraits/Bastila Shan.webp", aliases: ["Bastila-Shan", "Bastila_Shan"] },
    { name: "Bb 8", file: "portraits/BB-8.webp", aliases: ["BB-8", "BB_8", "BB 8"] },
    { name: "Bo Katan Kryze", file: "portraits/Bo-Katan Kryze.jpg", aliases: ["Bo-Katan Kryze", "Bo_Katan_Kryze", "Bo-Katan-Kryze"] },
    { name: "Boba Fett", file: "portraits/Boba Fett.png", aliases: ["Boba-Fett", "Boba_Fett"] },
    { name: "C1 10p “chopper", file: "portraits/C1-10P “Chopper.jpg", aliases: ["C1-10P “Chopper", "C1-10P-“Chopper", "C1_10P_“Chopper", "C1 10P “Chopper"] },
    { name: "Cadbane", file: "portraits/CadBane.webp", aliases: ["CadBane"] },
    { name: "Cal Kestis", file: "portraits/Cal Kestis.webp", aliases: ["Cal_Kestis", "Cal-Kestis"] },
    { name: "Captain Phasma", file: "portraits/Captain Phasma.jpg", aliases: ["Captain_Phasma", "Captain-Phasma"] },
    { name: "Captain Rex", file: "portraits/Captain Rex.jpg", aliases: ["Captain-Rex", "Captain_Rex"] },
    { name: "Chewbacca", file: "portraits/Chewbacca.jpg", aliases: [] },
    { name: "Clone Commander Faie", file: "portraits/Clone Commander Faie.jpg", aliases: ["Clone-Commander-Faie", "Clone_Commander_Faie"] },
    { name: "Clone Trooper Medics", file: "portraits/Clone Trooper Medics.webp", aliases: ["Clone_Trooper_Medics", "Clone-Trooper-Medics"] },
    { name: "Clone Troopers", file: "portraits/Clone Troopers.webp", aliases: ["Clone_Troopers", "Clone-Troopers"] },
    { name: "Commander Cody", file: "portraits/Commander Cody.jpg", aliases: ["Commander-Cody", "Commander_Cody"] },
    { name: "Count Dooku", file: "portraits/Count Dooku.jpg", aliases: ["Count_Dooku", "Count-Dooku"] },
    { name: "Darth Maul", file: "portraits/Darth Maul.jpg", aliases: ["Darth_Maul", "Darth-Maul"] },
    { name: "Darth Nihilus", file: "portraits/Darth Nihilus.png", aliases: ["Darth_Nihilus", "Darth-Nihilus"] },
    { name: "Darth Plagueis", file: "portraits/Darth Plagueis.jpg", aliases: ["Darth-Plagueis", "Darth_Plagueis"] },
    { name: "Darth Revan", file: "portraits/Darth Revan.jpg", aliases: ["Darth_Revan", "Darth-Revan"] },
    { name: "Darth Sion", file: "portraits/Darth Sion.webp", aliases: ["Darth_Sion", "Darth-Sion"] },
    { name: "Din Djarin “mando”", file: "portraits/Din Djarin “Mando”.webp", aliases: ["Din Djarin “Mando”", "Din-Djarin-“Mando”", "Din_Djarin_“Mando”"] },
    { name: "Droidekas", file: "portraits/Droidekas.jpg", aliases: [] },
    { name: "Enfys Nest", file: "portraits/Enfys Nest.jpg", aliases: ["Enfys-Nest", "Enfys_Nest"] },
    { name: "Ewok Spearmen", file: "portraits/Ewok Spearmen.webp", aliases: ["Ewok-Spearmen", "Ewok_Spearmen"] },
    { name: "Ezra", file: "portraits/Ezra.webp", aliases: [] },
    { name: "Fennec Shand", file: "portraits/Fennec Shand.jpg", aliases: ["Fennec_Shand", "Fennec-Shand"] },
    { name: "Finn Fn 2187", file: "portraits/Finn FN-2187.webp", aliases: ["Finn FN-2187", "Finn FN 2187", "Finn_FN_2187", "Finn-FN-2187"] },
    { name: "First Order Troopers", file: "portraits/First Order Troopers.jpg", aliases: ["First_Order_Troopers", "First-Order-Troopers"] },
    { name: "General Hux", file: "portraits/General Hux.jpg", aliases: ["General-Hux", "General_Hux"] },
    { name: "General Grievous", file: "portraits/general-grievous.jpg", aliases: ["general-grievous", "general_grievous", "general grievous", "Grevious"] },
    { name: "General Admiral Thrawn", file: "portraits/Grand Admiral Thrawn.jpg", aliases: [] },
    { name: "Grand Inquisitor", file: "portraits/Grand Inquisitor.jpg", aliases: ["Grand_Inquisitor", "Grand-Inquisitor"] },
    { name: "Greedo", file: "portraits/Greedo.jpg", aliases: [] },
    { name: "Grogu", file: "portraits/Grogu.jpg", aliases: [] },
    { name: "Gungan Swordsman", file: "portraits/Gungan Swordsman.webp", aliases: ["Gungan-Swordsman", "Gungan_Swordsman"] },
    { name: "Hansolo", file: "portraits/HanSolo.webp", aliases: ["HanSolo"] },
    { name: "Hk 47", file: "portraits/HK-47.webp", aliases: ["HK-47", "HK_47", "HK 47"] },
    { name: "Ig 11", file: "portraits/IG-11.webp", aliases: ["IG-11", "IG 11", "IG_11"] },
    { name: "Imperial Army Trooper", file: "portraits/Imperial Army Trooper.jpg", aliases: ["Imperial-Army-Trooper", "Imperial_Army_Trooper"] },
    { name: "Imperial Super Commando", file: "portraits/Imperial Super Commando.jpg", aliases: ["Imperial_Super_Commando", "Imperial-Super-Commando"] },
    { name: "Jabba the Hutt", file: "portraits/Jabba.jpg", aliases: [] },
    { name: "Jango Fett", file: "portraits/Jango Fett.webp", aliases: ["Jango_Fett", "Jango-Fett"] },
    { name: "Jar Jar Binks", file: "portraits/Jar Jar Binks.jpg", aliases: ["Jar_Jar_Binks", "Jar-Jar-Binks"] },
    { name: "Jawas", file: "portraits/Jawas.jpg", aliases: [] },
    { name: "Jedi Temple Guard", file: "portraits/Jedi Temple Guard.png", aliases: ["Jedi_Temple_Guard", "Jedi-Temple-Guard"] },
    { name: "Jedi Youngling", file: "portraits/Jedi Youngling.jpeg", aliases: ["Jedi-Youngling", "Jedi_Youngling"] },
    { name: "Jyn Erso", file: "portraits/Jyn Erso.jpg", aliases: ["Jyn-Erso", "Jyn_Erso"] },
    { name: "K 2so", file: "portraits/K-2SO.webp", aliases: ["K-2SO", "K 2SO", "K_2SO"] },
    { name: "Kylo Ren", file: "portraits/Kylo Ren.jpg", aliases: ["Kylo-Ren", "Kylo_Ren"] },
    { name: "Luke Skywalker", file: "portraits/Luke-Skywalker.webp", aliases: ["Luke-Skywalker", "Luke_Skywalker"] },
    { name: "Mace Windu", file: "portraits/Mace-Windu.jpg", aliases: ["Mace-Windu", "Mace_Windu"] },
    { name: "Magna Guards", file: "portraits/magna Guards.webp", aliases: ["magna Guards", "magna_Guards", "magna-Guards"] },
    { name: "Mandalore The Ultimate", file: "portraits/Mandalore the Ultimate.jpg", aliases: ["Mandalore the Ultimate", "Mandalore-the-Ultimate", "Mandalore_the_Ultimate"] },
    { name: "Mandalorian Rifleman", file: "portraits/Mandalorian Rifleman.jpg", aliases: ["Mandalorian_Rifleman", "Mandalorian-Rifleman"] },
    { name: "Mara Jade", file: "portraits/Mara Jade.jpg", aliases: ["Mara_Jade", "Mara-Jade"] },
    { name: "Marchion Ro", file: "portraits/Marchion Ro.webp", aliases: ["Marchion-Ro", "Marchion_Ro"] },
    { name: "Moff Gideon", file: "portraits/Moff Gideon.jpg", aliases: ["Moff_Gideon", "Moff-Gideon"] },
    { name: "Mortar Stormtrooper", file: "portraits/Mortar Stormtrooper.webp", aliases: ["Mortar-Stormtrooper", "Mortar_Stormtrooper"] },
    { name: "Mother Talzin", file: "portraits/Mother Talzin.jpg", aliases: ["Mother_Talzin", "Mother-Talzin"] },
    { name: "Nihil Pirate Marauders", file: "portraits/Nihil Pirate Marauders.webp", aliases: ["Nihil-Pirate-Marauders", "Nihil_Pirate_Marauders"] },
    { name: "Obiwan", file: "portraits/Obiwan.jpg", aliases: [] },
    { name: "Padme", file: "portraits/Padme.png", aliases: [] },
    { name: "Palpatine", file: "portraits/Palpatine.webp", aliases: [] },
    { name: "Paz Vizsla", file: "portraits/Paz Vizsla.webp", aliases: ["Paz-Vizsla", "Paz_Vizsla"] },
    { name: "Plo Koon", file: "portraits/Plo koon.jpg", aliases: ["Plo koon", "Plo-koon", "Plo_koon"] },
    { name: "Praetorian Guard", file: "portraits/praetorian_guard.jpg", aliases: ["praetorian guard", "praetorian_guard", "praetorian-guard"] },
    { name: "Qui Gon Jinn", file: "portraits/Qui Gon Jinn.jpg", aliases: ["Qui-Gon-Jinn", "Qui_Gon_Jinn"] },
    { name: "R2d2", file: "portraits/R2D2.jpg", aliases: ["R2D2"] },
    { name: "Rancor", file: "portraits/Rancor.webp", aliases: [] },
    { name: "Rebel Troopers", file: "portraits/Rebel Troopers.jpg", aliases: ["Rebel-Troopers", "Rebel_Troopers"] },
    { name: "Rey Skywalker", file: "portraits/Rey Skywalker.jpg", aliases: ["Rey_Skywalker", "Rey-Skywalker"] },
    { name: "Sabine Wren", file: "portraits/Sabine Wren.jpg", aliases: ["Sabine_Wren", "Sabine-Wren"] },
    { name: "Savage Opress", file: "portraits/Savage Opress.jpg", aliases: ["Savage-Opress", "Savage_Opress"] },
    { name: "Saw Gerrera", file: "portraits/Saw-Gerrera.jpg", aliases: ["Saw-Gerrera", "Saw_Gerrera"] },
    { name: "Scout Troopers", file: "portraits/Scout Troopers.jpg", aliases: ["Scout_Troopers", "Scout-Troopers"] },
    { name: "Snoke", file: "portraits/Snoke.jpg", aliases: [] },
    { name: "St Series Super Tactical", file: "portraits/ST-series Super Tactical.webp", aliases: ["ST-series Super Tactical", "ST-series-Super-Tactical", "ST series Super Tactical", "ST_series_Super_Tactical"] },
    { name: "Starkiller", file: "portraits/StarKiller.jpg", aliases: ["StarKiller"] },
    { name: "Storm Troopers", file: "portraits/Storm Troopers.jpg", aliases: ["Storm-Troopers", "Storm_Troopers"] },
    { name: "Grand Moff Tarkin", file: "portraits/Tarkin.jpg", aliases: [] },
    { name: "Tera Sinube", file: "portraits/Tera Sinube.png", aliases: ["Tera-Sinube", "Tera_Sinube"] },
    { name: "The Armorer", file: "portraits/The Armorer.jpg", aliases: ["The_Armorer", "The-Armorer"] },
    { name: "The Daughter", file: "portraits/The Daughter.jpg", aliases: ["The_Daughter", "The-Daughter"] },
    { name: "Tie Fighter", file: "portraits/Tie Fighter.jpg", aliases: ["Tie-Fighter", "Tie_Fighter"] },
    { name: "Torban Buck", file: "portraits/Torban Buck.jpg", aliases: ["Torban_Buck", "Torban-Buck"] },
    { name: "Vader", file: "portraits/Vader.jpg", aliases: [] },
    { name: "Wicket", file: "portraits/Wicket.jpg", aliases: [] },
    { name: "Wookie Fighters", file: "portraits/Wookie Fighters.webp", aliases: ["Wookie_Fighters", "Wookie-Fighters"] },
    { name: "Yoda", file: "portraits/Yoda.webp", aliases: [] },
    { name: "Custom Character 1", file: "portraits/filename.png", aliases: [] },
    { name: "Darth Malak", file: "portraits/filename.png", aliases: [] },
    { name: "Ezra Bridger", file: "portraits/filename.png", aliases: [] },
    { name: "OG-9 Spider Droid", file: "portraits/filename.png", aliases: [] },
    { name: "Jedi Padawan", file: "portraits/filename.png", aliases: [] },
    { name: "Sith Padawan", file: "portraits/filename.png", aliases: [] },
    { name: "C3PO", file: "portraits/filename.png", aliases: [] },
    { name: "Hera Syndulla", file: "portraits/filename.png", aliases: [] },
    { name: "Alexsandr Kallus", file: "portraits/filename.png", aliases: [] },
    { name: "Aqualish Enforcers", file: "portraits/filename.png", aliases: [] },
    { name: "Bad Batch Echo", file: "portraits/filename.png", aliases: [] },
    { name: "Bad Batch Tech", file: "portraits/filename.png", aliases: [] },
    { name: "Bad Batch Wrecker", file: "portraits/filename.png", aliases: [] },
    { name: "Baze Malbus", file: "portraits/filename.png", aliases: [] },
    { name: "Bossk", file: "portraits/filename.png", aliases: [] },
    { name: "CC-5576-39", file: "portraits/filename.png", aliases: [] },
    { name: "Chief Chirpa", file: "portraits/filename.png", aliases: [] },
    { name: "Commander TX-20", file: "portraits/filename.png", aliases: [] },
    { name: "Durge", file: "portraits/filename.png", aliases: [] },
    { name: "Gamorrean Executioner", file: "portraits/filename.png", aliases: [] },
    { name: "Gar Saxon", file: "portraits/filename.png", aliases: [] },
    { name: "Death Trooper", file: "portraits/filename.png", aliases: [] },
    { name: "Geonosian Fighters", file: "portraits/filename.png", aliases: [] },
    { name: "IG-86 Sentinel Droids", file: "portraits/filename.png", aliases: [] },
    { name: "Hondo Ohnaka", file: "portraits/filename.png", aliases: [] },
    { name: "Joopa", file: "portraits/filename.png", aliases: [] },
    { name: "Kryknas", file: "portraits/filename.png", aliases: [] },
    { name: "Lando Calrissian", file: "portraits/filename.png", aliases: [] },
    { name: "Mister Bones", file: "portraits/filename.png", aliases: [] },
    { name: "Pit Droids", file: "portraits/filename.png", aliases: [] },
    { name: "Poe Dameron", file: "portraits/filename.png", aliases: [] },
    { name: "PROXY", file: "portraits/filename.png", aliases: [] },
    { name: "Rebel Commandos", file: "portraits/filename.png", aliases: [] },
    { name: "Rebel Engineers", file: "portraits/filename.png", aliases: [] },
    { name: "Trandoshan Fighters", file: "portraits/filename.png", aliases: [] },
    { name: "Tusken Raiders", file: "portraits/filename.png", aliases: [] },
    { name: "Umbara Militia", file: "portraits/filename.png", aliases: [] },
    { name: "Wampa", file: "portraits/filename.png", aliases: [] },
    { name: "Wedge Antilles", file: "portraits/filename.png", aliases: [] },
    { name: "Zeb Orrelios", file: "portraits/Zeb Orrelios.jpg", aliases: ["Zeb_Orrelios", "Zeb-Orrelios"] }
  ];

  // ====== 2) Utilities ======
  function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,''); }
  function byId(id){ return document.getElementById(id); }

  // Dice coefficient on bigrams for fuzzy matching
  function bigrams(s){ const a=[]; for(let i=0;i<s.length-1;i++) a.push(s.slice(i,i+2)); return a; }
  function diceSim(a,b){
    a = (a||''); b=(b||'');
    if(a.length<2 || b.length<2) return 0;
    const A = bigrams(a), B = bigrams(b).slice();
    let matches = 0;
    for(const bi of A){
      const j = B.indexOf(bi);
      if(j!==-1){ matches += 2; B.splice(j,1); }
    }
    return matches / (A.length + B.length);
  }

  // Load persisted map
  function loadMap(){
    try{ return JSON.parse(localStorage.getItem('gc_portraits')||'{}'); }
    catch(e){ return {}; }
  }
  function saveMap(m){ localStorage.setItem('gc_portraits', JSON.stringify(m||{})); }

  // Merge overrides to map (overrides win)
  function applyOverrides(map){
    // Ensure aliases array exists
    const arr = Array.isArray(PORTRAIT_OVERRIDES) ? PORTRAIT_OVERRIDES : [];
    for(const entry of arr){
      if(!entry || !entry.name) continue;
      const file = entry.file || '';
      const name = entry.name;
      const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
      // Set direct
      if(file) map[name] = file;
      map[norm(name)] = file || map[norm(name)] || map[name] || '';
      // Aliases
      for(const a of aliases){
        if(!a) continue;
        if(file) map[a] = file;
        map[norm(a)] = file || map[norm(a)] || map[a] || '';
      }
    }
    return map;
  }

  // Wrap portraitURL with multi-strategy resolution + safe default
  const originalPortraitURL = window.portraitURL || function(n){ return ''; };
  window.portraitURL = function(name){
    try{
      let map = loadMap();
      map = applyOverrides(map); // ensure overrides are applied
      saveMap(map);

      // 1) Exact
      if(map[name]) return map[name];
      // 2) Normalized
      const n = norm(name);
      if(map[n]) return map[n];
      // 3) Strip parentheticals
      const dn = (name||'').replace(/\s*\(.*/, '').trim();
      if(map[dn]) return map[dn];
      const ndn = norm(dn);
      if(map[ndn]) return map[ndn];
      // 4) Fuzzy over all keys
      const entries = Object.entries(map);
      let best = null, bestScore = 0;
      for(const [k,v] of entries){
        const kn = norm(k);
        const sc = diceSim(ndn, kn);
        if(sc > bestScore){ bestScore = sc; best = v; }
      }
      if(best && bestScore >= 0.88) return best;
      // 5) Fallback default (independent)
      const seed = encodeURIComponent((name||'unknown').trim());
      return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}`;
    }catch(e){
      const seed = encodeURIComponent((name||'unknown').trim());
      return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}`;
    }
  };

  // ====== 3) Tiny Portrait Editor (ALT+P) ======
  function openEditor(){
    if(byId('gcPortraitEditor')){ byId('gcPortraitEditor').classList.toggle('open'); return; }
    const root = document.createElement('div');
    root.id = 'gcPortraitEditor';
    root.innerHTML = `
      <style>
        #gcPortraitEditor{ position:fixed; right:16px; bottom:16px; width:420px; max-height:80vh; overflow:auto;
          background:#0b0f14; color:#e6edf3; font:14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial;
          border:1px solid #263244; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.35); z-index:999999; display:none; }
        #gcPortraitEditor.open{ display:block; }
        #gcPortraitEditor header{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #243040; }
        #gcPortraitEditor header h3{ margin:0; font-size:16px; }
        #gcPortraitEditor .content{ padding:12px; display:grid; gap:10px; }
        #gcPortraitEditor input, #gcPortraitEditor textarea, #gcPortraitEditor select{ width:100%; background:#111823; border:1px solid #2a3a52; color:#e6edf3; border-radius:8px; padding:8px; }
        #gcPortraitEditor .row{ display:grid; gap:6px; }
        #gcPortraitEditor .cols{ display:grid; grid-template-columns: 1fr 140px; gap:10px; align-items:center; }
        #gcPortraitEditor img{ width:100%; height:140px; object-fit:cover; border-radius:8px; border:1px solid #2a3a52; background:#0e1622; }
        #gcPortraitEditor .btns{ display:flex; gap:8px; flex-wrap:wrap; }
        #gcPortraitEditor button{ background:#1f6feb; color:white; border:0; border-radius:8px; padding:8px 10px; cursor:pointer; }
        #gcPortraitEditor button.ghost{ background:#111823; color:#cbd5e1; border:1px solid #2a3a52; }
        #gcPortraitEditor .help{ font-size:12px; color:#93a4b8; }
      </style>
      <header>
        <h3>Portrait Editor</h3>
        <div class="btns">
          <button class="ghost" id="gcClosePE">Close</button>
        </div>
      </header>
      <div class="content">
        <div class="row">
          <input id="gcSearchPE" placeholder="Search character..." />
        </div>
        <div class="row">
          <select id="gcSelectPE" size="8"></select>
        </div>
        <div class="row cols">
          <div>
            <label>File path (relative):</label>
            <input id="gcFilePE" placeholder="e.g., portraits/Ahsoka.webp" />
            <label>Aliases (comma separated):</label>
            <input id="gcAliasesPE" placeholder="e.g., Ahsoka, Ahsoka Tano, Fulcrum" />
            <div class="btns" style="margin-top:6px;">
              <button id="gcSavePE">Save</button>
              <button class="ghost" id="gcExportJSON">Export JSON</button>
              <button class="ghost" id="gcExportCSV">Export CSV</button>
              <button class="ghost" id="gcImportJSON">Import JSON</button>
              <button class="ghost" id="gcClearLocal">Clear Local Map</button>
            </div>
            <div class="help">Tip: ALT+P toggles this panel. Saving updates localStorage immediately.</div>
          </div>
          <img id="gcPreviewPE" alt="Preview"/>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    root.classList.add('open');

    const sel = byId('gcSelectPE'), q = byId('gcSearchPE');
    const file = byId('gcFilePE'), al = byId('gcAliasesPE'), img = byId('gcPreviewPE');

    function loadEntries(){
      // union of overrides and any existing map entries + DB.units if present
      const map = applyOverrides(loadMap());
      const names = new Set();
      // From overrides
      for(const e of (PORTRAIT_OVERRIDES||[])){ if(e && e.name) names.add(e.name); }
      // From DB
      if(window.DB && Array.isArray(DB.units)){ DB.units.forEach(u=> names.add(u.name)); }
      // From map keys
      Object.keys(map).forEach(k=>{ if(k && k[0] !== '{' && k.indexOf('/')===-1) names.add(k); });
      return Array.from(names).sort((a,b)=> a.localeCompare(b));
    }

    function refreshList(){
      const term = (q.value||'').toLowerCase();
      const entries = loadEntries().filter(n=> n.toLowerCase().includes(term));
      sel.innerHTML = '';
      entries.forEach(n=>{
        const opt = document.createElement('option');
        opt.value = n; opt.textContent = n;
        sel.appendChild(opt);
      });
      if(sel.options.length) sel.selectedIndex = 0, showSelected();
    }

    function currentRecord(name){
      // find override or create a new blank record
      let rec = (PORTRAIT_OVERRIDES||[]).find(e=> e && e.name===name);
      if(!rec) rec = { name, file:'', aliases:[] };
      return rec;
    }

    function showSelected(){
      const name = sel.value;
      const rec = currentRecord(name);
      file.value = rec.file || '';
      al.value = (Array.isArray(rec.aliases)? rec.aliases : []).join(', ');
      img.src = window.portraitURL(name);
      img.alt = name;
    }

    function saveCurrent(){
      const name = sel.value;
      if(!name) return;
      const f = file.value.trim();
      const aliases = al.value.split(',').map(s=>s.trim()).filter(Boolean);
      // Update overrides (replace or push)
      let idx = (PORTRAIT_OVERRIDES||[]).findIndex(e=> e && e.name===name);
      if(idx===-1){ PORTRAIT_OVERRIDES.push({name, file:f, aliases}); }
      else{ PORTRAIT_OVERRIDES[idx] = { name, file:f, aliases }; }
      // Apply + persist to localStorage
      let map = applyOverrides(loadMap());
      map[name] = f;
      map[norm(name)] = f;
      aliases.forEach(a=>{ map[a]=f; map[norm(a)]=f; });
      saveMap(map);
      img.src = window.portraitURL(name);
    }

    q.addEventListener('input', refreshList);
    sel.addEventListener('change', showSelected);
    byId('gcSavePE').addEventListener('click', saveCurrent);
    byId('gcClosePE').addEventListener('click', ()=> root.classList.remove('open'));
    byId('gcClearLocal').addEventListener('click', ()=>{ localStorage.removeItem('gc_portraits'); alert('Cleared local portrait map. Reload to regenerate.'); });

    function download(name, text, type){
      const blob = new Blob([text], {type});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    }

    byId('gcExportJSON').addEventListener('click', ()=>{
      download('portrait_overrides.json', JSON.stringify(PORTRAIT_OVERRIDES, null, 2), 'application/json');
    });
    byId('gcExportCSV').addEventListener('click', ()=>{
      const rows = [['character_name','filename','aliases']];
      (PORTRAIT_OVERRIDES||[]).forEach(e=>{
        rows.push([e.name, e.file||'', (e.aliases||[]).join('|')]);
      });
      const csv = rows.map(r=> r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
      download('portrait_overrides.csv', csv, 'text/csv');
    });
    byId('gcImportJSON').addEventListener('click', ()=>{
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
      inp.onchange = ()=>{
        const f = inp.files[0]; if(!f) return;
        const r = new FileReader();
        r.onload = ()=>{
          try{
            const arr = JSON.parse(r.result);
            if(Array.isArray(arr)){
              // Replace overrides with imported content
              PORTRAIT_OVERRIDES.length = 0;
              arr.forEach(o=> PORTRAIT_OVERRIDES.push({ name:o.name, file:o.file, aliases:Array.isArray(o.aliases)?o.aliases:[] }));
              // Reapply and persist
              let map = applyOverrides({});
              saveMap(map);
              alert('Imported overrides. Reload to see all changes.');
              refreshList();
            }else alert('Invalid JSON structure.');
          }catch(e){ alert('Invalid JSON.'); }
        };
        r.readAsText(f);
      };
      inp.click();
    });

    refreshList();
  }

  // Global hotkey
  document.addEventListener('keydown', (e)=>{
    if(e.altKey && (e.key||'').toLowerCase()==='p'){ e.preventDefault(); openEditor(); }
  });

  // Apply overrides on load
  saveMap(applyOverrides(loadMap()));
  console.log('[GC Portraits] EasyEdit loaded with', PORTRAIT_OVERRIDES.length, 'entries. Press ALT+P for editor.');
})();
// --- End GC_Portraits.js ---

// --- Begin GC_LeadersAuras.js ---

/**
 * GC_LeadersAuras.js — Leaders & Auras system for Galaxy Clash
 * ------------------------------------------------------------
 * Drop this file next to Galaxy_Clash_V2.html and include it LAST:
 *   <script src="GC_LeadersAuras.js"></script>
 *
 * What it does:
 *  - Defines window.Auras: data registry + helpers
 *  - Applies leader auras to team scoring (teamScore) automatically
 *  - Adds a "Leader Auras" preview section to the hover tooltip
 *  - NEVER mutates your unit objects; computes effective stats on the fly
 *
 * Safe to remove: It patches via wrappers (keeps originals as __base*).
 */
(function(){
  const g = (typeof window!=='undefined') ? window : globalThis;

  // --- Guards for required globals (we soft-fallback when missing) ---
  const has = (k)=> typeof g[k] === 'function';
  const clamp = has('clamp') ? g.clamp : ((x)=> Math.max(10, Math.min(99, Math.round(x))));
  const tagFromName = has('tagFromName') ? g.tagFromName : ((name)=>'special');
  const displayName = has('displayName') ? g.displayName : ((s)=> String(s||'').replace(/\s*\(.*/, '').trim());
  const baseComputeStats = (function(){
    if (typeof g.__baseComputeStats === 'function') return g.__baseComputeStats;
    const fn = g.computeStats || function(u){ return {attack:55, defense:50, control:50, mobility:50, support:45, survivability:49, tag:tagFromName(u.name)}; };
    // Cache original
    g.__baseComputeStats = fn;
    return fn;
  })();

  // Preserve originals we override
  const __baseTooltipHTML = g.tooltipHTML;
  const __baseTeamScore   = g.teamScore;

  // --- Utility ---
  const norm = (name)=> displayName(name||'').toLowerCase();
  const ABBR = {attack:'ATK', defense:'DEF', control:'CTRL', mobility:'MOB', support:'SUP', survivability:'SURV'};

  function matchSelect(u, select, leaderName){
    if(!select) return true;
    const n = norm(u.name);
    // Don't buff the leader unless explicitly allowed
    if(select.notSelf && norm(u.name) === norm(leaderName)) return false;
    // Tag match
    if(select.tag){
      const tags = Array.isArray(select.tag) ? select.tag : [select.tag];
      const utag = tagFromName(u.name);
      if(!tags.some(t => utag === String(t))) return false;
    }
    // Name match (exact by display name)
    if(select.name){
      const names = (Array.isArray(select.name) ? select.name : [select.name]).map(norm);
      if(!names.includes(n)) return false;
    }
    // Substring contains
    if(select.includes){
      const needles = Array.isArray(select.includes)?select.includes:[select.includes];
      const low = n;
      if(!needles.some(s=> low.includes(String(s).toLowerCase()))) return false;
    }
    // Exclude
    if(select.exclude){
      const ex = Array.isArray(select.exclude)?select.exclude:[select.exclude];
      const low = n;
      if(ex.some(s=> low.includes(String(s).toLowerCase()))) return false;
    }
    return true;
  }

  function applyMods(base, aura){
    const out = {...base};
    // additive first
    if(aura.add){
      for(const k of Object.keys(aura.add)){
        if(out[k] != null) out[k] += Number(aura.add[k]||0);
      }
    }
    // multiplicative
    if(aura.mult){
      for(const k of Object.keys(aura.mult)){
        if(out[k] != null) out[k] *= Number(aura.mult[k]||1);
      }
    }
    // clamp numeric fields
    for(const k of ['attack','defense','control','mobility','support','survivability']){
      if(typeof out[k] === 'number') out[k] = clamp(out[k]);
    }
    return out;
  }

  // --- Registry ---
  // Keep it simple and readable. Tweak values to taste.
  
const REGISTRY = [
  // --- Imperial & Empire leadership ---
  {
    leader: 'Grand Admiral Thrawn',
    select: { tag:['trooper'], notSelf:true },
    add: { control: 5, defense: 2 },
    mult: { attack: 1.02 },
    blurb: 'Troopers gain +5 CTRL, +2 DEF, +2% ATK while Thrawn leads.'
  },
  {
    leader: 'Grand Moff Tarkin',
    select: { tag:['trooper'], notSelf:true },
    add: { defense: 4, support: 2 },
    blurb: 'Troopers gain +4 DEF, +2 SUP from Tarkin’s doctrine.'
  },
  {
    leader: 'General Veers',
    select: { includes:['stormtrooper','snowtrooper','scout trooper'], notSelf:true },
    add: { attack: 2, defense: 2, control: 1 },
    blurb: 'Imperial troopers sharpen up: +2 ATK, +2 DEF, +1 CTRL.'
  },
  {
    leader: 'Admiral Piett',
    select: { includes:['stormtrooper','death trooper'], notSelf:true },
    add: { control: 3, support: 2 },
    blurb: 'Disciplined command nets troopers +3 CTRL, +2 SUP.'
  },

  // --- Sith & dark-side leadership ---
  {
    leader: 'Darth Vader',
    select: { tag:['sith'], notSelf:true },
    add: { attack: 5, control: 3 },
    blurb: 'Sith gain +5 ATK, +3 CTRL in Vader’s presence.'
  },
  {
    leader: 'Emperor Palpatine',
    select: { tag:['sith'], notSelf:true },
    add: { control: 6, support: 4 },
    mult: { attack: 1.03 },
    blurb: 'Sith gain +6 CTRL, +4 SUP, +3% ATK from Sidious.'
  },
  {
    leader: 'Darth Revan',
    select: { notSelf:true }, // Battle Meditation benefits the whole party
    add: { control: 3, support: 3 },
    mult: { attack: 1.02 },
    blurb: 'Battle Meditation: teamwide +3 CTRL, +3 SUP, +2% ATK.'
  },
  {
    leader: 'Darth Malak',
    select: { name:['Darth Revan'], notSelf:true },
    add: { survivability: 3, attack: 2 },
    blurb: 'Bodyguard to Revan: Revan gains +3 SURV, +2 ATK.'
  },
  {
    leader: 'Darth Nihilus',
    select: { tag:['sith'], notSelf:true },
    add: { survivability: 2, support: 2 },
    blurb: 'Sith harden for attrition: +2 SURV, +2 SUP under Nihilus.'
  },
  {
    leader: 'Darth Plagueis',
    select: { tag:['sith'], notSelf:true },
    add: { control: 4, support: 3 },
    blurb: 'Manipulation and attrition: Sith gain +4 CTRL, +3 SUP.'
  },

  // --- Jedi & light-side leadership ---
  {
    leader: 'Yoda',
    select: { tag:['jedi'], notSelf:true },
    add: { defense: 3, support: 4, control: 2 },
    blurb: 'Jedi gain +3 DEF, +4 SUP, +2 CTRL from Grand Master Yoda.'
  },
  {
    leader: 'The Daughter',
    select: { tag:['jedi'], notSelf:true },
    add: { survivability: 3, support: 4 },
    blurb: 'Radiant sustain: Jedi allies gain +3 SURV, +4 SUP.'
  },
  {
    leader: 'Obi-Wan Kenobi',
    select: { includes:['clone','clone trooper','501st'], notSelf:true },
    add: { defense: 4, control: 2 },
    blurb: '“Hello there.” Clones gain +4 DEF, +2 CTRL with Obi‑Wan.'
  },
  {
    leader: 'Mace Windu',
    select: { tag:['jedi'], notSelf:true },
    add: { attack: 4, control: 3 },
    blurb: 'Vaapad ferocity: Jedi gain +4 ATK, +3 CTRL.'
  },
  {
    leader: 'Bastila Shan',
    select: { tag:['jedi'], notSelf:true },
    add: { support: 3, control: 2 },
    blurb: 'Battle Meditation (Light): Jedi gain +3 SUP, +2 CTRL.'
  },
  {
    leader: 'Bastila Shan (Revan Synergy)',
    select: { name:['Darth Revan'], notSelf:true },
    add: { control: 2, support: 2 },
    blurb: 'With Revan present, his poise improves: +2 CTRL, +2 SUP.'
  },
  {
    leader: 'Luminara Unduli',
    select: { tag:['jedi'], notSelf:true },
    add: { support: 3, survivability: 2 },
    blurb: 'Disciplined healer: Jedi gain +3 SUP, +2 SURV.'
  },
  {
    leader: 'Plo Koon',
    select: { includes:['clone','wolfpack'], notSelf:true },
    add: { support: 2, defense: 2 },
    blurb: 'Wolfpack stewardship: clones gain +2 SUP, +2 DEF.'
  },
  {
    leader: 'Shaak Ti',
    select: { includes:['clone'], notSelf:true },
    add: { control: 2, support: 2, mobility: 1 },
    blurb: 'Kamino trainer: clones gain +2 CTRL, +2 SUP, +1 MOB.'
  },

  // --- Republic/Clone leadership ---
  {
    leader: 'Commander Cody',
    select: { includes:['clone'], notSelf:true },
    add: { attack: 2, defense: 3, support: 2 },
    blurb: 'Clones gain +2 ATK, +3 DEF, +2 SUP with Cody.'
  },
  {
    leader: 'Captain Rex',
    select: { includes:['clone','501st'], notSelf:true },
    add: { mobility: 2, attack: 2, control: 1 },
    blurb: 'Aggressive doctrine: clones gain +2 MOB, +2 ATK, +1 CTRL.'
  },

  // --- Separatists / Droids ---
  {
    leader: 'General Grievous',
    select: { tag:['droid'], notSelf:true },
    add: { attack: 6, survivability: 2 },
    blurb: 'Droids gain +6 ATK, +2 SURV under Grievous.'
  },
  {
    leader: 'Wat Tambor',
    select: { tag:['droid'], notSelf:true },
    add: { support: 3, control: 1 },
    blurb: 'Techno Union optimizations: droids +3 SUP, +1 CTRL.'
  },
  {
    leader: 'Tactical Droid (TA-series)',
    select: { tag:['droid'], notSelf:true },
    add: { control: 3 },
    blurb: 'Calculated orders: droids gain +3 CTRL.'
  },

  // --- Mandalorians ---
  {
    leader: 'Bo-Katan Kryze',
    select: { tag:['mandalorian'], notSelf:true },
    add: { mobility: 5, attack: 2 },
    blurb: 'Mandalorians gain +5 MOB, +2 ATK under Bo-Katan.'
  },
  {
    leader: 'Mandalore the Ultimate',
    select: { tag:['mandalorian'], notSelf:true },
    add: { attack: 3, mobility: 3, defense: 2 },
    blurb: 'Beskar warlord: Mandalorians +3 ATK, +3 MOB, +2 DEF.'
  },
  {
    leader: 'Pre Vizsla',
    select: { includes:['death watch','mandalorian'], notSelf:true },
    add: { attack: 3, mobility: 2 },
    blurb: 'Death Watch doctrine: Mandos gain +3 ATK, +2 MOB.'
  },

  // --- Rebels & Scoundrels ---
  {
    leader: 'Leia Organa',
    select: { tag:['scoundrel','trooper'], notSelf:true },
    add: { mobility: 3, support: 3 },
    blurb: 'Scoundrels & Troopers gain +3 MOB, +3 SUP with Leia.'
  },
  {
    leader: 'Mon Mothma',
    select: { includes:['rebel'], notSelf:true },
    add: { support: 3, control: 2 },
    blurb: 'Rebel coordination: +3 SUP, +2 CTRL to Rebel allies.'
  },
  {
    leader: 'Admiral Ackbar',
    select: { includes:['rebel'], notSelf:true },
    add: { control: 2, defense: 2 },
    blurb: '“It’s a trap!” Rebels gain +2 CTRL, +2 DEF.'
  },
  {
    leader: 'Jabba the Hutt',
    select: { includes:['hutt','bounty','scoundrel'], notSelf:true },
    add: { support: 2, survivability: 2 },
    blurb: 'Cartel logistics: Scoundrels & bounty crews +2 SUP, +2 SURV.'
  },

  // --- First Order ---
  {
    leader: 'General Hux',
    select: { includes:['first order','fo','stormtrooper'], notSelf:true },
    add: { control: 3, attack: 2 },
    blurb: 'Ruthless discipline: FO troopers +3 CTRL, +2 ATK.'
  },
  {
    leader: 'Captain Phasma',
    select: { includes:['first order','fo','stormtrooper'], notSelf:true },
    add: { defense: 3, control: 1 },
    blurb: 'Phalanx drills: FO troopers +3 DEF, +1 CTRL.'
  },
  {
    leader: 'Supreme Leader Snoke',
    select: { includes:['first order','kylo','ren'], notSelf:true },
    add: { control: 4, support: 2 },
    blurb: 'Dark tutelage: Ren & FO units +4 CTRL, +2 SUP.'
  },

  // --- Nightsisters ---
  {
    leader: 'Mother Talzin',
    select: { includes:['nightsister','undead','asajj','savage'], notSelf:true },
    add: { control: 2, support: 3 },
    blurb: 'Ichor rites: Nightsisters/Undead gain +2 CTRL, +3 SUP.'
  },
  {
    leader: 'Padmé Amidala',
    select: { includes:['naboo','gungan','clone'], notSelf:true },
    add: {defense: 3, support: 3, control: 1},
    blurb: "Rallies Naboo, Gungans, and nearby Clones: +3 DEF, +3 SUP, +1 CTRL."
  },
  {
    leader: 'Finn',
    select: { includes:['resistance','resistance trooper'], notSelf:true },
    add: {support: 2, control: 2, attack: 1},
    blurb: "Resistance courage: +2 SUP, +2 CTRL, +1 ATK."
  },
  {
    leader: 'Wicket',
    select: { includes:['ewok'], notSelf:true },
    add: {mobility: 2, control: 2, support: 1},
    blurb: "Forest ambush coordination for Ewoks: +2 MOB, +2 CTRL, +1 SUP."
  },
  {
    leader: 'Luke Skywalker',
    select: { includes:['rebel'], notSelf:true },
    add: {support: 2, control: 2, attack: 1},
    blurb: "Inspires Rebel troopers: +2 SUP, +2 CTRL, +1 ATK."
  },
  {
    leader: 'Anakin Skywalker',
    select: { includes:['clone','501st'], notSelf:true },
    add: {attack: 3, control: 2},
    blurb: "Aggressive doctrine: Clones gain +3 ATK, +2 CTRL with Anakin."
  },
  {
    leader: 'Qui-Gon Jinn',
    select: { includes:['padawan','youngling'], notSelf:true },
    add: {support: 3, control: 2},
    blurb: "Mentorship: Padawans/Younglings gain +3 SUP, +2 CTRL."
  },
  {
    leader: 'Grand Inquisitor',
    select: { includes:['inquisitor','purge trooper'], notSelf:true },
    add: {control: 3, attack: 2},
    blurb: "Inquisitorial hunts: Inquisitors & Purge Troopers +3 CTRL, +2 ATK."
  },
  {
    leader: 'Count Dooku',
    select: { includes:['droid','asajj','ventress','magna'], notSelf:true },
    add: {control: 2, attack: 2},
    blurb: "Makashi command: Droids & Asajj lines gain +2 CTRL, +2 ATK."
  },
  {
    leader: 'ST‑Series Super Tactical Droid',
    select: { tag:['droid'], notSelf:true },
    add: {control: 4, support: 2},
    blurb: "Optimization subroutines: Droids +4 CTRL, +2 SUP."
  },
  {
    leader: 'Saw Gerrera',
    select: { includes:['partisan'], notSelf:true },
    add: {attack: 2, control: 2},
    blurb: "Partisan insurgency: +2 ATK, +2 CTRL for Partisans."
  },
  {
    leader: 'Enfys Nest',
    select: { includes:['cloud','swoop','partisan'], notSelf:true },
    add: {mobility: 2, attack: 2},
    blurb: "Cloud\u2011Rider hit\u2011and\u2011run: +2 MOB, +2 ATK."
  },
  {
    leader: 'The Armorer',
    select: { tag:['mandalorian'], notSelf:true },
    add: {defense: 3, support: 2},
    blurb: "Forge discipline: Mandalorians gain +3 DEF, +2 SUP."
  },
  {
    leader: 'Kylo Ren',
    select: { includes:['first order','praetorian'], notSelf:true },
    add: {attack: 2, control: 2},
    blurb: "Relentless pressure: FO & Praetorians +2 ATK, +2 CTRL."
  },
  {
    leader: 'Rey',
    select: { includes:['resistance'], notSelf:true },
    add: {survivability: 2, support: 2},
    blurb: "Resilient leadership: Resistance allies +2 SURV, +2 SUP."
  },
  {
    leader: 'Ahsoka Tano',
    select: { includes:['clone','rebel'], notSelf:true },
    add: {support: 2, mobility: 2},
    blurb: "Swift coordination: Clone/Rebel allies +2 SUP, +2 MOB."
  }
];


  // Index by leader key for quick checks
  const LEADER_INDEX = REGISTRY.reduce((m, r)=> (m.set(norm(r.leader), r), m), new Map());

  function leadersOnTeam(team){
    const keys = new Set();
    (team||[]).forEach(u=>{
      const k = norm(u.name);
      if(LEADER_INDEX.has(k)) keys.add(k);
    });
    return [...keys].map(k=> LEADER_INDEX.get(k));
  }

  function activeAurasForTeam(team){
    const leaders = leadersOnTeam(team);
    // return concrete aura entries with leader name cached
    return leaders.map(r => ({...r, __leader: r.leader}));
  }

  function effectiveStats(u, team){
    const base = baseComputeStats(u);
    const auras = activeAurasForTeam(team);
    let cur = base;
    for(const aur of auras){
      if(matchSelect(u, aur.select, aur.__leader)){
        cur = applyMods(cur, aur);
      }
    }
    return cur;
  }

  function previewLines(u, team){
    const lines = [];
    const auras = activeAurasForTeam(team);
    auras.forEach(a=>{
      if(matchSelect(u, a.select, a.__leader)){
        // Build a compact stats delta summary from add/mult
        const plus = [];
        if(a.add){
          for(const k of Object.keys(a.add)){
            const v = a.add[k];
            if(v) plus.push(`+${v} ${ABBR[k]||k}`);
          }
        }
        if(a.mult){
          for(const k of Object.keys(a.mult)){
            const v = a.mult[k];
            if(v && v!==1) plus.push(`${Math.round((v-1)*100)}% ${ABBR[k]||k}`);
          }
        }
        lines.push(`${a.__leader}: ${plus.join(', ') || a.blurb}`);
      }
    });
    return lines;
  }

  // --- Public API ---
  g.Auras = {
    registry: REGISTRY,
    activeAurasForTeam,
    leadersOnTeam,
    effectiveStats,
    previewLines,
    // Convenience if you want to call directly
    computeStatsWithAuras: effectiveStats
  };

  // --- Patch teamScore to use aura-adjusted stats ---
  if (typeof __baseTeamScore === 'function') {
    g.teamScore = function(p, round){
      let score = 0;
      const team = p?.picks || [];
      team.forEach(u=>{
        const s = effectiveStats(u, team);
        const weights = [
          {attack:.9,  defense:.9,  control:1.1, mobility:1.1, support:.8,  survivability:.9},
          {attack:1.1, defense:1.0, control:1.0, mobility:1.0, support:1.0, survivability:1.0},
          {attack:1.15,defense:1.1, control:.9, mobility:.9,  support:1.05,survivability:1.15}
        ][Math.min(2, (round||1)-1)];
        const base = (
          s.attack*weights.attack +
          s.defense*weights.defense +
          s.control*weights.control +
          s.mobility*weights.mobility +
          s.support*weights.support +
          s.survivability*weights.survivability
        );
        score += base * (0.7 + Math.random()*0.6);
      });
      // preserve existing synergy bonus logic
      if (g.DB && Array.isArray(g.DB.synergies)) {
        g.DB.synergies.forEach(sy => {
          const hasA = team.some(u => u.name.toLowerCase().includes(sy.a.toLowerCase()));
          const hasB = team.some(u => u.name.toLowerCase().includes(sy.b.toLowerCase()));
          if (hasA && hasB) score *= 1.06;
        });
      }
      return score;
    };
  }

  // --- Patch tooltip to display preview of aura effects for the CURRENT drafter ---
  if (typeof __baseTooltipHTML === 'function') {
    g.tooltipHTML = function(u){
      // Build original
      let html = __baseTooltipHTML.call(g, u);
      try{
        const players = g.PLAYERS || [];
        const idx = Math.max(0, ((g.CURRENT_PLAYER||1)-1) % Math.max(1, players.length));
        const team = players[idx]?.picks || [];
        const lines = previewLines(u, team);
        if(lines.length){
          const block = `<div style="margin-top:6px"><span style="font-weight:600;opacity:.9">Leader Auras:</span><br/><div class="small">${lines.map(x=>'• '+x).join('<br/>')}</div></div>`;
          // Insert before the editor controls if present, otherwise append
          const insertAt = html.lastIndexOf('</div>');
          if(insertAt>0){
            html = html.slice(0, insertAt) + block + html.slice(insertAt);
          }else{
            html += block;
          }
        }
      }catch(e){ /* fail safe */ }
      return html;
    };
  }
})();

// --- End GC_LeadersAuras.js ---

// --- Begin GC_LeaderBadge.js ---

/**
 * GC_LeaderBadge.js — Leader crown badge
 * - Places a small 👑 badge at the TOP-CENTER of each leader's portrait
 * - Emoji-only (no text). Keeps aria-label for accessibility.
 * - Hovering the crown shows who they buff (uses GC_LeadersAuras.js)
 * Include this AFTER your main game scripts and after GC_LeadersAuras.js
 */
(function(){
  const g = (typeof window!=='undefined') ? window : globalThis;
  if(!g.document) return;

  const displayName = g.displayName || ((s)=> String(s||'').replace(/\s*\(.*/, '').trim());

  // ---------- CSS ----------
  const CSS_ID = 'gc-leader-badge-css';
  if(!document.getElementById(CSS_ID)){
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
      #roster .card{ position:relative; }
      .leaderTag{
        position:absolute; top:8px; left:50%; transform:translateX(-50%);
        background:#231a10; color:#ffd27a; border:1px solid #5b4721;
        font-size:8px; line-height:1; padding:0 4px; border-radius:999px;
        z-index:7; pointer-events:auto; cursor:help; user-select:none;
        box-shadow:0 1px 2px rgba(0,0,0,.25);
      }
      .leaderTag::before{ content:"👑"; }
    `;
    document.head.appendChild(style);
  }

  // ---------- Helpers ----------
  function leaderEntriesForDisplayName(disp){
    if(!g.Auras || !Array.isArray(g.Auras.registry)) return [];
    const dn = displayName(disp);
    const norm = (s)=> String(displayName(s)||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const nDisp = norm(dn);
    return g.Auras.registry.filter(r => {
      const nLead = norm(r.leader);
      return nLead===nDisp || nLead.includes(nDisp) || nDisp.includes(nLead);
    });
  }

  function summarizeTargets(sel){
    if(!sel) return 'Everyone';
    const out = [];
    const pretty = (s)=>{
      const key = String(s||'').trim();
      const CAP = new Map(Object.entries({
        'sith':'Sith','jedi':'Jedi','droid':'Droids','mandalorian':'Mandalorians','trooper':'Troopers',
        'clone':'Clones','501st':'501st','rebel':'Rebels','resistance':'Resistance','resistance trooper':'Resistance Troopers',
        'first order':'First Order','fo':'First Order','ewok':'Ewoks','gungan':'Gungans','naboo':'Naboo',
        'inquisitor':'Inquisitors','purge trooper':'Purge Troopers','death watch':'Death Watch','wolfpack':'Wolfpack',
        'partisan':'Partisans','cloud':'Cloud-Riders','swoop':'Swoop Gangs','kylo':'Kylo','ren':'Ren',
        'asajj':'Asajj','ventress':'Ventress','magna':'MagnaGuards','magna guard':'MagnaGuards'
      }));
      const low = key.toLowerCase();
      if(CAP.has(low)) return CAP.get(low);
      return key.split(/[\s_-]+/).map(w=> w? (w[0].toUpperCase()+w.slice(1)) : '').join(' ');
    };
    if(sel.tag){
      const tags = Array.isArray(sel.tag)? sel.tag : [sel.tag];
      out.push(tags.map(pretty).join('/'));
    }
    if(sel.includes){
      const inc = Array.isArray(sel.includes)? sel.includes : [sel.includes];
      out.push(inc.map(pretty).join('/'));
    }
    if(sel.name){
      const nm = Array.isArray(sel.name)? sel.name : [sel.name];
      out.push(nm.map(displayName).join('/'));
    }
    if(sel.exclude){
      const ex = Array.isArray(sel.exclude)? sel.exclude : [sel.exclude];
      out.push('not '+ex.map(pretty).join('/'));
    }
    return out.join(' • ') || 'Everyone';
  }

  const ABBR = {attack:'ATK', defense:'DEF', control:'CTRL', mobility:'MOB', support:'SUP', survivability:'SURV'};
  function summarizeBonuses(aura){
    const plus = [];
    if(aura.add){
      for(const k of Object.keys(aura.add)){
        const v = aura.add[k]; if(!v) continue;
        plus.push(`+${v} ${ABBR[k]||k}`);
      }
    }
    if(aura.mult){
      for(const k of Object.keys(aura.mult)){
        const v = aura.mult[k]; if(!v || v===1) continue;
        plus.push(`${Math.round((v-1)*100)}% ${ABBR[k]||k}`);
      }
    }
    return plus.join(', ');
  }

  function badgeTooltipHTML(disp){
    const entries = leaderEntriesForDisplayName(disp);
    if(!entries.length) return `<b>${disp}</b><div class="small" style="opacity:.85">No aura data.</div>`;
    const rows = entries.map(a=>{
      const targets = summarizeTargets(a.select);
      const gains = summarizeBonuses(a);
      return `<div style="margin:4px 0"><b>Buffs:</b> ${targets}${gains?`<br/><span class="small">Bonuses: ${gains}</span>`:''}${a.blurb?`<div class="small" style="opacity:.75">${a.blurb}</div>`:''}</div>`;
    });
    return `<div class="tipTitle" style="margin-bottom:6px">${disp} — Leader</div>${rows.join('')}`;
  }

  // ---------- Injection ----------
  function addLeaderBadgeToCard(cardEl, disp){
    try{
      if(!cardEl) return;
      if(cardEl.querySelector('.leaderTag')) return;
      const entries = leaderEntriesForDisplayName(disp);
      if(!entries.length) return;
      const badge = document.createElement('div');
      badge.className = 'leaderTag';
      badge.setAttribute('data-leader','1');
      badge.setAttribute('aria-label','Leader');
      badge.addEventListener('mouseenter', (e)=>{
        const html = badgeTooltipHTML(displayName(disp));
        if(typeof g.showTip === 'function'){ g.showTip(html, e); }
      });
      badge.addEventListener('mousemove', (e)=>{ if(typeof g.moveTip === 'function'){ g.moveTip(e); } });
      badge.addEventListener('mouseleave', ()=>{ if(typeof g.hideTip === 'function'){ g.hideTip(); } });
      (cardEl.querySelector('.imgWrap') || cardEl).appendChild(badge);
    }catch(e){ /* silent */ }
  }

  function decorateLeaderBadges(){
    const cards = document.querySelectorAll('#roster .card');
    cards.forEach(card => {
      if(card.__leaderDecorated) return;
      const t = card.querySelector('.title') || card.querySelector('[data-title]') || card.querySelector('[class*="titl"]');
      if(!t) return;
      const disp = (t.getAttribute && t.getAttribute('data-title')) || t.textContent.trim();
      addLeaderBadgeToCard(card, disp);
      if(card.querySelector('.leaderTag')) card.__leaderDecorated = true;
    });
  }

  function wrapRenderRosterForLeaders(){
    if(typeof g.renderRoster==='function' && !g.renderRoster.__leaderWrapped){
      const _rr = g.renderRoster;
      g.renderRoster = function(){ _rr(); try{ decorateLeaderBadges(); }catch(e){} };
      g.renderRoster.__leaderWrapped = true;
    }
  }

  function wrapCardFactoryForLeaders(){
    if(typeof g.card==='function' && !g.card.__leaderWrapped){
      const _card = g.card;
      g.card = function(u){
        const el = _card(u);
        try{ addLeaderBadgeToCard(el, displayName(u && u.name)); }catch(e){}
        return el;
      };
      g.card.__leaderWrapped = true;
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    wrapCardFactoryForLeaders();
    wrapRenderRosterForLeaders();
    // Observe roster changes
    try{
      const roster = document.getElementById('roster');
      if(roster && !roster.__leaderObs){
        const obs = new MutationObserver(()=> { try{ decorateLeaderBadges(); }catch(e){} });
        obs.observe(roster, { childList:true, subtree:true });
        roster.__leaderObs = obs;
      }
    }catch(e){}
    decorateLeaderBadges();
    setTimeout(()=>decorateLeaderBadges(), 0);
  });
})();

// --- End GC_LeaderBadge.js ---
