// Bounce's Big Adventure - vanilla Canvas platformer
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menuScreen = document.getElementById("menu-screen");
  const selectScreen = document.getElementById("level-select");
  const gameScreen = document.getElementById("game-screen");
  const levelGrid = document.getElementById("level-grid");
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
    { name: "Meadow Morning", icon: "🌼", description: "A gentle first hop", width: 800, platforms: [[0,410,800,40],[140,330,120,20],[320,270,120,20],[480,340,100,20],[610,230,140,20],[40,250,90,20]], stars: [[175,295],[370,235],[515,305],[115,215],[660,195],[700,195]], enemy: [340,246,325,400], goal: [730,170] },
    { name: "Mushroom Grove", icon: "🍄", description: "Mind the bouncy gaps", width: 1050, platforms: [[0,410,220,40],[280,370,130,20],[470,300,120,20],[650,390,170,20],[850,320,160,20],[140,280,100,20],[390,210,120,20],[690,235,100,20]], stars: [[80,370],[330,335],[530,265],[730,355],[920,285],[185,245],[445,175],[730,200]], enemy: [490,276,475,575], goal: [960,260] },
    { name: "Cloudy Cliffs", icon: "☁️", description: "A sky-high scramble", width: 1250, platforms: [[0,410,180,40],[230,345,110,20],[400,275,100,20],[570,350,130,20],[770,260,110,20],[940,190,120,20],[1110,300,140,20],[530,180,90,20],[850,370,80,20]], stars: [[80,370],[275,310],[445,240],[630,315],[825,225],[1000,155],[1170,265],[575,145],[875,335]], enemy: [580,326,570,690], goal: [1170,240] },
    { name: "Twilight Temple", icon: "🏛️", description: "Long halls and tricky jumps", width: 1450, platforms: [[0,410,260,40],[320,350,140,20],[530,290,90,20],[690,370,160,20],[920,300,120,20],[1100,230,120,20],[1280,350,170,20],[410,200,100,20],[780,210,100,20],[1160,135,100,20]], stars: [[100,370],[380,315],[570,255],[760,335],[970,265],[1150,195],[1360,315],[455,165],[825,175],[1205,100]], enemy: [710,346,690,850], goal: [1370,290] },
    { name: "Aurora Summit", icon: "🌌", description: "The final starry challenge", width: 1750, platforms: [[0,410,210,40],[270,330,120,20],[460,250,100,20],[620,360,150,20],[820,285,100,20],[980,210,130,20],[1170,340,150,20],[1360,260,110,20],[1530,180,180,20],[390,145,100,20],[700,165,90,20],[1110,125,100,20]], stars: [[100,370],[325,295],[510,215],[690,325],[865,250],[1040,175],[1240,305],[1410,225],[1600,145],[435,110],[745,130],[1155,90]], enemy: [640,336,620,770], goal: [1630,120] }
  ];
  let currentLevel = 0, level, player, coins, enemy, score, lives, invulnerable = 0;
  let cameraX = 0, gameOver = false, won = false, keys = {}, animationId, lastProgressPct = -1;
  let unlocked = Math.min(5, Math.max(1, Number(localStorage.getItem("bounce-unlocked") || 1)));

  function showScreen(screen) { [menuScreen, selectScreen, gameScreen].forEach(s => s.classList.add("hidden")); screen.classList.remove("hidden"); }
  function renderLevelSelect() {
    levelGrid.innerHTML = "";
    levelInfo.forEach((item, index) => {
      const button = document.createElement("button");
      button.className = "level-card"; button.disabled = index + 1 > unlocked;
      button.innerHTML = `<span class="level-number">${index + 1}</span><h3>${item.icon} ${item.name}</h3><p>${item.description}${button.disabled ? " · Locked" : ""}</p>`;
      button.addEventListener("click", () => startLevel(index));
      levelGrid.appendChild(button);
    });
  }
  function makeLevel(index) {
    const data = levelInfo[index];
    level = { ...data, platforms: data.platforms.map(([x,y,w,h]) => ({x,y,w,h})), stars: data.stars.map(([x,y]) => ({x,y,r:10,taken:false})), goal: {x:data.goal[0], y:data.goal[1], w:30, h:60} };
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
  function goToSelect() { cancelAnimationFrame(animationId); hideOverlay(); renderLevelSelect(); showScreen(selectScreen); }
  // Avoid allocating a new array on every call (this runs multiple times per frame).
  function pressed(a, b) { return !!(keys[a] || (b && keys[b])); }
  window.addEventListener("keydown", e => { keys[e.code]=true; if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault(); if(e.code==="Escape" && !gameScreen.classList.contains("hidden")) goToSelect(); });
  window.addEventListener("keyup", e => { keys[e.code]=false; });
  document.getElementById("play-btn").onclick = () => startLevel(Math.min(currentLevel, unlocked - 1));
  document.getElementById("menu-levels-btn").onclick = () => { renderLevelSelect(); showScreen(selectScreen); };
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
  // The sky never changes, so build the gradient once instead of allocating a new one every frame.
  const skyGradient=ctx.createLinearGradient(0,0,0,VIEW_HEIGHT); skyGradient.addColorStop(0,"#aee4ff"); skyGradient.addColorStop(1,"#dff6e0");
  function draw() {
    ctx.clearRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
    ctx.fillStyle=skyGradient;ctx.fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);
    ctx.save();ctx.translate(-cameraX,0);
    ctx.fillStyle="#fff6b0";ctx.beginPath();ctx.arc(cameraX+650,60,34,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffffffaa";drawCloud(cameraX+120,70);drawCloud(cameraX+430,50);drawCloud(cameraX+900,100);
    // Skip drawing platforms/stars that are off-screen -- keeps larger levels just as cheap to render as the first one.
    const viewLeft=cameraX-40, viewRight=cameraX+VIEW_WIDTH+40;
    for(const p of level.platforms){ if(p.x+p.w<viewLeft||p.x>viewRight) continue; ctx.fillStyle="#8bd66b";ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle="#6bb84e";ctx.fillRect(p.x,p.y+p.h-6,p.w,6);}
    const g=level.goal;ctx.fillStyle="#a9a9a9";ctx.fillRect(g.x+13,g.y,4,g.h);ctx.fillStyle=won?"#4caf50":"#ff6b6b";ctx.beginPath();ctx.moveTo(g.x+15,g.y+4);ctx.lineTo(g.x+41,g.y+12);ctx.lineTo(g.x+15,g.y+22);ctx.closePath();ctx.fill();
    for(const c of level.stars) { if(c.taken||c.x<viewLeft||c.x>viewRight) continue; ctx.save();ctx.translate(c.x,c.y);ctx.fillStyle="#ffd23f";ctx.strokeStyle="#e6a700";ctx.lineWidth=2;drawStar(0,0,5,c.r,c.r/2);ctx.fill();ctx.stroke();ctx.restore();}
    if(enemy&&enemy.alive){ctx.fillStyle="#c66bd6";ctx.beginPath();ctx.ellipse(enemy.x+15,enemy.y+16,15,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(enemy.x+9,enemy.y+12,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(enemy.x+21,enemy.y+12,4,0,Math.PI*2);ctx.fill();}
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
