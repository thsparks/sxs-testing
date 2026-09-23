// Bounce's Big Adventure - vanilla Canvas platformer
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menuScreen = document.getElementById("menu-screen");
  const selectScreen = document.getElementById("level-select");
  const gameScreen = document.getElementById("game-screen");
  const mapLevels = document.getElementById("map-levels");
  const mapFrame = document.querySelector(".map-frame");
  const mapPlayBtn = document.getElementById("map-play-btn");
  const mapPreviewIcon = document.getElementById("map-preview-icon");
  const mapPreviewStatus = document.getElementById("map-preview-status");
  const mapPreviewName = document.getElementById("map-preview-name");
  const mapPreviewDescription = document.getElementById("map-preview-description");
  const mapDiscovery = document.getElementById("map-discovery");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMessage = document.getElementById("overlay-message");
  const overlayPrimary = document.getElementById("overlay-primary");
  const levelNameEl = document.getElementById("level-name");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const progressEl = document.querySelector("#level-progress span");
  const VIEW_WIDTH = canvas.width, VIEW_HEIGHT = canvas.height;
  const GRAVITY = .6, MOVE_SPEED = 4, JUMP_VELOCITY = -12.5, START_LIVES = 3;

  const levelInfo = [
    { name: "Meadow Morning", icon: "🌼", description: "A gentle first hop", width: 800, platforms: [[0,410,800,40],[140,330,120,20],[320,270,120,20],[480,340,100,20],[610,230,140,20],[40,250,90,20]], stars: [[175,295],[370,235],[515,305],[115,215],[660,195],[700,195]], enemy: [340,246,325,400], goal: [730,170], theme: { sky:["#ffd98e","#bfe9ff"], cloud:"#ffffffcc", body:{c:"#ffcf4d", glow:"#ffe9a866", x:640, y:78, r:30}, platform:["#8bd66b","#6bb84e"], decor:"flowers", enemy:"slime" } },
    { name: "Mushroom Grove", icon: "🍄", description: "Mind the bouncy gaps", width: 1050, platforms: [[0,410,220,40],[280,370,130,20],[470,300,120,20],[650,390,170,20],[850,320,160,20],[140,280,100,20],[390,210,120,20],[690,235,100,20]], stars: [[80,370],[330,335],[530,265],[730,355],[920,285],[185,245],[445,175],[730,200]], enemy: [490,276,475,575], goal: [960,260], theme: { sky:["#9fd3a8","#e8f5d5"], cloud:"#f4ffeacc", body:{c:"#fff3ba", glow:"#fff8d055", x:640, y:55, r:26}, platform:["#7cc46a","#5c9e4c"], decor:"mushrooms", enemy:"shroom" } },
    { name: "Cloudy Cliffs", icon: "☁️", description: "A sky-high scramble", width: 1250, platforms: [[0,410,180,40],[230,345,110,20],[400,275,100,20],[570,350,130,20],[770,260,110,20],[940,190,120,20],[1110,300,140,20],[530,180,90,20],[850,370,80,20]], stars: [[80,370],[275,310],[445,240],[630,315],[825,225],[1000,155],[1170,265],[575,145],[875,335]], enemy: [580,326,570,690], goal: [1170,240], theme: { sky:["#5fb8ff","#dff2ff"], cloud:"#ffffff", body:{c:"#fff6b0", glow:"#fffbd288", x:650, y:60, r:34}, platform:["#ffffff","#cfe6f7"], puffy:true, decor:"sky", enemy:"cloud" } },
    { name: "Twilight Temple", icon: "🏛️", description: "Long halls and tricky jumps", width: 1450, platforms: [[0,410,260,40],[320,350,140,20],[530,290,90,20],[690,370,160,20],[920,300,120,20],[1100,230,120,20],[1280,350,170,20],[410,200,100,20],[780,210,100,20],[1160,135,100,20]], stars: [[100,370],[380,315],[570,255],[760,335],[970,265],[1150,195],[1360,315],[455,165],[825,175],[1205,100]], enemy: [710,346,690,850], goal: [1370,290], theme: { sky:["#3d2f63","#f2a06b"], cloud:"#ffd9c266", body:{c:"#ff9d5c", glow:"#ffbe8a66", x:620, y:120, r:36}, platform:["#b3a5d6","#8a7bb0"], decor:"temple", enemy:"golem" } },
    { name: "Aurora Summit", icon: "🌌", description: "The final starry challenge", width: 1750, platforms: [[0,410,210,40],[270,330,120,20],[460,250,100,20],[620,360,150,20],[820,285,100,20],[980,210,130,20],[1170,340,150,20],[1360,260,110,20],[1530,180,180,20],[390,145,100,20],[700,165,90,20],[1110,125,100,20]], stars: [[100,370],[325,295],[510,215],[690,325],[865,250],[1040,175],[1240,305],[1410,225],[1600,145],[435,110],[745,130],[1155,90]], enemy: [640,336,620,770], goal: [1630,120], theme: { sky:["#0b1035","#31225e"], cloud:"#a9b6e044", body:{c:"#f4f1ff", glow:"#cfd8ff44", x:640, y:70, r:26}, platform:["#f2f7ff","#a9bcdf"], decor:"aurora", enemy:"frost" } }
  ];
  const mapStops = [[8.5,75.2],[31.1,60.4],[51.75,33.7],[71.25,64.1],[87.75,20.2]];
  const secretMessages = {
    flower: "The flower hums a tiny tune. It sounds suspiciously like your victory song.",
    mushroom: "A shy mushroom whispers: “The best shortcuts are the friends you make along the way.”",
    star: "You found a runaway star! It promises to watch over your next jump."
  };
  const discoveredSecrets = new Set();
  let selectedMapLevel = 0;
  const savedCompleted = Number(localStorage.getItem("bounce-completed"));
  let completed = Number.isInteger(savedCompleted) && savedCompleted >= 0 ? savedCompleted & 31 : 0;
  const savedUnlocked = Number(localStorage.getItem("bounce-unlocked") || 1);
  let unlocked = Number.isInteger(savedUnlocked) ? Math.min(5, Math.max(1, savedUnlocked)) : 1;
  let currentLevel = unlocked - 1, level, player, coins, enemy, score, lives, invulnerable = 0;
  let cameraX = 0, gameOver = false, won = false, keys = {}, animationId, lastProgressPct = -1;

  function showScreen(screen) { [menuScreen, selectScreen, gameScreen].forEach(s => s.classList.add("hidden")); screen.classList.remove("hidden"); }
  function nextAdventureLevel() {
    return Math.min(unlocked - 1, currentLevel + ((completed & (1 << currentLevel)) ? 1 : 0));
  }
  function openLevelSelect() {
    renderLevelSelect();
    showScreen(selectScreen);
    const selectedNode = mapLevels.children[selectedMapLevel];
    mapFrame.scrollLeft = selectedNode.offsetLeft - mapFrame.clientWidth / 2;
  }
  function selectMapLevel(index) {
    selectedMapLevel = index;
    mapLevels.querySelectorAll(".map-node").forEach((node, i) => node.setAttribute("aria-pressed", String(i === index)));
    const item = levelInfo[index], locked = index + 1 > unlocked;
    mapPreviewIcon.textContent = locked ? "🔒" : item.icon;
    mapPreviewStatus.textContent = locked ? `Stop ${index + 1} · Not yet unlocked` : completed & (1 << index) ? `Stop ${index + 1} · Trail conquered!` : `Stop ${index + 1} · Ready to explore`;
    mapPreviewName.textContent = item.name;
    mapPreviewDescription.textContent = locked ? `Finish ${levelInfo[index - 1].name} to open this trail.` : item.description;
    mapPlayBtn.disabled = locked;
    mapPlayBtn.textContent = locked ? "Trail locked" : `Hop into level ${index + 1} →`;
  }
  function renderLevelSelect() {
    mapLevels.replaceChildren();
    levelInfo.forEach((item, index) => {
      const button = document.createElement("button");
      const locked = index + 1 > unlocked;
      button.type = "button";
      button.className = `map-node${locked ? " is-locked" : ""}${completed & (1 << index) ? " is-complete" : ""}`;
      button.style.setProperty("--x", `${mapStops[index][0]}%`);
      button.style.setProperty("--y", `${mapStops[index][1]}%`);
      button.setAttribute("aria-label", `Level ${index + 1}: ${item.name}, ${locked ? "locked" : completed & (1 << index) ? "completed" : "unlocked"}`);
      button.innerHTML = `<span class="map-node-icon" aria-hidden="true">${locked ? "🔒" : item.icon}</span><span class="map-node-number" aria-hidden="true">${completed & (1 << index) ? "✓" : index + 1}</span>`;
      button.addEventListener("click", () => selectMapLevel(index));
      mapLevels.appendChild(button);
    });
    selectMapLevel(nextAdventureLevel());
  }
  function makeLevel(index) {
    const data = levelInfo[index];
    level = { ...data, platforms: data.platforms.map(([x,y,w,h]) => ({x,y,w,h})), stars: data.stars.map(([x,y]) => ({x,y,r:10,taken:false})), goal: {x:data.goal[0], y:data.goal[1], w:30, h:60} };
    // Each level has its own sky -- build the gradient once here instead of allocating a new one every frame.
    const sky = ctx.createLinearGradient(0,0,0,VIEW_HEIGHT); sky.addColorStop(0,data.theme.sky[0]); sky.addColorStop(1,data.theme.sky[1]); level.theme = { ...data.theme, gradient:sky };
    enemy = data.enemy ? { x:data.enemy[0], y:data.enemy[1], w:30, h:24, minX:data.enemy[2], maxX:data.enemy[3], dir:1, speed:1.5, alive:true } : null;
  }
  function startLevel(index) {
    currentLevel = index; makeLevel(index);
    player = { x:50, y:200, w:28, h:32, vx:0, vy:0, onGround:false, facing:1 };
    score = 0; lives = START_LIVES; invulnerable = 0; cameraX = 0; gameOver = false; won = false; lastProgressPct = -1;
    progressEl.style.width = "0%";
    levelNameEl.textContent = `Level ${index + 1} · ${level.name}`; updateHud(); hideOverlay(); showScreen(gameScreen);
    cancelAnimationFrame(animationId); animationId = requestAnimationFrame(loop);
  }
  function updateHud() { scoreEl.textContent = `⭐ ${score}`; livesEl.textContent = "❤️".repeat(Math.max(lives, 0)) || "💀"; }
  function showOverlay(title, message, primaryText, primaryAction) { overlayTitle.textContent=title; overlayMessage.textContent=message; overlayPrimary.textContent=primaryText; overlayPrimary.onclick=primaryAction; overlay.classList.remove("hidden"); }
  function hideOverlay() { overlay.classList.add("hidden"); }
  function goToSelect() { cancelAnimationFrame(animationId); hideOverlay(); openLevelSelect(); }
  // Avoid allocating a new array on every call (this runs multiple times per frame).
  function pressed(a, b) { return !!(keys[a] || (b && keys[b])); }
  window.addEventListener("keydown", e => {
    if (!selectScreen.classList.contains("hidden") && e.target.classList?.contains("map-node") && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) {
      e.preventDefault();
      const step = e.code === "ArrowLeft" || e.code === "ArrowUp" ? -1 : 1;
      const next = (selectedMapLevel + step + levelInfo.length) % levelInfo.length;
      mapLevels.children[next].focus();
      return;
    }
    keys[e.code]=true;
    if (!gameScreen.classList.contains("hidden") && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    if(e.code==="Escape" && !gameScreen.classList.contains("hidden")) goToSelect();
    else if(e.code==="Escape" && !selectScreen.classList.contains("hidden")) showScreen(menuScreen);
  });
  window.addEventListener("keyup", e => { keys[e.code]=false; });
  mapLevels.addEventListener("focusin", e => {
    const index = Array.prototype.indexOf.call(mapLevels.children, e.target);
    if (index !== -1) selectMapLevel(index);
  });
  mapPlayBtn.addEventListener("click", () => {
    if (selectedMapLevel < unlocked) startLevel(selectedMapLevel);
  });
  document.querySelectorAll(".map-secret").forEach(button => {
    button.addEventListener("click", () => {
      const secret = button.dataset.secret;
      discoveredSecrets.add(secret);
      button.classList.remove("found");
      void button.offsetWidth;
      button.classList.add("found");
      mapDiscovery.textContent = `${secretMessages[secret]}  ·  ${discoveredSecrets.size}/3 wonders found`;
    });
  });
  document.getElementById("play-btn").onclick = () => startLevel(nextAdventureLevel());
  document.getElementById("menu-levels-btn").onclick = openLevelSelect;
  document.getElementById("back-menu-btn").onclick = () => showScreen(menuScreen);
  document.getElementById("game-menu-btn").onclick = goToSelect;
  document.getElementById("overlay-secondary").onclick = goToSelect;

  function overlap(a,b) { return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
  function resolvePlatforms() {
    player.onGround=false;
    for(const p of level.platforms) {
      const previousBottom=player.y+player.h-player.vy, withinX=player.x+player.w>p.x&&player.x<p.x+p.w;
      if(withinX&&player.vy>=0&&previousBottom<=p.y+1&&player.y+player.h>=p.y&&player.y+player.h<=p.y+p.h+player.vy+1) { player.y=p.y-player.h; player.vy=0; player.onGround=true; }
    }
    player.x=Math.max(0,Math.min(level.width-player.w,player.x));
  }
  function loseLife() {
    lives--; updateHud();
    if(lives<=0) { gameOver=true; showOverlay("Game Over 💥", `You collected ${score} points. Ready for another hop?`, "Try again", () => startLevel(currentLevel)); }
    else { player.x=50; player.y=200; player.vx=0; player.vy=0; invulnerable=90; }
  }
  function update() {
    if(gameOver||won) return;
    player.vx=pressed("ArrowLeft","KeyA")?-MOVE_SPEED:pressed("ArrowRight","KeyD")?MOVE_SPEED:0;
    if(player.vx) player.facing=player.vx>0?1:-1;
    player.x+=player.vx;
    if((keys.ArrowUp||keys.KeyW||keys.Space)&&player.onGround) { player.vy=JUMP_VELOCITY; player.onGround=false; }
    player.vy+=GRAVITY; player.y+=player.vy; resolvePlatforms();
    if(player.y>VIEW_HEIGHT+60) { loseLife(); return; }
    for(const c of level.stars) if(!c.taken && Math.hypot(player.x+14-c.x,player.y+16-c.y)<c.r+16) { c.taken=true; score+=10; updateHud(); }
    if(enemy&&enemy.alive) {
      enemy.x+=enemy.speed*enemy.dir; if(enemy.x<enemy.minX||enemy.x+enemy.w>enemy.maxX) enemy.dir*=-1;
      if(invulnerable===0&&overlap(player,enemy)) {
        if(player.vy>0&&player.y+player.h-player.vy<=enemy.y+6) { enemy.alive=false; player.vy=JUMP_VELOCITY*.6; score+=20; updateHud(); } else { loseLife(); return; }
      }
    }
    if(invulnerable>0) invulnerable--;
    if(overlap(player,level.goal)) {
      won=true; const last=currentLevel===levelInfo.length-1;
      completed |= 1 << currentLevel;
      localStorage.setItem("bounce-completed", completed);
      if(currentLevel+2>unlocked) { unlocked=Math.min(5,currentLevel+2); localStorage.setItem("bounce-unlocked",unlocked); }
      showOverlay(last?"Adventure Complete! 🎉":"Level Complete! ✨", `${score} points in ${level.name}.`, last?"Play again":"Next level", last?()=>startLevel(0):()=>startLevel(currentLevel+1));
    }
    cameraX=Math.max(0,Math.min(level.width-VIEW_WIDTH,player.x-VIEW_WIDTH*.35));
    // Only touch the DOM when the visible width actually changes (avoids layout/paint work every frame).
    const progressPct=Math.min(100,(player.x/(level.width-50))*100);
    if(Math.abs(progressPct-lastProgressPct)>=0.5) { progressEl.style.width=`${progressPct}%`; lastProgressPct=progressPct; }
  }
  function drawCloud(x,y) { ctx.beginPath(); ctx.arc(x,y,16,0,Math.PI*2); ctx.arc(x+18,y-8,18,0,Math.PI*2); ctx.arc(x+36,y,16,0,Math.PI*2); ctx.fill(); }
  function drawStar(cx,cy,spikes,outer,inner) { let rot=Math.PI/2*3, step=Math.PI/spikes; ctx.beginPath(); ctx.moveTo(cx,cy-outer); for(let i=0;i<spikes;i++){ctx.lineTo(cx+Math.cos(rot)*outer,cy+Math.sin(rot)*outer);rot+=step;ctx.lineTo(cx+Math.cos(rot)*inner,cy+Math.sin(rot)*inner);rot+=step;}ctx.closePath(); }
  // Scenery behind the platforms: celestial body, clouds, and theme-specific sky or parallax silhouettes.
  function drawSky(t) {
    const cam=cameraX, b=t.body;
    if(b.glow){ctx.fillStyle=b.glow;ctx.beginPath();ctx.arc(cam+b.x,b.y,b.r*1.7,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=b.c;ctx.beginPath();ctx.arc(cam+b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
    if(t.decor==="aurora"){
      ctx.fillStyle="#d9d4f0";ctx.beginPath();ctx.arc(cam+b.x-7,b.y-5,4.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cam+b.x+6,b.y+7,3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#fff";
      for(let i=0;i<70;i++){ctx.globalAlpha=.35+.6*(((i*37)%10)/10);ctx.fillRect(cam+(i*173)%VIEW_WIDTH,(i*97)%240,2,2);}
      ctx.globalAlpha=.22;
      ["#5cf2b8","#6ec3ff","#c58cff"].forEach((c,bi)=>{ctx.strokeStyle=c;ctx.lineWidth=24;ctx.beginPath();for(let x=0;x<=VIEW_WIDTH;x+=40){const y=58+bi*48+Math.sin((x+bi*110)/130)*22;x?ctx.lineTo(cam+x,y):ctx.moveTo(cam+x,y);}ctx.stroke();});
      ctx.globalAlpha=1;
      ctx.fillStyle="#8698c455";
      for(let x=Math.floor(cam*.5/430)*430;x<cam*.5+VIEW_WIDTH+430;x+=430){const px=x+cam*.5;ctx.beginPath();ctx.moveTo(px-120,VIEW_HEIGHT);ctx.lineTo(px,250);ctx.lineTo(px+120,VIEW_HEIGHT);ctx.fill();}
    }
    ctx.fillStyle=t.cloud;drawCloud(cam+120,70);drawCloud(cam+430,50);drawCloud(cam+900,100);
    if(t.decor==="sky"){
      drawCloud(cam+250,165);drawCloud(cam+730,200);
      ctx.strokeStyle="#5a7a9a";ctx.lineWidth=2;
      for(const [bx,by] of [[330,125],[810,95]]){const x=cam+bx;ctx.beginPath();ctx.moveTo(x-8,by);ctx.quadraticCurveTo(x-3,by-6,x,by);ctx.quadraticCurveTo(x+3,by-6,x+8,by);ctx.stroke();}
    }
    if(t.decor==="temple"){
      ctx.fillStyle="#2c245088";
      for(let x=Math.floor(cam*.5/290)*290;x<cam*.5+VIEW_WIDTH+290;x+=290){const px=x+cam*.5+40;ctx.fillRect(px,175,36,275);ctx.fillRect(px-7,163,50,14);ctx.fillRect(px-5,440,46,10);}
    }
  }
  // Enemy critters themed per level. All share the same 30x24 body so collisions stay identical.
  // Every variant gets a dark outline so it stays readable against any platform color.
  function drawEnemy(e,t) {
    const cx=e.x+15, top=e.y, look=e.dir*1.5;
    ctx.strokeStyle="#34294f";ctx.lineWidth=2;
    if(t.enemy==="golem"){
      ctx.fillStyle="#7a6fa3";ctx.beginPath();ctx.rect(e.x+2,top+8,26,16);ctx.fill();ctx.stroke();
      ctx.fillStyle="#9a8fc7";ctx.beginPath();ctx.rect(e.x+5,top+2,20,8);ctx.fill();ctx.stroke();
      ctx.fillStyle="#ffd23f";ctx.beginPath();ctx.arc(e.x+10+look,top+13,2.6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(e.x+20+look,top+13,2.6,0,Math.PI*2);ctx.fill();
      return;
    }
    if(t.enemy==="cloud"){
      ctx.fillStyle="#cfe2f5";ctx.beginPath();ctx.ellipse(cx,top+16,15,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(cx-6,top+9,7,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(cx+5,top+7,8,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle="#9db8d4";ctx.beginPath();ctx.ellipse(cx,top+21,12,4,0,0,Math.PI);ctx.fill();
      ctx.fillStyle="#111";ctx.beginPath();ctx.arc(cx-5+look,top+14,2.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+5+look,top+14,2.2,0,Math.PI*2);ctx.fill();
      return;
    }
    if(t.enemy==="shroom"){
      ctx.fillStyle="#f3e2c7";ctx.beginPath();ctx.ellipse(cx,top+16,11,8,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle="#e2544b";ctx.beginPath();ctx.arc(cx,top+10,14,Math.PI,0);ctx.fill();ctx.stroke();
      ctx.fillStyle="#fff";[[-7,-4,2.4],[0,-8,2],[7,-3,2.2]].forEach(([dx,dy,r])=>{ctx.beginPath();ctx.arc(cx+dx,top+10+dy,r,0,Math.PI*2);ctx.fill();});
      ctx.fillStyle="#111";ctx.beginPath();ctx.arc(cx-4+look,top+16,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+4+look,top+16,2,0,Math.PI*2);ctx.fill();
      return;
    }
    const body=t.enemy==="frost"?"#bfe0ff":"#79c94f", shade=t.enemy==="frost"?"#8fb8e8":"#58a83c";
    if(t.enemy==="frost"){ctx.fillStyle="#dff1ff88";ctx.beginPath();ctx.ellipse(cx,top+16,18,14,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(cx,top+16,15,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=shade;ctx.beginPath();ctx.ellipse(cx,top+22,13,5,0,0,Math.PI);ctx.fill();
    ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(cx-6+look,top+12,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+6+look,top+12,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#111";ctx.beginPath();ctx.arc(cx-6+look*2,top+12,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+6+look*2,top+12,2,0,Math.PI*2);ctx.fill();
  }
  // Theme-specific props that sit on or near the platforms.
  function drawProps(t) {
    const viewLeft=cameraX-40, viewRight=cameraX+VIEW_WIDTH+40;
    if(t.decor==="flowers") for(const p of level.platforms){
      if(p.h<40||p.w<90||p.x+p.w<viewLeft||p.x>viewRight) continue;
      for(let i=0;i<3;i++){
        const fx=p.x+p.w*(.25+.25*i), fy=p.y-8;
        ctx.strokeStyle="#3e9b4f";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fx,p.y);ctx.lineTo(fx,fy);ctx.stroke();
        ctx.fillStyle=["#ff8fb3","#ffd23f","#ffffff"][i%3];
        for(let a=0;a<5;a++){ctx.beginPath();ctx.arc(fx+Math.cos(a*Math.PI*2/5)*3.4,fy+Math.sin(a*Math.PI*2/5)*3.4,2.3,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle="#ff9d3c";ctx.beginPath();ctx.arc(fx,fy,2,0,Math.PI*2);ctx.fill();
      }
    }
    if(t.decor==="mushrooms") level.platforms.forEach((p,i)=>{
      if(i%2===0||p.w<90||p.x+p.w<viewLeft||p.x>viewRight) return;
      const mx=p.x+p.w-26, my=p.y;
      ctx.fillStyle="#f3e2c7";ctx.fillRect(mx+5,my-13,9,13);
      ctx.fillStyle="#e2544b";ctx.beginPath();ctx.arc(mx+9.5,my-13,11,Math.PI,0);ctx.fill();
      ctx.fillStyle="#fff";[[-5,-3,2],[1,-7,1.7],[6,-2,1.6]].forEach(([dx,dy,r])=>{ctx.beginPath();ctx.arc(mx+9.5+dx,my-13+dy,r,0,Math.PI*2);ctx.fill();});
    });
  }
  function draw() {
    const t=level.theme;
    ctx.clearRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
    ctx.fillStyle=t.gradient;ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
    ctx.save();ctx.translate(-cameraX,0);
    drawSky(t);
    // Skip drawing platforms/stars that are off-screen -- keeps larger levels just as cheap to render as the first one.
    const viewLeft=cameraX-40, viewRight=cameraX+VIEW_WIDTH+40;
    for(const p of level.platforms){
      if(p.x+p.w<viewLeft||p.x>viewRight) continue;
      ctx.fillStyle=t.platform[0];ctx.fillRect(p.x,p.y,p.w,p.h);
      if(t.puffy){const bumps=Math.max(2,Math.round(p.w/46));for(let i=0;i<bumps;i++){ctx.beginPath();ctx.arc(p.x+p.w*(i+.5)/bumps,p.y+2,12,Math.PI,0);ctx.fill();}}
      ctx.fillStyle=t.platform[1];ctx.fillRect(p.x,p.y+p.h-6,p.w,6);
    }
    drawProps(t);
    const g=level.goal;ctx.fillStyle="#a9a9a9";ctx.fillRect(g.x+13,g.y,4,g.h);ctx.fillStyle=won?"#4caf50":"#ff6b6b";ctx.beginPath();ctx.moveTo(g.x+15,g.y+4);ctx.lineTo(g.x+41,g.y+12);ctx.lineTo(g.x+15,g.y+22);ctx.closePath();ctx.fill();
    for(const c of level.stars) { if(c.taken||c.x<viewLeft||c.x>viewRight) continue; ctx.save();ctx.translate(c.x,c.y);ctx.fillStyle="#ffd23f";ctx.strokeStyle="#e6a700";ctx.lineWidth=2;drawStar(0,0,5,c.r,c.r/2);ctx.fill();ctx.stroke();ctx.restore();}
    if(enemy&&enemy.alive) drawEnemy(enemy,t);
    ctx.save();ctx.translate(player.x+14,player.y+16);if(invulnerable>0&&Math.floor(invulnerable/6)%2===0)ctx.globalAlpha=.4;
    ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(-8*player.facing,-18,5,12,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(8*player.facing,-18,5,12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ffc4dd";ctx.beginPath();ctx.ellipse(-8*player.facing,-18,2.5,7,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(8*player.facing,-18,2.5,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(0,2,14,16,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ffb6c1";ctx.beginPath();ctx.arc(0,4,2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#111";ctx.beginPath();ctx.arc(4*player.facing,-2,2.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-4*player.facing,-2,2.2,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function loop(){update();draw();if(!gameOver&&!won)animationId=requestAnimationFrame(loop);}
  renderLevelSelect(); showScreen(menuScreen);
})();
