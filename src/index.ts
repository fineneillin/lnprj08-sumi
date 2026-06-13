import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.html(HTML)
})

export default app

const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>墨流し — LNPRJ08</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#f0ead8}
#wrap{width:100vw;height:100vh;position:relative;cursor:none}
canvas{display:block;width:100%;height:100%;position:absolute;top:0;left:0}

/* 共用直書樣式 */
.vtext{
  writing-mode:vertical-rl;
  font-family:'Hiragino Mincho ProN','Yu Mincho','MS Mincho',Georgia,serif;
  position:absolute;
  pointer-events:none;
  line-height:1.8;
  letter-spacing:.25em
}

/* 左上：洗硯（可點擊） */
#btn-clear{
  writing-mode:vertical-rl;
  font-family:'Hiragino Mincho ProN','Yu Mincho','MS Mincho',Georgia,serif;
  position:absolute;
  top:28px;left:26px;
  font-size:15px;
  color:rgba(40,20,0,0.38);
  cursor:pointer;
  pointer-events:all;
  letter-spacing:.3em;
  line-height:1.8;
  background:none;border:none;
  transition:color .25s
}
#btn-clear:hover{color:rgba(40,20,0,0.70)}

/* 右上：大標題 */
#title{
  top:22px;right:28px;
  font-size:20px;
  color:rgba(25,12,2,0.22);
  letter-spacing:.55em;
  line-height:2
}

/* 左下：說明文字 */
#hint{
  bottom:36px;left:26px;
  font-size:10px;
  color:rgba(40,20,0,0.22);
  letter-spacing:.18em;
  line-height:2;
  transition:opacity 2.5s
}

/* 右下：朱紅印章 */
#seal{
  position:absolute;
  bottom:30px;right:26px;
  width:40px;height:40px;
  background:#8b1a1a;
  display:flex;align-items:center;justify-content:center;
  font-family:'Hiragino Mincho ProN','Yu Mincho',serif;
  font-size:20px;color:#f0ead8;
  letter-spacing:0;
  border-radius:2px;
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.12),0 1px 4px rgba(0,0,0,0.18);
  pointer-events:none
}

/* 底部中央：墨色選色 */
#palette{
  position:absolute;
  bottom:30px;left:50%;transform:translateX(-50%);
  display:flex;gap:14px;align-items:center;
  pointer-events:all
}
.swatch{
  width:22px;height:22px;border-radius:50%;
  border:2px solid transparent;
  cursor:pointer;
  transition:transform .18s,border-color .2s;
  flex-shrink:0
}
.swatch.sel{
  border-color:rgba(40,20,0,0.50);
  transform:scale(1.28)
}

/* 自訂游標 */
#cursor{
  position:absolute;pointer-events:none;z-index:30;
  transform:translate(-50%,-50%)
}
</style>
<script src="https://lnprj.neillin-lct.workers.dev/lnprj-nav.js"></script>
</head>
<body>
<div id="wrap">
  <canvas id="c"></canvas>

  <button id="btn-clear">洗&emsp;硯</button>

  <div id="title" class="vtext">墨&emsp;流&emsp;し</div>

  <div id="hint" class="vtext">輕撫紙面攪墨&emsp;｜&emsp;按住滴墨</div>

  <div id="seal">墨</div>

  <div id="palette">
    <div class="swatch sel" id="sw0" style="background:#100b05" title="松煙"></div>
    <div class="swatch"     id="sw1" style="background:#0e2e22" title="青墨"></div>
    <div class="swatch"     id="sw2" style="background:#3d0e0e" title="朱墨"></div>
  </div>

  <svg id="cursor" width="18" height="18" viewBox="0 0 18 18">
    <circle cx="9" cy="9" r="2.8" fill="rgba(12,6,2,0.80)"/>
    <circle cx="9" cy="9" r="7.5" fill="none" stroke="rgba(12,6,2,0.18)" stroke-width="1"/>
  </svg>
</div>

<script>
(function(){
'use strict';

/* ── Config ──────────────────────────────── */
const GRID        = 30;
const VEL_DECAY   = 0.992;
const DYE_DECAY   = 0.998;
const DIFFUSION   = 0.015;
const PRESSURE_IT = 12;
const ALPHA_MULT  = 1.2;
const INK = [
  [16,  11,  5 ],   // 松煙
  [14,  46,  34],   // 青墨
  [61,  14,  14],   // 朱墨
];

/* ── State ───────────────────────────────── */
let W, H, gW, gH, N;
let velX, velY, dye;
let inkIdx = 0;

const wrap   = document.getElementById('wrap');
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const cursor = document.getElementById('cursor');
const hint   = document.getElementById('hint');

/* ── Palette ─────────────────────────────── */
[0,1,2].forEach(i => {
  const s = document.getElementById('sw'+i);
  s.onclick = () => {
    document.querySelectorAll('.swatch').forEach(x => x.classList.remove('sel'));
    s.classList.add('sel');
    inkIdx = i;
  };
});

/* ── Clear ───────────────────────────────── */
document.getElementById('btn-clear').onclick = reset;

/* ── Grid helpers ────────────────────────── */
function gi(x, y){
  return Math.max(0, Math.min(gW-1, x|0)) + Math.max(0, Math.min(gH-1, y|0)) * gW;
}

/* ── Init ────────────────────────────────── */
function init(){
  const r = wrap.getBoundingClientRect();
  W = canvas.width  = r.width  | 0;
  H = canvas.height = r.height | 0;
  gW = Math.ceil(W / GRID) + 3;
  gH = Math.ceil(H / GRID) + 3;
  N  = gW * gH;
  reset();
}

function reset(){
  velX = new Float32Array(N);
  velY = new Float32Array(N);
  dye  = [];
  for(let i = 0; i < N; i++) dye.push(new Float32Array(4));
  drawPaper();
}

function drawPaper(){
  ctx.fillStyle = '#f0ead8';
  ctx.fillRect(0, 0, W, H);
  /* 和紙繊維紋理 */
  ctx.save();
  for(let i = 0; i < 400; i++){
    const x = Math.random()*W, y = Math.random()*H;
    const l = 10 + Math.random()*80, a = Math.random()*Math.PI;
    const lum = 148 + Math.random()*35 | 0;
    ctx.strokeStyle = 'rgba('+lum+','+(lum-12)+','+(lum-30)+','+(0.015+Math.random()*0.04)+')';
    ctx.lineWidth   = 0.15 + Math.random()*0.45;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a)*l, y + Math.sin(a)*l);
    ctx.stroke();
  }
  ctx.restore();
}

/* ── Gaussian dye splat ──────────────────── */
function addDye(gx, gy, r, g, b, amt){
  const RADIUS = 4;
  for(let dy = -RADIUS; dy <= RADIUS; dy++){
    for(let dx = -RADIUS; dx <= RADIUS; dx++){
      const dist2 = dx*dx + dy*dy;
      if(dist2 > RADIUS*RADIUS) continue;
      const falloff = Math.exp(-dist2 / (2 * (RADIUS/2.5) * (RADIUS/2.5)));
      const f = falloff * amt;
      const i = gi(gx+dx, gy+dy);
      dye[i][0] += r * f;
      dye[i][1] += g * f;
      dye[i][2] += b * f;
      dye[i][3] += f;
    }
  }
}

function addVel(gx, gy, vx, vy, str){
  const RADIUS = 3;
  for(let dy = -RADIUS; dy <= RADIUS; dy++){
    for(let dx = -RADIUS; dx <= RADIUS; dx++){
      const dist2 = dx*dx + dy*dy;
      if(dist2 > RADIUS*RADIUS) continue;
      const f = (1 - Math.sqrt(dist2) / RADIUS) * str;
      const i = gi(gx+dx, gy+dy);
      velX[i] += vx * f;
      velY[i] += vy * f;
    }
  }
}

/* ── Fluid step (Navier-Stokes) ──────────── */
function step(){
  const nvx = new Float32Array(N);
  const nvy = new Float32Array(N);
  const nd  = [];
  for(let i = 0; i < N; i++) nd.push(new Float32Array(4));

  /* Advect velocity + dye */
  for(let y = 1; y < gH-1; y++){
    for(let x = 1; x < gW-1; x++){
      const i  = gi(x, y);
      const vx = velX[i], vy = velY[i];
      const px = x - vx, py = y - vy;
      const x0 = Math.floor(px)|0, y0 = Math.floor(py)|0;
      const fx = px - x0, fy = py - y0;
      const i00 = gi(x0,   y0  ), i10 = gi(x0+1, y0  );
      const i01 = gi(x0,   y0+1), i11 = gi(x0+1, y0+1);
      const w00 = (1-fx)*(1-fy), w10 = fx*(1-fy);
      const w01 = (1-fx)*fy,     w11 = fx*fy;
      nvx[i] = (velX[i00]*w00 + velX[i10]*w10 + velX[i01]*w01 + velX[i11]*w11) * VEL_DECAY;
      nvy[i] = (velY[i00]*w00 + velY[i10]*w10 + velY[i01]*w01 + velY[i11]*w11) * VEL_DECAY;
      for(let c = 0; c < 4; c++){
        nd[i][c] = (dye[i00][c]*w00 + dye[i10][c]*w10 + dye[i01][c]*w01 + dye[i11][c]*w11) * DYE_DECAY;
      }
    }
  }

  /* Diffuse dye */
  for(let y = 1; y < gH-1; y++){
    for(let x = 1; x < gW-1; x++){
      const i = gi(x, y);
      for(let c = 0; c < 4; c++){
        nd[i][c] += DIFFUSION * (
          nd[gi(x-1,y)][c] + nd[gi(x+1,y)][c] +
          nd[gi(x,y-1)][c] + nd[gi(x,y+1)][c] - 4*nd[i][c]
        );
      }
    }
  }

  /* Pressure projection (incompressibility) */
  const div = new Float32Array(N);
  const p   = new Float32Array(N);
  for(let y = 1; y < gH-1; y++){
    for(let x = 1; x < gW-1; x++){
      div[gi(x,y)] = -0.5*(
        nvx[gi(x+1,y)] - nvx[gi(x-1,y)] +
        nvy[gi(x,y+1)] - nvy[gi(x,y-1)]
      );
    }
  }
  for(let iter = 0; iter < PRESSURE_IT; iter++){
    for(let y = 1; y < gH-1; y++){
      for(let x = 1; x < gW-1; x++){
        const i = gi(x, y);
        p[i] = (div[i] + p[gi(x-1,y)] + p[gi(x+1,y)] + p[gi(x,y-1)] + p[gi(x,y+1)]) / 4;
      }
    }
  }
  for(let y = 1; y < gH-1; y++){
    for(let x = 1; x < gW-1; x++){
      const i = gi(x, y);
      nvx[i] -= 0.5*(p[gi(x+1,y)] - p[gi(x-1,y)]);
      nvy[i] -= 0.5*(p[gi(x,y+1)] - p[gi(x,y-1)]);
    }
  }

  velX.set(nvx); velY.set(nvy);
  for(let i = 0; i < N; i++) dye[i].set(nd[i]);
}

/* ── Render ──────────────────────────────── */
function render(){
  const img = ctx.getImageData(0, 0, W, H);
  const d   = img.data;
  const pr = 240, pg = 234, pb = 216;   /* #f0ead8 */

  for(let gy = 0; gy < gH-1; gy++){
    for(let gx = 0; gx < gW-1; gx++){
      const px0 = gx*GRID, py0 = gy*GRID;
      const i00 = gi(gx,   gy  ), i10 = gi(gx+1, gy  );
      const i01 = gi(gx,   gy+1), i11 = gi(gx+1, gy+1);

      for(let ly = 0; ly < GRID && py0+ly < H; ly++){
        for(let lx = 0; lx < GRID && px0+lx < W; lx++){
          const fx = lx/GRID, fy = ly/GRID;
          const w00 = (1-fx)*(1-fy), w10 = fx*(1-fy);
          const w01 = (1-fx)*fy,     w11 = fx*fy;
          const da = dye[i00][3]*w00 + dye[i10][3]*w10 + dye[i01][3]*w01 + dye[i11][3]*w11;
          if(da < 0.002) continue;
          const dr = dye[i00][0]*w00 + dye[i10][0]*w10 + dye[i01][0]*w01 + dye[i11][0]*w11;
          const dg = dye[i00][1]*w00 + dye[i10][1]*w10 + dye[i01][1]*w01 + dye[i11][1]*w11;
          const db = dye[i00][2]*w00 + dye[i10][2]*w10 + dye[i01][2]*w01 + dye[i11][2]*w11;
          const alpha = Math.min(1, da * ALPHA_MULT);
          const ir = dr/da, ig = dg/da, ib = db/da;
          const pi = ((py0+ly)*W + (px0+lx)) * 4;
          d[pi  ] = (pr + (ir-pr)*alpha) | 0;
          d[pi+1] = (pg + (ig-pg)*alpha) | 0;
          d[pi+2] = (pb + (ib-pb)*alpha) | 0;
          d[pi+3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ── Mouse / touch ───────────────────────── */
let mx = 0, my = 0, pmx = 0, pmy = 0, isDown = false;

function getPos(e){
  const r = wrap.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - r.left, y: t.clientY - r.top };
}

wrap.addEventListener('mousemove', e => {
  const p = getPos(e);
  cursor.style.left = p.x + 'px';
  cursor.style.top  = p.y + 'px';
  pmx = mx; pmy = my; mx = p.x; my = p.y;

  const dvx = (p.x - pmx) / GRID, dvy = (p.y - pmy) / GRID;
  const spd = Math.sqrt(dvx*dvx + dvy*dvy);
  const gx  = (p.x / GRID) | 0, gy = (p.y / GRID) | 0;

  if(isDown){
    /* 按住拖曳：濃墨注入 + 強速度 */
    if(spd > 0.01){
      addVel(gx, gy, dvx * 3.5, dvy * 3.5, 4.0);
      addDye(gx, gy, INK[inkIdx][0], INK[inkIdx][1], INK[inkIdx][2], 3.0 * Math.min(1, spd * 2));
    }
  } else {
    /* Hover：輕微速度擾動，不加墨 */
    if(spd > 0.015){
      addVel(gx, gy, dvx * 1.2, dvy * 1.2, 0.3);
    }
  }
});

wrap.addEventListener('mousedown', e => {
  isDown = true;
  const p  = getPos(e);
  pmx = mx = p.x; pmy = my = p.y;
  const gx = (p.x / GRID) | 0, gy = (p.y / GRID) | 0;
  /* 點擊落墨：隨機方向小速度 */
  const a  = Math.random() * Math.PI * 2;
  addDye(gx, gy, INK[inkIdx][0], INK[inkIdx][1], INK[inkIdx][2], 4.0);
  addVel(gx, gy, Math.cos(a) * 0.4, Math.sin(a) * 0.4, 1.2);
  hint.style.opacity = '0';
});

wrap.addEventListener('mouseup',    () => isDown = false);
wrap.addEventListener('mouseleave', () => isDown = false);

/* Touch */
wrap.addEventListener('touchstart', e => {
  e.preventDefault();
  isDown = true;
  const p  = getPos(e);
  pmx = mx = p.x; pmy = my = p.y;
  const gx = (p.x / GRID) | 0, gy = (p.y / GRID) | 0;
  const a  = Math.random() * Math.PI * 2;
  addDye(gx, gy, INK[inkIdx][0], INK[inkIdx][1], INK[inkIdx][2], 4.0);
  addVel(gx, gy, Math.cos(a)*0.4, Math.sin(a)*0.4, 1.2);
  hint.style.opacity = '0';
}, { passive: false });

wrap.addEventListener('touchend', () => isDown = false);

wrap.addEventListener('touchmove', e => {
  e.preventDefault();
  const p   = getPos(e);
  pmx = mx; pmy = my; mx = p.x; my = p.y;
  const dvx = (p.x - pmx) / GRID, dvy = (p.y - pmy) / GRID;
  const spd = Math.sqrt(dvx*dvx + dvy*dvy);
  const gx  = (p.x / GRID) | 0, gy = (p.y / GRID) | 0;
  if(spd > 0.01){
    addVel(gx, gy, dvx * 3.5, dvy * 3.5, 4.0);
    addDye(gx, gy, INK[inkIdx][0], INK[inkIdx][1], INK[inkIdx][2], 3.0 * Math.min(1, spd * 2));
  }
}, { passive: false });

/* ── Loop ────────────────────────────────── */
window.addEventListener('resize', init);
let frame = 0;
(function loop(){
  requestAnimationFrame(loop);
  step();
  if(++frame % 2 === 0) render();
})();

init();

})();
</script>
</body>
</html>`
