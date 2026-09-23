// World map level select for Bounce's Big Adventure -- vanilla Canvas + Web Audio, no dependencies.
// Exposes a single global, createWorldMap(), which game.js uses to show/hide the map.
function createWorldMap({ levels, onPlay, onBack }) {
  const $ = id => document.getElementById(id);
  const canvas = $("world-map"), ctx = canvas.getContext("2d");
  const card = { root:$("map-card"), icon:$("map-card-icon"), eyebrow:$("map-card-eyebrow"), name:$("map-card-name"), desc:$("map-card-desc"), stars:$("map-card-stars"), secrets:$("map-secrets"), play:$("map-play-btn") };
  const toastEl = $("map-toast"), muteBtn = $("map-mute");
  const W = 800, H = 450, TAU = Math.PI * 2, FONT = "'Trebuchet MS', 'Segoe UI', sans-serif", INK = "#34294f";

  // ---- Map layout: one node per level, joined by quadratic-curve path segments (CTRL[i] joins node i -> i+1). ----
  const NODES = [
    { x:140, y:330, color:"#ffd65c", side:"#d9a21f" },
    { x:258, y:212, color:"#ff8a7a", side:"#c9483d" },
    { x:402, y:284, color:"#8fd0ff", side:"#4a95d6" },
    { x:548, y:200, color:"#ffab73", side:"#d4733a" },
    { x:672, y:100, color:"#c3b4ff", side:"#7d68d6" }
  ];
  const CTRL = [[238,332],[340,178],[500,318],[568,108]];
  const COUNT = Math.min(NODES.length, levels.length);
  const SECRET_TOTAL = 6, SPEED = 175, HOP = 44;

  // Arc-length lookup table so the bunny moves (and dots are spaced) at a constant speed along the curves.
  const samples = [{ x:NODES[0].x, y:NODES[0].y, s:0 }], nodeS = [0];
  for (let i = 0, total = 0; i < COUNT - 1; i++) {
    const a = NODES[i], b = NODES[i + 1], c = CTRL[i];
    let prev = samples[samples.length - 1];
    for (let k = 1; k <= 60; k++) {
      const t = k / 60, u = 1 - t;
      const p = { x:u*u*a.x + 2*u*t*c[0] + t*t*b.x, y:u*u*a.y + 2*u*t*c[1] + t*t*b.y };
      total += Math.hypot(p.x - prev.x, p.y - prev.y); p.s = total; samples.push(p); prev = p;
    }
    nodeS.push(total);
  }
  function pointAt(s) {
    s = Math.max(0, Math.min(nodeS[COUNT - 1], s));
    let i = 1; while (i < samples.length - 1 && samples[i].s < s) i++;
    const a = samples[i - 1], b = samples[i] || a, f = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    return { x:a.x + (b.x - a.x) * f, y:a.y + (b.y - a.y) * f };
  }

  // ---- Shapes ----
  function rng(seed) { return () => (seed = seed * 16807 % 2147483647) / 2147483647; }
  function smoothPath(pts) {
    const p = new Path2D(), n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m = mid(pts[n - 1], pts[0]); p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const nx = mid(pts[i], pts[(i + 1) % n]); p.quadraticCurveTo(pts[i][0], pts[i][1], nx[0], nx[1]); }
    p.closePath(); return p;
  }
  const ISLAND_PTS = [[80,290],[92,196],[160,132],[262,104],[372,114],[470,80],[575,50],[680,38],[742,70],[754,165],[728,250],[684,330],[592,378],[470,398],[330,404],[200,398],[108,372]];
  const cx0 = ISLAND_PTS.reduce((a, p) => a + p[0], 0) / ISLAND_PTS.length, cy0 = ISLAND_PTS.reduce((a, p) => a + p[1], 0) / ISLAND_PTS.length;
  const offset = d => ISLAND_PTS.map(([x, y]) => { const l = Math.hypot(x - cx0, y - cy0); return [x + (x - cx0) / l * d, y + (y - cy0) / l * d]; });
  const ISLAND = smoothPath(ISLAND_PTS), GRASS = smoothPath(offset(-10)), FOAM = smoothPath(offset(17)), FOAM2 = smoothPath(offset(30));
  function blob(cx, cy, rx, ry, seed, n = 11) { const r = rng(seed); return smoothPath(Array.from({ length:n }, (_, i) => { const a = i / n * TAU, j = .8 + r() * .35; return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]; })); }
  const probe = document.createElement("canvas").getContext("2d");
  const onLand = (x, y) => probe.isPointInPath(ISLAND, x, y);
  const nearPath = (x, y, d) => samples.some(p => Math.hypot(p.x - x, p.y - y) < d) || NODES.some(n => Math.hypot(n.x - x, n.y - y) < d + 16);
  function drawStarShape(g, x, y, r, spikes = 5) { g.beginPath(); for (let i = 0; i < spikes * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / spikes, rr = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // ---- Static scenery, rendered once to an offscreen canvas ----
  let dpr = 1, staticLayer = null;
  function buildStatic() {
    const c = document.createElement("canvas"); c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext("2d"); g.scale(dpr, dpr); g.lineJoin = "round"; g.lineCap = "round";
    let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#5ccaf2"); gr.addColorStop(1, "#3c98dc"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    let r = rng(7); g.fillStyle = "#ffffff12"; for (let i = 0; i < 220; i++) { g.beginPath(); g.ellipse(r() * W, r() * H, 6 + r() * 16, 1.3, 0, 0, TAU); g.fill(); }
    g.strokeStyle = "#8fe0f566"; g.lineWidth = 64; g.stroke(ISLAND);
    g.strokeStyle = "#a6ecf8"; g.lineWidth = 34; g.stroke(ISLAND);
    g.fillStyle = "#f6e3a6"; g.fill(ISLAND); g.strokeStyle = "#f6e3a6"; g.lineWidth = 12; g.stroke(ISLAND);
    g.save(); g.translate(0, 5); g.fillStyle = "#5f9e48"; g.fill(GRASS); g.restore();
    gr = g.createLinearGradient(0, 450, 800, 0); gr.addColorStop(0, "#9bdc6f"); gr.addColorStop(1, "#7cc466"); g.fillStyle = gr; g.fill(GRASS);

    // Meadow (level 1): light grass, flowers, Bounce's burrow and a little carrot patch.
    g.fillStyle = "#b8e883"; g.fill(blob(150, 330, 100, 62, 3));
    r = rng(11); const petals = ["#ff8fb3", "#ffd23f", "#ffffff", "#c9a6ff"];
    for (let i = 0; i < 70; i++) { const x = 70 + r() * 190, y = 280 + r() * 110; if (!probe.isPointInPath(GRASS, x, y) || nearPath(x, y, 9)) continue; g.fillStyle = petals[i % 4]; g.beginPath(); g.arc(x, y, 2.3, 0, TAU); g.fill(); g.fillStyle = "#ff9d3c"; g.beginPath(); g.arc(x, y, .9, 0, TAU); g.fill(); }
    g.fillStyle = "#6fae4c"; g.beginPath(); g.ellipse(196, 376, 24, 15, 0, Math.PI, TAU); g.fill(); g.fillStyle = "#83c35b"; g.beginPath(); g.ellipse(196, 374, 20, 12, 0, Math.PI, TAU); g.fill();
    g.fillStyle = "#5a3d2b"; g.beginPath(); g.ellipse(196, 376, 7.5, 8, 0, Math.PI, TAU); g.fill(); g.fillStyle = "#ffd65c"; g.beginPath(); g.arc(199, 371, 1.2, 0, TAU); g.fill();
    g.fillStyle = "#b07a4f"; g.beginPath(); g.ellipse(240, 380, 22, 8, 0, 0, TAU); g.fill(); g.strokeStyle = "#8a5a36"; g.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(222, 380 + i * 3.5); g.lineTo(258, 380 + i * 3.5); g.stroke(); }
    g.fillStyle = "#6fcf5b"; [[228, 377], [252, 383]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y - 3, 2, 4, 0, 0, TAU); g.fill(); });
    // Pond with a lily pad.
    g.fillStyle = "#6ec6ea"; g.beginPath(); g.ellipse(318, 370, 28, 12, 0, 0, TAU); g.fill(); g.strokeStyle = "#e9f9ff"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "#5fae5a"; g.beginPath(); g.moveTo(312, 369); g.arc(312, 369, 6, .3, TAU - .3); g.closePath(); g.fill(); g.fillStyle = "#ff8fb3"; g.beginPath(); g.arc(328, 372, 2.2, 0, TAU); g.fill();

    // Mushroom grove (level 2): shady ground, round trees, giant spotted mushrooms.
    g.fillStyle = "#63ac56"; g.fill(blob(262, 196, 92, 62, 5));
    r = rng(23); const trees = [];
    for (let i = 0; i < 90 && trees.length < 16; i++) { const x = 175 + r() * 175, y = 140 + r() * 110; if (!probe.isPointInPath(GRASS, x, y - 10) || nearPath(x, y, 22) || trees.some(t => Math.hypot(t.x - x, t.y - y) < 24)) continue; trees.push({ x, y, s:.8 + r() * .5, m:i % 5 === 0 }); }
    trees.sort((a, b) => a.y - b.y).forEach(t => {
      g.fillStyle = "#2f5e3a33"; g.beginPath(); g.ellipse(t.x, t.y + 2, 12 * t.s, 4 * t.s, 0, 0, TAU); g.fill();
      if (t.m) { g.fillStyle = "#f3e2c7"; g.fillRect(t.x - 3 * t.s, t.y - 12 * t.s, 6 * t.s, 12 * t.s); g.fillStyle = "#e2544b"; g.beginPath(); g.arc(t.x, t.y - 12 * t.s, 11 * t.s, Math.PI, 0); g.fill(); g.fillStyle = "#fff"; [[-5, -4], [1, -8], [6, -3]].forEach(([dx, dy]) => { g.beginPath(); g.arc(t.x + dx * t.s, t.y + (dy - 12) * t.s, 1.8 * t.s, 0, TAU); g.fill(); }); return; }
      g.fillStyle = "#7a5238"; g.fillRect(t.x - 2.5, t.y - 10 * t.s, 5, 10 * t.s);
      g.fillStyle = "#3f8a47"; g.beginPath(); g.arc(t.x, t.y - 17 * t.s, 12 * t.s, 0, TAU); g.fill();
      g.fillStyle = "#58a85a"; g.beginPath(); g.arc(t.x - 3 * t.s, t.y - 20 * t.s, 7 * t.s, 0, TAU); g.fill();
    });

    // Cloudy cliffs (level 3): an extruded rocky plateau.
    const plateau = smoothPath([[338,284],[352,262],[394,252],[442,256],[466,276],[456,300],[410,310],[360,306]]);
    for (let d = 26; d > 0; d -= 2) { g.save(); g.translate(0, d); g.fillStyle = d > 20 ? "#6f7f99" : "#8a9ab0"; g.fill(plateau); g.restore(); }
    g.strokeStyle = "#7a8aa3"; g.lineWidth = 1.5; for (const y of [312, 322]) { g.beginPath(); g.moveTo(350, y); g.quadraticCurveTo(410, y + 10, 460, y - 12); g.stroke(); }
    g.fillStyle = "#dfe9f3"; g.fill(plateau); g.fillStyle = "#ffffff99"; g.beginPath(); g.ellipse(380, 266, 22, 6, -.1, 0, TAU); g.fill();

    // Twilight temple (level 4): dusky flagstones, broken pillars and a little temple.
    g.fillStyle = "#c9b8e4"; g.fill(blob(560, 225, 78, 52, 9));
    r = rng(31); g.fillStyle = "#b3a5d6"; for (let i = 0; i < 26; i++) { const x = 500 + r() * 120, y = 185 + r() * 80; if (nearPath(x, y, 7)) continue; g.beginPath(); g.ellipse(x, y, 5, 2.6, 0, 0, TAU); g.fill(); }
    const tx = 618, ty = 268; g.fillStyle = "#2c245033"; g.beginPath(); g.ellipse(tx, ty + 3, 34, 6, 0, 0, TAU); g.fill();
    g.fillStyle = "#8a7bb0"; g.fillRect(tx - 30, ty - 6, 60, 8); g.fillStyle = "#e7ddff"; for (let i = 0; i < 4; i++) g.fillRect(tx - 24 + i * 15, ty - 30, 7, 24);
    g.fillStyle = "#b3a5d6"; g.fillRect(tx - 30, ty - 36, 60, 7); g.beginPath(); g.moveTo(tx - 32, ty - 36); g.lineTo(tx, ty - 52); g.lineTo(tx + 32, ty - 36); g.closePath(); g.fill();
    g.fillStyle = "#ff9d5c"; g.beginPath(); g.arc(tx, ty - 42, 3, 0, TAU); g.fill();
    for (const [x, y, h] of [[492, 196, 18], [508, 172, 11]]) { g.fillStyle = "#2c245033"; g.beginPath(); g.ellipse(x, y + 1, 8, 3, 0, 0, TAU); g.fill(); g.fillStyle = "#e7ddff"; g.fillRect(x - 4, y - h, 8, h); g.fillStyle = "#b3a5d6"; g.fillRect(x - 6, y - h - 3, 12, 3); }

    // Aurora summit (level 5): snowy mountains with a flat summit for the final level.
    const mountain = (pts, lit, shade, snow) => {
      g.fillStyle = lit; g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x, y)); g.fill();
      const peak = pts.reduce((a, p) => p[1] < a[1] ? p : a); g.fillStyle = shade; g.beginPath(); g.moveTo(peak[0], peak[1]); pts.filter(p => p[0] > peak[0]).forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(peak[0] + 6, pts[pts.length - 1][1]); g.fill();
      g.fillStyle = "#fbfdff"; g.beginPath(); snow.forEach(([x, y]) => g.lineTo(x, y)); g.fill();
    };
    mountain([[704,196],[728,128],[742,190]], "#9aa8d6", "#7784b8", [[720,150],[728,128],[736,152],[730,146],[725,154]]);
    mountain([[566,214],[612,140],[660,214]], "#a9b5de", "#8390c2", [[601,158],[612,140],[623,158],[616,154],[608,162]]);
    mountain([[582,212],[628,146],[650,118],[662,96],[682,96],[696,116],[720,146],[738,208]], "#b3bfe6", "#8b97c9", [[650,118],[662,96],[682,96],[696,116],[688,112],[679,122],[670,111],[660,122]]);

    // Grass tufts everywhere on land.
    r = rng(41); g.strokeStyle = "#5c9e4a"; g.lineWidth = 1.3;
    for (let i = 0; i < 160; i++) { const x = 90 + r() * 650, y = 60 + r() * 330; if (!probe.isPointInPath(GRASS, x, y) || nearPath(x, y, 10) || (x > 560 && y < 215) || (x > 330 && x < 470 && y > 245 && y < 340)) continue; g.beginPath(); g.moveTo(x - 3, y - 4); g.lineTo(x, y); g.lineTo(x + 3, y - 4); g.stroke(); }

    // The journey runs from morning (bottom-left) to night (top-right).
    gr = g.createLinearGradient(0, 450, 800, 0);
    gr.addColorStop(0, "rgba(255,225,150,0.14)"); gr.addColorStop(.5, "rgba(255,170,130,0.05)"); gr.addColorStop(.78, "rgba(80,50,140,0.22)"); gr.addColorStop(1, "rgba(14,16,60,0.62)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    gr = g.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 520); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(30,20,70,0.28)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    staticLayer = c;
  }

  // ---- Ambient elements ----
  const waves = [], nightStars = [];
  { const r = rng(99); for (let i = 0; i < 400 && waves.length < 46; i++) { const x = 10 + r() * 780, y = 10 + r() * 430; if ([[0,0],[26,0],[-26,0],[0,26],[0,-26]].some(([dx, dy]) => onLand(x + dx, y + dy))) continue; waves.push({ x, y, p:r() * TAU }); }
    for (let i = 0; i < 300 && nightStars.length < 20; i++) { const x = 520 + r() * 280, y = r() * 170; if ((y > 34 && x < 770) || y > (x - 520) * .8 + 20) continue; nightStars.push({ x, y, p:r() * TAU, s:.6 + r() }); } }
  const clouds = [{ x:60, y:44, s:1, v:9 }, { x:420, y:26, s:.75, v:6 }, { x:520, y:150, s:.9, v:7 }, { x:-40, y:410, s:.85, v:8 }];
  const boat = { x:140, dir:1, boost:0, bob:0 };
  const WHALE_SPOTS = [[40, 150], [764, 402], [36, 238], [300, 20]];
  const whale = { spot:0, t:6, spout:0 };
  const bottle = { x:774, y:300 };
  const carrot = { x:240, y:380, pulled:false, t:0 };
  let shooting = null, nextShooting = 5;

  // ---- State ----
  let unlocked = 1, revealed = 1, best = [], target = 0, bunnyS = 0, hopPhase = 0, facing = 1, moving = false;
  let hover = -1, running = false, raf = 0, last = 0, time = 0, shownAt = 0, cardShown = -1;
  let iris = null, entering = null, pendingPlay = false, reveal = null, autoHop = 0;
  let pops = {}, shakes = {}, particles = [];
  let idle = 0, sleeping = false, squash = 0, boing = 0, flip = 0, clickTimes = [], nextZ = 0, confettiT = 0;
  let party = false, konami = 0;
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","KeyB","KeyA"];
  const secrets = new Set((() => { try { return JSON.parse(localStorage.getItem("bounce-secrets")) || []; } catch { return []; } })());
  let muted = localStorage.getItem("bounce-muted") === "1";

  // ---- Sound: tiny synthesized blips via Web Audio ----
  let actx = null;
  function tone(f, dur, { type = "sine", vol = .1, to, delay = 0 } = {}) {
    if (muted) return;
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
    if (actx.state === "suspended") actx.resume();
    const t0 = actx.currentTime + delay, o = actx.createOscillator(), gn = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    gn.gain.setValueAtTime(.0001, t0); gn.gain.exponentialRampToValueAtTime(vol, t0 + .012); gn.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(gn).connect(actx.destination); o.start(t0); o.stop(t0 + dur + .05);
  }
  const arp = (notes, gap, opts) => notes.forEach((f, i) => tone(f, .18, { type:"triangle", vol:.06, ...opts, delay:i * gap }));
  const SFX = {
    hop: () => tone(360 + Math.random() * 90, .11, { to:700, vol:.05 }),
    select: () => tone(880, .07, { vol:.05 }),
    arrive: () => { tone(660, .09, { vol:.05 }); tone(990, .12, { vol:.045, delay:.07 }); },
    locked: () => { tone(170, .1, { type:"square", vol:.03, to:120 }); tone(160, .12, { type:"square", vol:.03, to:110, delay:.12 }); },
    tick: () => tone(1300 + Math.random() * 400, .04, { vol:.025 }),
    unlock: () => arp([523, 659, 784, 1047], .08),
    secret: () => arp([784, 988, 1175, 1568, 2093], .07, { vol:.05 }),
    enter: () => tone(300, .45, { to:1150, vol:.07 }),
    boing: () => tone(240, .2, { to:620, vol:.06, type:"triangle" }),
    flip: () => tone(300, .5, { to:1500, vol:.06, type:"triangle" }),
    whale: () => { tone(150, .8, { to:95, vol:.09 }); tone(220, .5, { to:140, vol:.04, delay:.15 }); },
    honk: () => { tone(233, .15, { type:"square", vol:.03 }); tone(233, .22, { type:"square", vol:.03, delay:.19 }); },
    pop: () => tone(520, .09, { to:1250, vol:.05 }),
    plip: () => tone(900 + Math.random() * 500, .07, { to:320, vol:.035 }),
    party: () => arp([523, 659, 784, 659, 784, 1047], .09, { type:"square", vol:.03 })
  };
  const sfx = name => SFX[name]();

  // ---- Particles ----
  function burst(x, y, n, kind, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + (Math.random() - .5) * (o.spread || 1) : Math.random() * TAU, sp = (o.speed || 60) * (.5 + Math.random() * .8);
      particles.push({ x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, g:o.g ?? 0, life:0, max:(o.life || .7) * (.7 + Math.random() * .6), size:o.size || 3, kind, rot:Math.random() * TAU, vr:(Math.random() - .5) * 10,
        color:o.colors ? o.colors[i % o.colors.length] : o.color || "#fff", text:o.text });
    }
  }
  const CONFETTI = ["#ff8fb3", "#ffd23f", "#7cc8ff", "#8fe07a", "#c58cff", "#ff9d5c"];
  function drawParticles() {
    for (const p of particles) {
      const k = p.life / p.max, a = Math.max(0, 1 - k); ctx.globalAlpha = a;
      if (p.kind === "dust") { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + k * 1.5), 0, TAU); ctx.fill(); }
      else if (p.kind === "confetti") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size); ctx.restore(); }
      else if (p.kind === "spark") { ctx.fillStyle = p.color; drawStarShape(ctx, p.x, p.y, p.size * (1 - k * .5), 4); ctx.fill(); }
      else if (p.kind === "ring") { ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4 + k * 22, 2 + k * 9, 0, 0, TAU); ctx.stroke(); }
      else if (p.kind === "text") { ctx.fillStyle = p.color; ctx.font = `bold ${p.size}px ${FONT}`; ctx.textAlign = "center"; ctx.fillText(p.text, p.x, p.y); }
    }
    ctx.globalAlpha = 1;
  }

  // ---- Drawing helpers ----
  function drawCloud(x, y, s, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, 14 * s, 0, TAU); ctx.arc(x + 16 * s, y - 8 * s, 17 * s, 0, TAU); ctx.arc(x + 34 * s, y, 14 * s, 0, TAU); ctx.ellipse(x + 17 * s, y + 5 * s, 26 * s, 10 * s, 0, 0, TAU); ctx.fill(); }
  function drawBunny(x, gy, h, sq, face, closed, rot) {
    const sh = 1 - Math.min(h, 40) / 60;
    ctx.fillStyle = "rgba(40,30,70,.25)"; ctx.beginPath(); ctx.ellipse(x, gy + 1, 12 * sh, 4 * sh, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, gy - h);
    if (rot) { ctx.translate(0, -13); ctx.rotate(rot); ctx.translate(0, 13); }
    ctx.scale(face * (1 + sq), 1 - sq);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    const ellipse = (ex, ey, rx, ry, r, fill, stroke = true) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, r, 0, TAU); ctx.fill(); if (stroke) ctx.stroke(); };
    const earTilt = Math.sin(time * 2.2) * .06 + (moving ? -.25 : 0);
    ellipse(-10, -9, 4, 4, 0, "#fff");
    ellipse(-4, -29, 3.8, 10, -.2 + earTilt, "#fff"); ellipse(-4, -29, 1.8, 6, -.2 + earTilt, "#ffc4dd", false);
    ellipse(4, -30, 3.8, 10, .15 + earTilt, "#fff"); ellipse(4, -30, 1.8, 6, .15 + earTilt, "#ffc4dd", false);
    ellipse(0, -12, 11.5, 12, 0, "#fff");
    ellipse(-5, -1, 4, 2.2, 0, "#fff"); ellipse(5, -1, 4, 2.2, 0, "#fff");
    ctx.fillStyle = "#ffb6c1aa"; ctx.beginPath(); ctx.arc(7.5, -9, 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ff8fb3"; ctx.beginPath(); ctx.arc(10, -12, 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = INK; ctx.lineWidth = 1.4;
    for (const ex of [1, 6]) { if (closed) { ctx.beginPath(); ctx.arc(ex, -15, 2, .2, Math.PI - .2); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(ex, -15, 1.9, 0, TAU); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex + .6, -15.7, .6, 0, TAU); ctx.fill(); ctx.fillStyle = INK; } }
    if (party) {
      ctx.save(); ctx.translate(-1, -23); ctx.rotate(-.2);
      ctx.fillStyle = "#ff8fb3"; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, -16); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3.5, -6); ctx.lineTo(3.5, -6); ctx.stroke();
      ctx.fillStyle = "#7cc8ff"; ctx.beginPath(); ctx.arc(0, -17, 2.6, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  function drawNode(i) {
    const n = NODES[i], locked = i >= revealed, hov = hover === i && !locked;
    let sc = 1, ox = 0;
    if (pops[i] != null) { const p = Math.min(1, pops[i]); sc = 1 + Math.sin(p * Math.PI) * .45 - (1 - p) * .6; }
    if (shakes[i] > 0) ox = Math.sin(shakes[i] * 55) * 5 * shakes[i] / .45;
    const lift = hov ? -3 - Math.sin(time * 6) : 0, top = locked ? "#d4cfdc" : n.color, side = locked ? "#9d97ab" : n.side;
    ctx.fillStyle = "rgba(40,30,70,.22)"; ctx.beginPath(); ctx.ellipse(n.x + ox, n.y + 9, 26, 10, 0, 0, TAU); ctx.fill();
    if (i === target && !locked && !entering) { const ph = time * 1.1 % 1; ctx.strokeStyle = `rgba(255,255,255,${1 - ph})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(n.x, n.y + 3, 24 + ph * 14, 12 + ph * 7, 0, 0, TAU); ctx.stroke(); }
    ctx.save(); ctx.translate(n.x + ox, n.y + lift); ctx.scale(sc, sc);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.fillStyle = side; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-22, 6); ctx.ellipse(0, 6, 22, 11, 0, Math.PI, 0, true); ctx.lineTo(22, 0); ctx.ellipse(0, 0, 22, 11, 0, 0, Math.PI, true); ctx.fill(); ctx.stroke();
    ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(0, 0, 22, 11, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffffff66"; ctx.beginPath(); ctx.ellipse(-7, -3, 9, 3.5, 0, 0, TAU); ctx.fill();
    if (locked) {
      ctx.fillStyle = "#766c8b"; roundRect(ctx, -6, -6, 12, 9, 2); ctx.fill();
      ctx.strokeStyle = "#766c8b"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, -6, 4, Math.PI, 0); ctx.stroke();
    }
    const done = !locked && (best[i] != null || i < unlocked - 1);
    if (done) {
      const w = Math.sin(time * 5 + i) * 2.5;
      ctx.strokeStyle = "#a9a9a9"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(19, 2); ctx.lineTo(19, -30); ctx.stroke();
      ctx.fillStyle = "#4caf50"; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(20, -30); ctx.quadraticCurveTo(28, -28 + w, 36, -25 + w); ctx.quadraticCurveTo(28, -22 + w, 20, -20); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (best[i] === levels[i].stars.length) { ctx.save(); ctx.translate(19, -36); ctx.rotate(Math.sin(time * 2) * .25); ctx.fillStyle = "#ffd23f"; ctx.strokeStyle = "#e6a700"; ctx.lineWidth = 1.4; drawStarShape(ctx, 0, 0, 6.5); ctx.fill(); ctx.stroke(); ctx.restore(); }
    }
    ctx.fillStyle = locked ? "#9d97ab" : "#8668df"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 26, 9, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(i + 1, 0, 26.5); ctx.textBaseline = "alphabetic";
    ctx.restore();
  }
  function drawLabel(i) {
    const n = NODES[i], lv = levels[i], locked = i >= revealed;
    const title = locked ? `🔒 Level ${i + 1}` : `${lv.icon} ${lv.name}`;
    const sub = locked ? `Finish level ${i} to unlock` : i === target && !moving ? "Click to play!" : `Level ${i + 1} · click to hop here`;
    ctx.font = `bold 13px ${FONT}`; const w1 = ctx.measureText(title).width; ctx.font = `11px ${FONT}`; const w = Math.max(w1, ctx.measureText(sub).width) + 22;
    const x = Math.max(6, Math.min(W - w - 6, n.x - w / 2)), y = n.y - 88 + Math.sin(time * 4) * 1.5;
    ctx.fillStyle = "rgba(52,41,79,.18)"; roundRect(ctx, x, y + 3, w, 38, 11); ctx.fill();
    ctx.fillStyle = "#fffdfb"; roundRect(ctx, x, y, w, 38, 11); ctx.fill();
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.font = `bold 13px ${FONT}`; ctx.fillText(title, x + w / 2, y + 17);
    ctx.fillStyle = locked ? "#766c8b" : "#8668df"; ctx.font = `11px ${FONT}`; ctx.fillText(sub, x + w / 2, y + 31);
  }
  function drawPath() {
    for (let s = 12; s < nodeS[COUNT - 1] - 8; s += 13) {
      if (nodeS.some(ns => Math.abs(ns - s) < 20)) continue;
      let seg = 0; while (seg < COUNT - 2 && s > nodeS[seg + 1]) seg++;
      const p = pointAt(s);
      let open = seg < revealed - 1, sc = 1;
      if (reveal && seg === reveal.seg) { const edge = nodeS[seg] + (nodeS[seg + 1] - nodeS[seg]) * reveal.t; open = s < edge; sc = 1 + Math.max(0, 1 - (edge - s) / 26) * .6; }
      if (!open) { ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fill(); continue; }
      const bob = party ? Math.sin(time * 8 + s / 15) * 2 : 0;
      ctx.fillStyle = "rgba(90,60,40,.35)"; ctx.beginPath(); ctx.arc(p.x, p.y + 1.4, 3.6 * sc, 0, TAU); ctx.fill();
      ctx.fillStyle = party ? `hsl(${(time * 140 + s) % 360},90%,72%)` : "#fff6dc"; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 3.2 * sc, 0, TAU); ctx.fill();
    }
  }
  function whaleVis() { const t = whale.t; return t < 8 ? 0 : t < 8.8 ? (t - 8) / .8 : t < 12.5 ? 1 : t < 13.3 ? 1 - (t - 12.5) / .8 : 0; }
  function drawWhale() {
    const v = whaleVis(); if (v <= 0) return;
    const [x, y] = WHALE_SPOTS[whale.spot], sink = (1 - v) * 10;
    ctx.strokeStyle = `rgba(255,255,255,${.7 * v})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 2, 26 + Math.sin(time * 3) * 2, 7, 0, 0, TAU); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.rect(x - 40, y - 40, 80, 42); ctx.clip();
    ctx.fillStyle = "#4a67b5"; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y + 2 + sink, 20, 11, 0, Math.PI, TAU); ctx.fill(); ctx.stroke();
    const tw = Math.sin(time * 4) * 3; ctx.beginPath(); ctx.moveTo(x + 17, y + 1 + sink); ctx.quadraticCurveTo(x + 24, y - 4 + sink, x + 24, y - 9 + tw + sink); ctx.lineTo(x + 31, y - 12 + tw + sink); ctx.lineTo(x + 26, y - 5 + tw + sink); ctx.quadraticCurveTo(x + 24, y + sink, x + 20, y + 2 + sink); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x - 10, y - 3 + sink, 1.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x - 12, y - 1 + sink, 3, .3, 1.4); ctx.stroke();
    ctx.fillStyle = "#ff8fb366"; ctx.beginPath(); ctx.arc(x - 6, y - 1 + sink, 2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBottle() {
    const y = bottle.y + Math.sin(time * 1.6) * 2, r = Math.sin(time * 1.2) * .25;
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(bottle.x, y + 4, 15, 4, 0, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(bottle.x, y); ctx.rotate(r);
    ctx.fillStyle = "#9be3b2cc"; ctx.strokeStyle = "#2f6b50"; ctx.lineWidth = 1.3; roundRect(ctx, -9, -4.5, 14, 9, 4); ctx.fill(); ctx.stroke();
    ctx.fillRect(4, -2, 5, 4); ctx.strokeRect(4, -2, 5, 4); ctx.fillStyle = "#b07a4f"; ctx.fillRect(9, -2, 2.5, 4);
    ctx.fillStyle = "#fff3d0"; ctx.fillRect(-6, -2, 8, 3.5); ctx.restore();
  }
  function drawCarrot() {
    const { x, y } = carrot;
    if (!carrot.pulled) { const w = Math.sin(time * 2.5) * .12; ctx.fillStyle = "#4fb548"; for (const a of [-.45, 0, .45]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a + w); ctx.beginPath(); ctx.ellipse(0, -5, 1.8, 5, 0, 0, TAU); ctx.fill(); ctx.restore(); } return; }
    const k = Math.min(1, carrot.t / .7), px = x + k * 18, py = y - Math.sin(k * Math.PI) * 34 + k * 2, rot = k < 1 ? k * TAU * 1.5 : Math.PI / 2 - .2;
    ctx.fillStyle = "#5a3d2b"; ctx.beginPath(); ctx.ellipse(x, y, 4, 2, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
    ctx.fillStyle = "#ff9d3c"; ctx.strokeStyle = "#c9651b"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(0, 14); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#4fb548"; for (const a of [-.4, 0, .4]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -4, 1.6, 4.5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  function drawBoat() {
    const y = 431 + Math.sin(time * 2) * 1.5 - boat.bob, d = boat.dir;
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1.5; for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(boat.x - d * (16 + k * 7), y + 5); ctx.lineTo(boat.x - d * (22 + k * 7), y + 5); ctx.stroke(); }
    ctx.save(); ctx.translate(boat.x, y); ctx.scale(d, 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.fillStyle = "#b07a4f"; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(11, 7); ctx.lineTo(-12, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.stroke();
    ctx.fillStyle = "#fffdfb"; ctx.beginPath(); ctx.moveTo(2, -22); ctx.quadraticCurveTo(12, -12, 13, -2); ctx.lineTo(2, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff8fb3"; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-8, -21); ctx.lineTo(0, -18); ctx.fill();
    ctx.restore();
  }
  function drawAurora() {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ["#3cf2a8", "#5ec8ff", "#c07bff"].forEach((c, k) => {
      const gr = ctx.createLinearGradient(520, 0, 800, 0); gr.addColorStop(0, c + "00"); gr.addColorStop(.35, c); gr.addColorStop(1, c);
      ctx.strokeStyle = gr; ctx.beginPath();
      for (let x = 520; x <= 800; x += 10) { const y = 14 + k * 13 + Math.sin(x / 36 + time * .7 + k * 1.7) * 7 - (x - 520) * .02; x === 520 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.globalAlpha = .07; ctx.lineWidth = 30; ctx.stroke(); ctx.globalAlpha = .16; ctx.lineWidth = 10; ctx.stroke();
    });
    ctx.restore();
    for (const s of nightStars) { ctx.globalAlpha = .25 + .75 * Math.abs(Math.sin(time * s.s + s.p)); ctx.fillStyle = "#fff"; drawStarShape(ctx, s.x, s.y, 1.2 + s.s, 4); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  // ---- Bunny position helpers ----
  function bunnyState() {
    const p = pointAt(bunnyS);
    let h = Math.sin(Math.PI * (hopPhase % 1)) * 13, rot = 0;
    if (boing > 0) h += Math.sin(Math.PI * (1 - boing / .35)) * 11;
    if (flip > 0) { const k = 1 - flip / .8; h += Math.sin(Math.PI * k) * 36; rot = -facing * TAU * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); }
    if (entering) h += Math.sin(Math.PI * Math.min(1, entering.t / .45)) * 30;
    return { x:p.x, y:p.y, h, rot };
  }

  // ---- Interaction ----
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.remove("hidden", "show"); void toastEl.offsetWidth; toastEl.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("show"), 3600); }
  function findSecret(id, msg) {
    if (secrets.has(id)) { toast(msg); return; }
    secrets.add(id); localStorage.setItem("bounce-secrets", JSON.stringify([...secrets]));
    toast(`✨ Secret found! ${msg} (${secrets.size}/${SECRET_TOTAL})`); sfx("secret"); updateSecrets();
    if (secrets.size === SECRET_TOTAL) setTimeout(() => { toast("🏆 You found every secret on the island! Bounce is so proud."); sfx("party"); const b = bunnyState(); burst(b.x, b.y - 20, 70, "confetti", { colors:CONFETTI, speed:160, g:220, life:1.6, size:3 }); }, 3800);
  }
  function updateSecrets() { card.secrets.textContent = `🔍 ${secrets.size} / ${SECRET_TOTAL} secrets`; card.secrets.classList.toggle("hidden", secrets.size === 0); }
  function updateCard() {
    if (cardShown === target) return; cardShown = target;
    const i = target, lv = levels[i], total = lv.stars.length, b = best[i];
    card.icon.textContent = lv.icon; card.name.textContent = lv.name; card.desc.textContent = lv.description;
    card.eyebrow.textContent = `Level ${i + 1} · ${b === total ? "Perfect! 🌟" : b != null || i < unlocked - 1 ? "Completed ✓" : "New adventure!"}`;
    card.stars.textContent = `⭐ ${b ?? 0} / ${total} stars`;
    card.root.style.setProperty("--accent", NODES[i].color);
    card.root.classList.remove("pop"); void card.root.offsetWidth; card.root.classList.add("pop");
  }
  function wake() { idle = 0; if (sleeping) { sleeping = false; boing = .35; const b = bunnyState(); burst(b.x + 8, b.y - 40, 1, "text", { text:"!", color:"#ff8668", size:16, speed:12, angle:-Math.PI / 2, life:.8 }); } }
  function lockedFeedback(i) { shakes[i] = .45; sfx("locked"); toast(`🔒 ${levels[i] ? `Level ${i + 1} is locked — finish “${levels[i - 1].name}” first!` : "That's the edge of the map!"}`); }
  function goTo(i) {
    if (entering || i < 0 || i >= COUNT) return;
    wake();
    if (i >= revealed) { lockedFeedback(i); return; }
    if (i !== target) { target = i; pendingPlay = false; sfx("select"); updateCard(); }
  }
  function requestPlay() {
    if (entering || !running) return; wake();
    if (moving) { pendingPlay = true; return; }
    entering = { t:0, closing:false }; sfx("enter");
    const n = NODES[target]; burst(n.x, n.y, 14, "spark", { colors:["#fff", "#ffd23f"], speed:90, life:.6, size:4 });
  }
  function land() {
    squash = .28; sfx("hop");
    const b = pointAt(bunnyS); burst(b.x, b.y, 4, "dust", { color:"rgba(255,255,255,.8)", speed:24, life:.45, size:2.4 });
  }
  function hitTest(x, y) {
    if (shooting && Math.hypot(shooting.x - x, shooting.y - y) < 30) return { type:"star" };
    const b = bunnyState();
    if (Math.abs(x - b.x) < 13 && y > b.y - b.h - 40 && y < b.y - b.h - 2) return { type:"bunny" };
    for (let i = 0; i < COUNT; i++) { const n = NODES[i]; if (((x - n.x) / 27) ** 2 + ((y - n.y - 3) / 17) ** 2 < 1 || Math.hypot(x - n.x, y - n.y - 26) < 11) return { type:"node", i }; }
    if (!carrot.pulled && Math.hypot(x - carrot.x, y - carrot.y + 4) < 12) return { type:"carrot" };
    if (whaleVis() > .5 && Math.hypot(x - WHALE_SPOTS[whale.spot][0] - 4, y - WHALE_SPOTS[whale.spot][1]) < 30) return { type:"whale" };
    if (Math.hypot(x - bottle.x, y - bottle.y) < 17) return { type:"bottle" };
    if (Math.abs(x - boat.x) < 20 && y > 405 && y < 442) return { type:"boat" };
    return null;
  }
  function toMap(e) { const r = canvas.getBoundingClientRect(); return { x:(e.clientX - r.left) / r.width * W, y:(e.clientY - r.top) / r.height * H }; }
  canvas.addEventListener("mousemove", e => { const p = toMap(e), hit = hitTest(p.x, p.y); hover = hit && hit.type === "node" ? hit.i : -1; canvas.style.cursor = hit ? "pointer" : "default"; });
  canvas.addEventListener("mouseleave", () => { hover = -1; });
  canvas.addEventListener("click", e => {
    if (!running || entering) return;
    const { x, y } = toMap(e), hit = hitTest(x, y); wake();
    if (!hit) { onLand(x, y) ? burst(x, y, 5, "spark", { colors:["#fff", "#ffe98a"], speed:40, life:.5, size:3 }) : (burst(x, y, 2, "ring", { color:"rgba(255,255,255,.9)", speed:0, life:.9 }), sfx("plip")); return; }
    if (hit.type === "node") { if (hit.i === target) requestPlay(); else goTo(hit.i); }
    else if (hit.type === "bunny") {
      const now = performance.now(); clickTimes = clickTimes.filter(t => now - t < 1800); clickTimes.push(now);
      if (clickTimes.length >= 5 && flip <= 0) { clickTimes = []; flip = .8; sfx("flip"); setTimeout(() => { const b = bunnyState(); burst(b.x, b.y - 30, 7, "text", { text:"♥", colors:["#ff6f9f", "#ff9dc0"], size:14, speed:50, angle:-Math.PI / 2, spread:1.6, g:-10, life:1.2 }); findSecret("flip", "Bounce busts out a perfect backflip! 🤸"); }, 800); }
      else if (flip <= 0) { boing = .35; squash = -.15; sfx("boing"); }
    }
    else if (hit.type === "carrot") { carrot.pulled = true; carrot.t = 0; sfx("pop"); burst(carrot.x, carrot.y, 8, "dust", { color:"#8a5a36", speed:50, g:120, life:.6, size:2 }); setTimeout(() => { const b = bunnyState(); burst(b.x, b.y - 36, 3, "text", { text:"♥", color:"#ff6f9f", size:13, speed:30, angle:-Math.PI / 2, spread:1, life:1 }); }, 500); findSecret("carrot", "Bounce found a crunchy carrot in the garden! 🥕"); }
    else if (hit.type === "whale") { whale.spout = 1; whale.t = Math.min(whale.t, 9.5); sfx("whale"); findSecret("whale", "Wally the whale waves hello! 🐋"); }
    else if (hit.type === "bottle") { sfx("pop"); burst(bottle.x, bottle.y, 8, "dust", { color:"#e9f9ff", speed:50, g:140, life:.6, size:2 }); findSecret("bottle", "📜 A note in a bottle: “The best wishes are made on falling stars.”"); }
    else if (hit.type === "boat") { boat.boost = 1; boat.bob = 6; sfx("honk"); burst(boat.x, boat.y - 30, 1, "text", { text:"toot toot!", color:"#fff", size:12, speed:14, angle:-Math.PI / 2, life:1.1 }); }
    else if (hit.type === "star") { burst(shooting.x, shooting.y, 26, "spark", { colors:["#fff", "#ffd23f", "#c3b4ff"], speed:140, life:.9, size:5 }); shooting = null; findSecret("wish", "You caught a shooting star — make a wish! 🌠"); }
  });
  window.addEventListener("keydown", e => {
    if (!running || performance.now() - shownAt < 250) return;
    if (e.code === KONAMI[konami]) { konami++; if (konami === KONAMI.length) { konami = 0; party = true; sfx("party"); const b = bunnyState(); burst(b.x, b.y - 20, 80, "confetti", { colors:CONFETTI, speed:170, g:220, life:1.6, size:3 }); findSecret("konami", "Party mode unlocked! 🎉"); return; } }
    else konami = e.code === KONAMI[0] ? 1 : 0;
    if (entering || (e.target instanceof HTMLButtonElement && (e.code === "Enter" || e.code === "Space"))) return;
    if (["ArrowRight","ArrowUp","KeyD","KeyW"].includes(e.code)) goTo(target + 1);
    else if (["ArrowLeft","ArrowDown","KeyA","KeyS"].includes(e.code)) goTo(target - 1);
    else if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); requestPlay(); }
    else if (e.code === "Escape") onBack();
    else if (/^Digit[1-9]$/.test(e.code)) goTo(Number(e.code.slice(5)) - 1);
  });
  card.play.addEventListener("click", requestPlay);
  const renderMute = () => { muteBtn.textContent = muted ? "🔇" : "🔊"; muteBtn.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds"); };
  muteBtn.addEventListener("click", () => { muted = !muted; localStorage.setItem("bounce-muted", muted ? "1" : "0"); renderMute(); if (!muted) sfx("select"); });
  renderMute();

  // ---- Main loop ----
  function update(dt) {
    time += dt; idle += dt;
    for (const k in shakes) if ((shakes[k] -= dt) <= 0) delete shakes[k];
    for (const k in pops) if ((pops[k] += dt * 2.4) >= 1) delete pops[k];
    squash *= Math.pow(.0005, dt); if (boing > 0) boing -= dt; if (flip > 0) flip -= dt;

    // Walk / hop along the path toward the target node.
    const goal = nodeS[target], d = goal - bunnyS, wasMoving = moving;
    if (Math.abs(d) > .5) {
      const before = pointAt(bunnyS), step = Math.sign(d) * Math.min(Math.abs(d), SPEED * dt), f = Math.floor(hopPhase);
      bunnyS += step; hopPhase += Math.abs(step) / HOP; moving = true; idle = 0;
      const after = pointAt(bunnyS); if (Math.abs(after.x - before.x) > .05) facing = after.x > before.x ? 1 : -1;
      if (Math.floor(hopPhase) > f) land();
    } else {
      bunnyS = goal;
      if (hopPhase % 1 > 1e-6) { const f = Math.floor(hopPhase); hopPhase += dt * SPEED / HOP; if (Math.floor(hopPhase) > f) { hopPhase = Math.floor(hopPhase); land(); } }
      else moving = false;
    }
    if (wasMoving && !moving) { sfx("arrive"); if (pendingPlay) { pendingPlay = false; requestPlay(); } }

    // Reveal the path to a freshly unlocked level (after returning from a win).
    if (reveal && !iris) {
      const dots = Math.floor(reveal.t * 12); reveal.t = Math.min(1, reveal.t + dt / 1.1);
      if (Math.floor(reveal.t * 12) > dots) sfx("tick");
      if (reveal.t >= 1) {
        revealed++; const i = revealed - 1, n = NODES[i]; pops[i] = 0; sfx("unlock");
        burst(n.x, n.y - 6, 40, "confetti", { colors:CONFETTI, speed:150, g:200, life:1.3, size:3 });
        toast(`🎉 ${levels[i].icon} ${levels[i].name} unlocked!`);
        reveal = revealed < unlocked ? { seg:revealed - 1, t:0 } : null; if (!reveal) autoHop = .6;
      }
    }
    if (autoHop > 0 && (autoHop -= dt) <= 0) goTo(revealed - 1);

    // Idle: blink, then doze off.
    if (!sleeping && idle > 14 && !moving && !entering) sleeping = true;
    if (sleeping && (nextZ -= dt) <= 0) { nextZ = 1.1; const b = bunnyState(); burst(b.x + 10 * facing, b.y - 32, 1, "text", { text:"z", color:"#fff", size:11 + Math.random() * 5, speed:16, angle:-Math.PI / 2 - .5 * facing, spread:.3, life:1.6 }); }

    // Ambient scenery.
    for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 60) c.x = -110; }
    boat.boost *= Math.pow(.25, dt); boat.bob *= Math.pow(.02, dt); boat.x += boat.dir * (13 + boat.boost * 55) * dt;
    if (boat.x > W + 30) boat.dir = -1; if (boat.x < -30) boat.dir = 1;
    whale.t += dt; if (whale.t > 14) { whale.t = 0; whale.spot = (whale.spot + 1 + Math.floor(Math.random() * (WHALE_SPOTS.length - 1))) % WHALE_SPOTS.length; }
    if (whale.spout > 0) { whale.spout -= dt; const [x, y] = WHALE_SPOTS[whale.spot]; burst(x - 6, y - 8, 2, "dust", { color:"#e4f7ff", speed:90, angle:-Math.PI / 2, spread:.5, g:260, life:.7, size:2.2 }); }
    if (carrot.pulled) carrot.t += dt;
    if (shooting) { shooting.x += shooting.vx * dt; shooting.y += shooting.vy * dt; shooting.life -= dt; if (shooting.life <= 0) shooting = null; }
    else if ((nextShooting -= dt) <= 0) { nextShooting = 9 + Math.random() * 12; shooting = { x:640 + Math.random() * 150, y:4 + Math.random() * 20, vx:-190, vy:85, life:1.1 }; }
    if (party && (confettiT -= dt) <= 0) { confettiT = .12; particles.push({ x:Math.random() * W, y:-6, vx:(Math.random() - .5) * 30, vy:40 + Math.random() * 30, g:0, life:0, max:9, size:2.6, kind:"confetti", rot:Math.random() * TAU, vr:(Math.random() - .5) * 6, color:CONFETTI[Math.floor(Math.random() * CONFETTI.length)] }); }
    for (const p of particles) { p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.kind !== "confetti") { p.vx *= .96; p.vy *= p.g ? 1 : .96; } }
    particles = particles.filter(p => p.life < p.max && p.y < H + 20);

    // Entering a level: bunny leaps, then the iris closes on the node.
    if (entering) { entering.t += dt; if (entering.t > .28 && !entering.closing) { entering.closing = true; iris = { mode:"close", t:0 }; } }
    if (iris) { iris.t += dt; if (iris.t >= .6) { const closing = iris.mode === "close"; iris = null; if (closing) { hide(); onPlay(target); return false; } } }
    updateCard();
    return true;
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(staticLayer, 0, 0, W, H);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.setLineDash([10, 14]); ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(255,255,255,${.5 + Math.sin(time * 1.3) * .2})`; ctx.lineDashOffset = -time * 8; ctx.stroke(FOAM);
    ctx.setLineDash([6, 22]); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineDashOffset = time * 5; ctx.stroke(FOAM2); ctx.setLineDash([]);
    ctx.lineWidth = 1.6;
    for (const w of waves) { const a = .2 + .35 * Math.sin(time * 1.4 + w.p), x = w.x + Math.sin(time * .6 + w.p) * 3; if (a <= 0) continue; ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(x - 4, w.y - 3, 4, .3, Math.PI - .3); ctx.arc(x + 4, w.y - 3, 4, .3, Math.PI - .3); ctx.stroke(); }
    drawWhale(); drawBottle(); drawBoat(); drawAurora(); drawCarrot();
    for (const c of clouds) { ctx.fillStyle = "rgba(30,40,80,.09)"; ctx.beginPath(); ctx.ellipse(c.x + 17 * c.s + 34, c.y + 64, 34 * c.s, 11 * c.s, 0, 0, TAU); ctx.fill(); }
    for (const [x, y, s] of [[334, 322, .55], [456, 314, .5], [470, 262, .4]]) drawCloud(x + Math.sin(time + x) * 3, y + Math.sin(time * 1.3 + y) * 2, s, "rgba(255,255,255,.9)");
    drawPath();
    for (let i = 0; i < COUNT; i++) drawNode(i);
    const b = bunnyState();
    drawBunny(b.x, b.y, b.h, squash, facing, sleeping || (time % 3.6 < .12), b.rot);
    drawParticles();
    if (shooting) { const { x, y } = shooting, gr = ctx.createLinearGradient(x, y, x + 60, y - 27); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#ffffff00"); ctx.strokeStyle = gr; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60, y - 27); ctx.stroke(); ctx.fillStyle = "#fffbe0"; drawStarShape(ctx, x, y, 5, 4); ctx.fill(); }
    for (const c of clouds) drawCloud(c.x, c.y, c.s, "rgba(255,255,255,.86)");
    if (hover >= 0 && !entering) drawLabel(hover);
    if (iris) {
      const k = Math.min(1, iris.t / .6), r = (iris.mode === "open" ? k * k : 1 - k * k) * 950, n = NODES[target];
      ctx.fillStyle = INK; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(n.x, n.y - 14, Math.max(0, r), 0, TAU, true); ctx.fill("evenodd");
    }
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    if (update(dt)) { draw(); raf = requestAnimationFrame(loop); }
  }
  function setupCanvas() {
    const next = Math.min(2, window.devicePixelRatio || 1);
    if (staticLayer && next === dpr) return;
    dpr = next; canvas.width = W * dpr; canvas.height = H * dpr; buildStatic();
  }

  function show({ unlocked: u, best: b, current }) {
    setupCanvas();
    unlocked = Math.max(1, Math.min(u, COUNT)); best = b || [];
    const stored = Number(localStorage.getItem("bounce-map-revealed"));
    revealed = Math.min(unlocked, stored > 0 ? stored : unlocked);
    localStorage.setItem("bounce-map-revealed", unlocked);
    target = Math.max(0, Math.min(current || 0, revealed - 1)); bunnyS = nodeS[target]; hopPhase = 0; moving = false;
    reveal = unlocked > revealed ? { seg:revealed - 1, t:0 } : null;
    iris = { mode:"open", t:0 }; entering = null; pendingPlay = false; autoHop = 0; hover = -1;
    idle = 0; sleeping = false; flip = 0; boing = 0; particles = []; cardShown = -1; carrot.pulled = false;
    shownAt = performance.now(); updateCard(); updateSecrets();
    if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function hide() { running = false; cancelAnimationFrame(raf); toastEl.classList.remove("show"); }
  return { show, hide };
}
