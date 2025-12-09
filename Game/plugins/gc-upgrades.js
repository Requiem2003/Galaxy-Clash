// File: Game/plugins/gc-upgrades.js
// Description: Drop-in improvements for Galaxy Clash (no deps). Attaches to window.GC.
(function () {
  const g = (typeof window !== 'undefined' ? window : globalThis);
  const GC = (g.GC = g.GC || {});
  GC.__version = (GC.__version || '2.x') + '+upgrades';

  /**
   * EventBus – Decouple systems. Keep gameplay modules unaware of each other.
   */
  class EventBus {
    constructor() { this._m = new Map(); }
    on(type, fn) {
      const arr = this._m.get(type) || []; arr.push(fn); this._m.set(type, arr); return () => this.off(type, fn);
    }
    once(type, fn) { const off = this.on(type, (e) => { off(); fn(e); }); return off; }
    off(type, fn) {
      const arr = this._m.get(type); if (!arr) return; const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1);
      if (!arr.length) this._m.delete(type);
    }
    emit(type, payload) { const arr = this._m.get(type); if (!arr) return 0; for (const f of [...arr]) try { f(payload); } catch (e) { console.error(e); } return arr.length; }
    clear(){ this._m.clear(); }
  }

  /**
   * Random – Seeded PRNG so battles are reproducible and testable.
   */
  class Random {
    constructor(seed = Date.now() >>> 0) { this.setSeed(seed); }
    setSeed(seed) { this.seed = (seed >>> 0) || 1; this._s = this.seed; return this; }
    // Mulberry32
    next() { let t = (this._s += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    range(min, max) { return min + this.next() * (max - min); }
    int(min, max) { return Math.floor(this.range(min, max + 1)); }
    pick(arr) { return arr[(this.next() * arr.length) | 0]; }
    shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = (this.next() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  }

  /**
   * ObjectPool – Reuse bullets/particles to reduce GC and stutter.
   */
  class ObjectPool {
    constructor(factory, reset, size = 32) {
      this._make = factory; this._reset = reset; this._free = []; this._all = new Set();
      for (let i = 0; i < size; i++) this._free.push(this._track(factory()));
    }
    _track(obj){ this._all.add(obj); return obj; }
    acquire() { return this._free.pop() || this._track(this._make()); }
    release(obj) { if (!this._all.has(obj)) return; try { this._reset && this._reset(obj); } finally { this._free.push(obj); } }
    warm(n){ for(let i=0;i<n;i++) this._free.push(this._track(this._make())); }
    stats(){ return { total: this._all.size, free: this._free.length, used: this._all.size - this._free.length }; }
  }

  /**
   * Save – Versioned localStorage with namespacing and migration.
   */
  class Save {
    constructor(key = 'gc.save', version = 1) { this.key = key; this.version = version; this.data = this._load(); }
    _load(){ try{ const raw = localStorage.getItem(this.key); if(!raw) return { v:this.version, d:{} };
      const obj = JSON.parse(raw); if(obj.v !== this.version){ obj.d = this.migrate(obj.d, obj.v, this.version); obj.v = this.version; this._commit(obj); } return obj; } catch { return { v:this.version, d:{} }; } }
    migrate(d, from, to){ /* why: let devs reshape data safely */ return d; }
    _commit(obj){ try{ localStorage.setItem(this.key, JSON.stringify(obj)); }catch(e){ console.warn('Save failed', e); } }
    get(path, def){ const v = path.split('.').reduce((a,k)=> a && a[k], this.data.d); return v === undefined ? def : v; }
    set(path, val){ const parts = path.split('.'); let cur = this.data.d; for(let i=0;i<parts.length-1;i++){ cur = cur[parts[i]] = (cur[parts[i]] ?? {}); } cur[parts.at(-1)] = val; this._commit(this.data); return val; }
    remove(path){ const parts = path.split('.'); let cur = this.data.d; for(let i=0;i<parts.length-1;i++){ if(!cur[parts[i]]) return; cur = cur[parts[i]]; } delete cur[parts.at(-1)]; this._commit(this.data); }
    clear(){ this.data = { v:this.version, d:{} }; this._commit(this.data); }
  }

  /**
   * AssetLoader – Preload images/audio; report progress for a splash bar.
   */
  class AssetLoader {
    constructor() { this.items = []; this.onProgress = null; this.onComplete = null; }
    addImage(src){ this.items.push({ type:'img', src }); return this; }
    addAudio(src){ this.items.push({ type:'audio', src }); return this; }
    async load(){ let done = 0; const total = this.items.length; const prog = () => this.onProgress && this.onProgress(done/total);
      const loadOne = (it) => new Promise((res)=>{ if(it.type==='img'){ const img = new Image(); img.onload = () => { done++; prog(); res(img); }; img.onerror = () => { done++; prog(); res(null); }; img.src = it.src; } else {
            const a = new Audio(); a.oncanplaythrough = () => { done++; prog(); res(a); }; a.onerror = () => { done++; prog(); res(null); }; a.src = it.src; }
      });
      for (const it of this.items) await loadOne(it); this.onComplete && this.onComplete();
    }
  }

  /**
   * Audio – Simple mixer with master/music/sfx. Fallback when WebAudio unavailable.
   */
  class AudioManager {
    constructor(){ this.enabled = true; this.musicVol = 0.6; this.sfxVol = 0.8; this._ctx = null; this._music = null; this._playing = new Set(); }
    _lazyCtx(){ if(this._ctx || !('AudioContext' in g || 'webkitAudioContext' in g)) return; this._ctx = new (g.AudioContext||g.webkitAudioContext)(); }
    setMaster(v){ this.enabled = v > 0; this._applyVolumes(); }
    setMusic(v){ this.musicVol = v; this._applyVolumes(); }
    setSfx(v){ this.sfxVol = v; this._applyVolumes(); }
    _applyVolumes(){ for(const a of this._playing) { try { a.volume = (a.__isMusic ? this.musicVol : this.sfxVol) * (this.enabled ? 1 : 0); } catch{} } }
    playMusic(src, loop=true){ const a = new Audio(src); a.loop = loop; a.__isMusic = true; a.volume = this.musicVol * (this.enabled ? 1 : 0); a.play().catch(()=>{}); if(this._music) try{ this._music.pause(); }catch{} this._music = a; this._playing.add(a); return a; }
    stopMusic(){ if(this._music) { try{ this._music.pause(); }catch{} this._playing.delete(this._music); this._music = null; } }
    playSfx(src){ const a = new Audio(src); a.__isMusic = false; a.volume = this.sfxVol * (this.enabled ? 1 : 0); a.play().catch(()=>{}); a.onended = () => this._playing.delete(a); this._playing.add(a); return a; }
  }

  /**
   * Time – Central RAF loop so everything runs on delta time & can pause.
   */
  class Time {
    constructor(){ this.now = performance.now(); this.dt = 0; this.scale = 1; this.paused = false; this._sub = []; this.fps = 0; this._acc = 0; this._frames = 0; this._tick = this._tick.bind(this); requestAnimationFrame(this._tick); }
    onUpdate(fn){ this._sub.push(fn); return () => { const i = this._sub.indexOf(fn); if(i>=0) this._sub.splice(i,1); } }
    _tick(t){ const prev = this.now; this.now = t; const raw = (t - prev) / 1000; this.dt = (this.paused ? 0 : raw * this.scale);
      this._frames++; this._acc += raw; if(this._acc >= 0.5){ this.fps = Math.round(this._frames / this._acc); this._acc = 0; this._frames = 0; }
      for(const f of this._sub) try { f(this.dt, t); } catch(e){ console.error(e); }
      requestAnimationFrame(this._tick);
    }
    setPaused(p){ this.paused = !!p; }
  }

  /**
   * Input – Simple mapping of actions to keys/buttons with rebind support.
   */
  class Input {
    constructor(){ this.bindings = { up:['ArrowUp','KeyW'], down:['ArrowDown','KeyS'], left:['ArrowLeft','KeyA'], right:['ArrowRight','KeyD'], fire:['Space','Click0'], pause:['Escape'] }; this.state = new Map(); this._down = new Set(); this._setup(); }
    _setup(){ addEventListener('keydown', e=>{ this._down.add(e.code); this.state.set(e.code, true); }); addEventListener('keyup', e=>{ this._down.delete(e.code); this.state.set(e.code, false); }); addEventListener('mousedown', e=>{ this._down.add('Click'+e.button); }); addEventListener('mouseup', e=>{ this._down.delete('Click'+e.button); }); addEventListener('blur', ()=> this._down.clear()); }
    is(action){ const keys = this.bindings[action] || []; return keys.some(k=> this._down.has(k)); }
    rebind(action, codes){ this.bindings[action] = codes; }
  }

  /**
   * Tween – Tiny easing for UI polish and feedback.
   */
  class Tween {
    static easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
    static animate(duration, onStep, onDone){ const start = performance.now(); function step(now){ const t = Math.min(1, (now - start)/duration); onStep(t); if(t<1) requestAnimationFrame(step); else onDone && onDone(); } requestAnimationFrame(step); }
  }

  /**
   * Debug – Overlay to watch FPS and counts; toggle with `~`.
   */
  class DebugOverlay {
    constructor(time, pools){ this.time = time; this.pools = pools; this.el = document.createElement('div'); this.el.className = 'gc-debug'; document.body.appendChild(this.el); this._vis = false; addEventListener('keydown', e=>{ if(e.key==='`') this.toggle(); }); this._update = this._update.bind(this); time.onUpdate(this._update); }
    toggle(){ this._vis = !this._vis; this.el.style.display = this._vis ? 'block' : 'none'; }
    _update(){ if(!this._vis) return; const poolStats = [...(this.pools||[])].map(p=>p.stats()).map((s,i)=>`P${i} used:${s.used} free:${s.free}`).join(' | ');
      this.el.textContent = `FPS ${this.time.fps}  scale ${this.time.scale.toFixed(2)}  ${poolStats}`; }
  }

  /**
   * Settings UI – In-game panel for audio, difficulty, motion.
   */
  class SettingsUI {
    constructor(save, audio, time){ this.save = save; this.audio = audio; this.time = time; this.root = document.createElement('div'); this.root.className = 'gc-settings'; this.root.innerHTML = this._tpl(); document.body.appendChild(this.root);
      this._bind(); this.hide(); this._applyFromSave(); this._makeButton(); }
    _tpl(){ return `
      <div class="gc-modal">
        <header>Settings</header>
        <label>Master <input id="mvol" type="range" min="0" max="1" step="0.01"></label>
        <label>Music <input id="music" type="range" min="0" max="1" step="0.01"></label>
        <label>SFX <input id="sfx" type="range" min="0" max="1" step="0.01"></label>
        <label>Difficulty <select id="diff"><option>Easy</option><option>Normal</option><option>Hard</option></select></label>
        <label>Reduce Motion <input id="motion" type="checkbox"></label>
        <footer>
          <button id="resume">Resume</button>
          <button id="reset">Reset</button>
        </footer>
      </div>`; }
    _bind(){ const $ = (id)=> this.root.querySelector(id);
      $('#resume').onclick = ()=> this.hide();
      $('#reset').onclick = ()=> { this.save.clear(); location.reload(); };
      $('#mvol').oninput = (e)=>{ const v=+e.target.value; this.audio.setMaster(v); this.save.set('audio.master', v); };
      $('#music').oninput = (e)=>{ const v=+e.target.value; this.audio.setMusic(v); this.save.set('audio.music', v); };
      $('#sfx').oninput = (e)=>{ const v=+e.target.value; this.audio.setSfx(v); this.save.set('audio.sfx', v); };
      $('#diff').onchange = (e)=>{ this.save.set('game.difficulty', e.target.value); };
      $('#motion').onchange = (e)=>{ this.save.set('ux.reduceMotion', !!e.target.checked); document.documentElement.classList.toggle('gc-reduce-motion', !!e.target.checked); };
      addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ if(this.root.style.display==='none') this.show(); else this.hide(); } });
    }
    _applyFromSave(){ const m = this.save.get('audio.master', 1); const mu = this.save.get('audio.music', 0.6); const s = this.save.get('audio.sfx', 0.8); const d = this.save.get('game.difficulty', 'Normal'); const rm = !!this.save.get('ux.reduceMotion', false);
      const $ = (id)=> this.root.querySelector(id);
      $('#mvol').value = m; $('#music').value = mu; $('#sfx').value = s; $('#diff').value = d; $('#motion').checked = rm;
      this.audio.setMaster(m); this.audio.setMusic(mu); this.audio.setSfx(s); document.documentElement.classList.toggle('gc-reduce-motion', rm);
    }
    _makeButton(){ const btn = document.createElement('button'); btn.className = 'gc-settings-btn'; btn.title = 'Settings'; btn.textContent = '⚙'; btn.onclick = ()=> this.show(); document.body.appendChild(btn); }
    show(){ this.root.style.display = 'block'; if(this.time) this.time.setPaused(true); }
    hide(){ this.root.style.display = 'none'; if(this.time) this.time.setPaused(false); }
  }

  // Wire everything into GC
  const bus = (GC.bus = GC.bus || new EventBus());
  const random = (GC.random = GC.random || new Random());
  const time = (GC.time = GC.time || new Time());
  const save = (GC.save = GC.save || new Save('gc.save', 1));
  const audio = (GC.audio = GC.audio || new AudioManager());
  const input = (GC.input = GC.input || new Input());
  GC.Tween = GC.Tween || Tween;
  GC.ObjectPool = GC.ObjectPool || ObjectPool;
  GC.AssetLoader = GC.AssetLoader || AssetLoader;

  // Try to auto-hook an existing GC.Core.update if present.
  if (GC.Core && typeof GC.Core.update === 'function' && !GC.__loopHooked) {
    GC.__loopHooked = true;
    time.onUpdate((dt, t) => GC.Core.update(dt, t));
  }

  // Debug overlay (can be hidden by CSS in prod)
  const debug = new DebugOverlay(time, /* provide pools here if you create them */ []);
  debug.el.style.display = 'none'; // default hidden

  // Settings Panel
  new SettingsUI(save, audio, time);

  // Emit ready – other plugins can wait for this
  bus.emit('app:ready', { seed: random.seed, saveVersion: save.version });
})();