import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.html(HTML))
export default app

const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>墨流し — LNPRJ08</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#f0e8d8}
canvas{display:block;position:fixed;inset:0;width:100%;height:100%}
.vtext{
  writing-mode:vertical-rl;
  font-family:'Hiragino Mincho ProN','Yu Mincho','MS Mincho',Georgia,serif;
  position:fixed;pointer-events:none;line-height:1.8;letter-spacing:.25em;user-select:none
}
#btn-clear{
  writing-mode:vertical-rl;
  font-family:'Hiragino Mincho ProN','Yu Mincho','MS Mincho',Georgia,serif;
  position:fixed;top:28px;left:26px;font-size:15px;
  color:rgba(40,20,0,0.38);cursor:pointer;pointer-events:all;
  letter-spacing:.3em;line-height:1.8;background:none;border:none;
  transition:color .25s;user-select:none;z-index:10
}
#btn-clear:hover{color:rgba(40,20,0,0.70)}
#title{top:22px;right:28px;font-size:20px;color:rgba(25,12,2,0.22);letter-spacing:.55em;line-height:2;z-index:10}
#hint{bottom:36px;left:26px;font-size:10px;color:rgba(40,20,0,0.22);letter-spacing:.18em;line-height:2;transition:opacity 2.5s;z-index:10}
#seal{
  position:fixed;bottom:30px;right:26px;width:40px;height:40px;background:#8b1a1a;
  display:flex;align-items:center;justify-content:center;
  font-family:'Hiragino Mincho ProN','Yu Mincho',serif;
  font-size:20px;color:#f0ead8;border-radius:2px;
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.12),0 1px 4px rgba(0,0,0,0.18);
  pointer-events:none;z-index:10
}
#palette{
  position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
  display:flex;gap:14px;align-items:center;pointer-events:all;z-index:10
}
.swatch{
  width:22px;height:22px;border-radius:50%;border:2px solid transparent;
  cursor:pointer;transition:transform .18s,border-color .2s
}
.swatch.sel{border-color:rgba(40,20,0,0.50);transform:scale(1.28)}
#cursor{position:fixed;pointer-events:none;z-index:30;transform:translate(-50%,-50%)}
#no-webgl{
  position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
  font-family:serif;font-size:16px;color:#3a2810;background:#f0ead8;z-index:999;
  flex-direction:column;gap:12px;text-align:center;padding:24px
}
</style>
<script src="https://lnprj.neillin-lct.workers.dev/lnprj-nav.js"></script>
</head>
<body>
<a href="https://lnprj.neillin-lct.workers.dev/" style="position:fixed;top:16px;left:50%;transform:translateX(-50%);font-family:serif;font-size:11px;letter-spacing:.2em;color:rgba(40,20,0,0.3);text-decoration:none;z-index:100;white-space:nowrap;">LNPRJ</a>
<canvas id="c"></canvas>

<button id="btn-clear">洗&emsp;硯</button>
<div id="title" class="vtext">墨&emsp;流&emsp;し</div>
<div id="hint" class="vtext">輕撫紙面攪墨&emsp;｜&emsp;按住滴墨</div>
<div id="seal">墨</div>

<!-- Mode toggle (top-right, above title) -->
<div id="mode-toggle" style="position:fixed;top:20px;right:68px;z-index:20;display:flex;gap:0;">
  <button id="btn-mode-calli" style="font-family:serif;font-size:10px;letter-spacing:.15em;padding:4px 10px;background:rgba(40,20,0,0.12);border:1px solid rgba(40,20,0,0.22);border-right:none;border-radius:2px 0 0 2px;color:rgba(40,20,0,0.75);cursor:pointer;">書法</button>
  <button id="btn-mode-fluid" style="font-family:serif;font-size:10px;letter-spacing:.15em;padding:4px 10px;background:none;border:1px solid rgba(40,20,0,0.22);border-radius:0 2px 2px 0;color:rgba(40,20,0,0.38);cursor:pointer;">墨流</button>
</div>

<!-- Grid toggle button (書法 mode only) -->
<button id="btn-grid" style="position:fixed;bottom:32px;right:22px;font-family:serif;font-size:10px;letter-spacing:.15em;color:rgba(180,40,40,0.55);cursor:pointer;background:none;border:1px solid rgba(180,40,40,0.25);padding:4px 10px;border-radius:2px;z-index:20;">格線</button>

<!-- SVG 九宮格 overlay (hidden by default) -->
<svg id="grid-overlay" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:5;display:none;"></svg>

<!-- 左側說明文字 (書法 mode only) -->
<div id="side-left" style="position:fixed;left:28px;top:42%;writing-mode:vertical-rl;font-family:serif;font-size:10px;letter-spacing:.25em;color:rgba(40,20,0,0.55);line-height:2.2;pointer-events:none;">
輕撫水面<br>墨韻自生<br>｜<br>按住注墨<br>拖曳成渦<br>放手淡出
</div>

<!-- 右側技術說明 (墨流 mode only) -->
<div id="side-right" style="position:fixed;right:22px;top:38%;writing-mode:vertical-rl;font-family:serif;font-size:9px;letter-spacing:.2em;color:rgba(40,20,0,0.48);line-height:2.4;pointer-events:none;">
WebGL2　Fluid Simulation<br>Navier-Stokes　方程式<br>速度場　壓力場　染料場<br>512×512　浮點紋理<br>即時　60Hz　渲染
</div>

<div id="palette">
  <div class="swatch sel" id="sw0" style="background:#100b05" title="松煙"></div>
  <div class="swatch"     id="sw1" style="background:#0e2e22" title="青墨"></div>
  <div class="swatch"     id="sw2" style="background:#3d0e0e" title="朱墨"></div>
</div>

<svg id="cursor" width="18" height="18" viewBox="0 0 18 18">
  <circle cx="9" cy="9" r="2.8" fill="rgba(12,6,2,0.80)"/>
  <circle cx="9" cy="9" r="7.5" fill="none" stroke="rgba(12,6,2,0.18)" stroke-width="1"/>
</svg>

<script>
(function(){
'use strict';

/* ── Ink color palette ───────────────────── */
const INKS = [
  [0.063, 0.043, 0.020],   // 松煙
  [0.055, 0.180, 0.133],   // 青墨
  [0.240, 0.055, 0.055],   // 朱墨
];
let inkIdx = 0;

/* ── Simulation constants ────────────────── */
const SIM      = 512;
const DISS_VEL = 0.965;
const DISS_DYE = 0.972;
const DISS_P   = 0.8;
const P_ITER   = 30;

/* ── Canvas ──────────────────────────────── */
const canvas = document.getElementById('c');
canvas.style.cursor = 'none';

/* ── WebGL2 init ─────────────────────────── */
const gl = canvas.getContext('webgl2');
if (!gl) {
  showError('此瀏覽器不支援 WebGL2，請使用 Chrome / Firefox / Edge。');
  return;
}
if (!gl.getExtension('EXT_color_buffer_float')) {
  showError('此瀏覽器不支援浮點 color buffer（EXT_color_buffer_float）。');
  return;
}
const FILTER = gl.getExtension('OES_texture_float_linear') ? gl.LINEAR : gl.NEAREST;

function showError(msg) {
  document.body.insertAdjacentHTML('beforeend',
    '<div id="no-webgl"><p>' + msg + '</p></div>');
}

/* ═══════════════════════════════════════════
   GLSL Shader sources
   ═══════════════════════════════════════════ */

/* Shared vertex shader — full-screen quad */
const VS = \`#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}\`;

/* Pass 1a – Semi-Lagrangian advection for velocity */
const FS_ADVECT = \`#version 300 es
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform float     uDissipation;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec2 vel    = texture(uVelocity, vUv).xy;
  vec2 coord  = vUv - vel;
  fragColor   = uDissipation * texture(uSource, coord);
}\`;

/* Pass 1b – Dye advection with Laplacian diffusion for soft blending */
const FS_DYE_ADVECT = \`#version 300 es
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform float     uDissipation;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec2 ts     = 1.0 / vec2(textureSize(uSource, 0));
  vec2 vel    = texture(uVelocity, vUv).xy;
  vec2 coord  = vUv - vel;
  vec4 result = uDissipation * texture(uSource, coord);
  /* Laplacian diffusion — softens colour boundaries */
  vec4 neighbors = texture(uSource, vUv + vec2(ts.x,  0.0))
                 + texture(uSource, vUv - vec2(ts.x,  0.0))
                 + texture(uSource, vUv + vec2(0.0,  ts.y))
                 + texture(uSource, vUv - vec2(0.0,  ts.y));
  result = mix(result, neighbors * 0.25, 0.42);
  fragColor = result;
}\`;

/* Pass 2a – Divergence */
const FS_DIV = \`#version 300 es
precision highp float;
uniform sampler2D uVelocity;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec2 ts = 1.0 / vec2(textureSize(uVelocity, 0));
  float L = texture(uVelocity, vUv - vec2(ts.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(ts.x, 0.0)).x;
  float B = texture(uVelocity, vUv - vec2(0.0, ts.y)).y;
  float T = texture(uVelocity, vUv + vec2(0.0, ts.y)).y;
  fragColor = vec4(0.5*(R - L + T - B), 0.0, 0.0, 1.0);
}\`;

/* Pass 2b – Jacobi pressure iteration */
const FS_PRESSURE = \`#version 300 es
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform float     uDissipation;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec2 ts  = 1.0 / vec2(textureSize(uPressure, 0));
  float L  = texture(uPressure, vUv - vec2(ts.x, 0.0)).x;
  float R  = texture(uPressure, vUv + vec2(ts.x, 0.0)).x;
  float B  = texture(uPressure, vUv - vec2(0.0, ts.y)).x;
  float T  = texture(uPressure, vUv + vec2(0.0, ts.y)).x;
  float dv = texture(uDivergence, vUv).x;
  fragColor = vec4(uDissipation * (L + R + B + T - dv) * 0.25, 0.0, 0.0, 1.0);
}\`;

/* Pass 3 – Gradient subtract (pressure projection) */
const FS_GRAD = \`#version 300 es
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec2 ts = 1.0 / vec2(textureSize(uPressure, 0));
  float L = texture(uPressure, vUv - vec2(ts.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(ts.x, 0.0)).x;
  float B = texture(uPressure, vUv - vec2(0.0, ts.y)).x;
  float T = texture(uPressure, vUv + vec2(0.0, ts.y)).x;
  vec2 vel = texture(uVelocity, vUv).xy - 0.5 * vec2(R - L, T - B);
  fragColor = vec4(vel, 0.0, 1.0);
}\`;

/* Velocity Gaussian splat */
const FS_VEL_SPLAT = \`#version 300 es
precision highp float;
uniform sampler2D uTarget;
uniform vec2  uPoint;
uniform vec2  uForce;
uniform float uRadius;
uniform float uAspect;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec2 p  = vUv - uPoint;
  p.x    *= uAspect;
  float s = exp(-dot(p,p) / uRadius);
  fragColor = vec4(texture(uTarget, vUv).xy + s * uForce, 0.0, 1.0);
}\`;

/* Dye Gaussian splat (premultiplied RGBA) */
const FS_DYE_SPLAT = \`#version 300 es
precision highp float;
uniform sampler2D uTarget;
uniform vec2  uPoint;
uniform vec3  uColor;
uniform float uRadius;
uniform float uAspect;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec2 p  = vUv - uPoint;
  p.x    *= uAspect;
  float s = exp(-dot(p,p) / uRadius);
  vec4  b = texture(uTarget, vUv);
  fragColor = b + vec4(uColor * s, s);
}\`;

/* Final display pass — 3-layer radial blur + smoothstep alpha */
const FS_DISPLAY = \`#version 300 es
precision highp float;
uniform sampler2D uDye;
in vec2 vUv;
out vec4 fragColor;
void main(){
  vec3 bg  = vec3(0.941, 0.918, 0.847);   /* #f0ead8 */
  vec2 ts  = 1.0 / vec2(textureSize(uDye, 0));
  /* Layer 0 — centre */
  vec4 d0 = texture(uDye, vUv);
  /* Layer 1 — radius 3 texels */
  vec4 d1 = ( texture(uDye, vUv + vec2(ts.x*3.0, 0.0))
            + texture(uDye, vUv - vec2(ts.x*3.0, 0.0))
            + texture(uDye, vUv + vec2(0.0, ts.y*3.0))
            + texture(uDye, vUv - vec2(0.0, ts.y*3.0)) ) * 0.25;
  /* Layer 2 — radius 7 texels (wide water-diffusion halo) */
  vec4 d2 = ( texture(uDye, vUv + vec2(ts.x*7.0, 0.0))
            + texture(uDye, vUv - vec2(ts.x*7.0, 0.0))
            + texture(uDye, vUv + vec2(0.0, ts.y*7.0))
            + texture(uDye, vUv - vec2(0.0, ts.y*7.0)) ) * 0.25;
  vec4 d  = d0*0.50 + d1*0.32 + d2*0.18;
  /* wider smoothstep for feathered edge */
  float a  = smoothstep(0.0, 0.55, d.a * 1.8);
  vec3 ink = (d.a > 0.0005) ? d.rgb / d.a : bg;
  fragColor = vec4(mix(bg, ink, a), 1.0);
}\`;

/* ═══════════════════════════════════════════
   WebGL helpers
   ═══════════════════════════════════════════ */

function compileShader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error('Shader error: ' + gl.getShaderInfoLog(s));
  return s;
}

function createProgram(vsSrc, fsSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER,   vsSrc));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error('Link error: ' + gl.getProgramInfoLog(prog));
  const cache = {};
  return {
    use() { gl.useProgram(prog); },
    u(name) {
      if (!(name in cache)) cache[name] = gl.getUniformLocation(prog, name);
      return cache[name];
    }
  };
}

/* Full-screen quad VAO — shared by every pass */
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const vbuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
gl.bufferData(gl.ARRAY_BUFFER,
  new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);

function createFBO(w, h, iFmt, fmt, type, filter) {
  gl.activeTexture(gl.TEXTURE0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, iFmt, w, h, 0, fmt, type, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D, tex, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE)
    console.warn('FBO incomplete:', status.toString(16));
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex, w, h };
}

function doubleFBO(w, h, iFmt, fmt, type, filter) {
  let a = createFBO(w, h, iFmt, fmt, type, filter);
  let b = createFBO(w, h, iFmt, fmt, type, filter);
  return {
    get read()  { return a; },
    get write() { return b; },
    swap() { const t=a; a=b; b=t; }
  };
}

/* ── Compile programs ────────────────────── */
const pAdvect    = createProgram(VS, FS_ADVECT);
const pDyeAdvect = createProgram(VS, FS_DYE_ADVECT);
const pDiv       = createProgram(VS, FS_DIV);
const pPressure  = createProgram(VS, FS_PRESSURE);
const pGrad      = createProgram(VS, FS_GRAD);
const pVelSplat  = createProgram(VS, FS_VEL_SPLAT);
const pDyeSplat  = createProgram(VS, FS_DYE_SPLAT);
const pDisplay   = createProgram(VS, FS_DISPLAY);

/* ── Field FBOs ──────────────────────────── */
let velocity, pressure, divFBO, dye;

function initFBOs() {
  velocity = doubleFBO(SIM, SIM, gl.RG16F,   gl.RG,   gl.HALF_FLOAT, FILTER);
  pressure = doubleFBO(SIM, SIM, gl.R16F,    gl.RED,  gl.HALF_FLOAT, FILTER);
  divFBO   = createFBO(SIM, SIM, gl.R16F,    gl.RED,  gl.HALF_FLOAT, gl.NEAREST);
  dye      = doubleFBO(SIM, SIM, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, FILTER);
}

/* ── Resize ──────────────────────────────── */
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  initFBOs();
}
window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  initFBOs();
  pmx = mx = canvas.width  * 0.5;
  pmy = my = canvas.height * 0.5;
});
resize();

/* ── Blit & texture helpers ──────────────── */
function blit(target) {
  gl.bindVertexArray(vao);
  if (target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.viewport(0, 0, target.w, target.h);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);
}

function bindTex(texture, unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

/* ═══════════════════════════════════════════
   Splat functions
   ═══════════════════════════════════════════ */

function splatVelocity(px, py, fx, fy, radius) {
  const aspect = canvas.width / canvas.height;
  pVelSplat.use();
  gl.uniform1i(pVelSplat.u('uTarget'), 0);
  gl.uniform2f(pVelSplat.u('uPoint'),  px, py);
  gl.uniform2f(pVelSplat.u('uForce'),  fx, fy);
  gl.uniform1f(pVelSplat.u('uRadius'), radius);
  gl.uniform1f(pVelSplat.u('uAspect'), aspect);
  bindTex(velocity.read.tex, 0);
  blit(velocity.write);
  velocity.swap();
}

function splatDye(px, py, color, radius, amt) {
  const aspect = canvas.width / canvas.height;
  pDyeSplat.use();
  gl.uniform1i(pDyeSplat.u('uTarget'), 0);
  gl.uniform2f(pDyeSplat.u('uPoint'),  px, py);
  gl.uniform3f(pDyeSplat.u('uColor'),
    color[0] * amt, color[1] * amt, color[2] * amt);
  gl.uniform1f(pDyeSplat.u('uRadius'), radius);
  gl.uniform1f(pDyeSplat.u('uAspect'), aspect);
  bindTex(dye.read.tex, 0);
  blit(dye.write);
  dye.swap();
}

/* ═══════════════════════════════════════════
   Mouse / touch state
   ═══════════════════════════════════════════ */
let mx  = canvas.width  * 0.5;
let my  = canvas.height * 0.5;
let pmx = mx, pmy = my;
let isDown = false;

const hintEl  = document.getElementById('hint');
const cursorEl = document.getElementById('cursor');

function getPos(e) {
  const t = e.touches ? e.touches[0] : e;
  return [t.clientX, t.clientY];
}

window.addEventListener('mousemove', e => {
  [mx, my] = getPos(e);
  cursorEl.style.left = mx + 'px';
  cursorEl.style.top  = my + 'px';
});

window.addEventListener('mousedown', e => {
  isDown = true;
  [mx, my] = getPos(e);
  pmx = mx; pmy = my;
  hintEl.style.opacity = '0';
  /* Instant ink drop: large dye splat + tiny random velocity */
  const W = canvas.width, H = canvas.height;
  const ux = mx / W, uy = 1.0 - my / H;
  splatDye(ux, uy, INKS[inkIdx], 0.0006, 1.0);
  const a = Math.random() * Math.PI * 2;
  splatVelocity(ux, uy,
    Math.cos(a) * 0.003, Math.sin(a) * 0.003, 0.0008);
});

window.addEventListener('mouseup',    () => isDown = false);
window.addEventListener('mouseleave', () => isDown = false);

window.addEventListener('touchstart', e => {
  e.preventDefault();
  isDown = true;
  [mx, my] = getPos(e);
  pmx = mx; pmy = my;
  hintEl.style.opacity = '0';
  const W = canvas.width, H = canvas.height;
  const ux = mx / W, uy = 1.0 - my / H;
  splatDye(ux, uy, INKS[inkIdx], 0.0006, 1.0);
  const a = Math.random() * Math.PI * 2;
  splatVelocity(ux, uy, Math.cos(a)*0.003, Math.sin(a)*0.003, 0.0008);
}, { passive: false });

window.addEventListener('touchend',  () => isDown = false);

window.addEventListener('touchmove', e => {
  e.preventDefault();
  [mx, my] = getPos(e);
  cursorEl.style.left = mx + 'px';
  cursorEl.style.top  = my + 'px';
}, { passive: false });

/* ── Palette & clear ─────────────────────── */
[0, 1, 2].forEach(i => {
  document.getElementById('sw' + i).onclick = () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
    document.getElementById('sw' + i).classList.add('sel');
    inkIdx = i;
  };
});

document.getElementById('btn-clear').onclick = () => {
  initFBOs();
};

/* ── Mode switching ──────────────────────── */
let currentMode = 'calli';   // 'calli' | 'fluid'
let gridVisible = false;
let gridWasVisible = false;  // remember grid state across mode switches

const btnCalli   = document.getElementById('btn-mode-calli');
const btnFluid   = document.getElementById('btn-mode-fluid');
const btnGrid    = document.getElementById('btn-grid');
const gridSVG    = document.getElementById('grid-overlay');
const sideLeft   = document.getElementById('side-left');
const sideRight  = document.getElementById('side-right');

function buildGrid() {
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.72;
  const cell = size / 3;
  gridSVG.setAttribute('width',  size);
  gridSVG.setAttribute('height', size);
  gridSVG.style.width  = size + 'px';
  gridSVG.style.height = size + 'px';

  let svg = '';
  /* Outer frame */
  svg += \`<rect x="0" y="0" width="\${size}" height="\${size}" stroke="#c0403a" stroke-width="1.5" fill="none"/>\`;
  /* Inner grid lines (4-tap: 2 horizontal + 2 vertical) */
  for (let i = 1; i < 3; i++) {
    svg += \`<line x1="\${cell*i}" y1="0" x2="\${cell*i}" y2="\${size}" stroke="#c0403a" stroke-width="0.8" opacity="0.6"/>\`;
    svg += \`<line x1="0" y1="\${cell*i}" x2="\${size}" y2="\${cell*i}" stroke="#c0403a" stroke-width="0.8" opacity="0.6"/>\`;
  }
  /* Diagonal helper lines in each cell */
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x0 = col * cell, y0 = row * cell;
      const x1 = x0 + cell, y1 = y0 + cell;
      svg += \`<line x1="\${x0}" y1="\${y0}" x2="\${x1}" y2="\${y1}" stroke="#c0403a" stroke-width="0.4" opacity="0.3" stroke-dasharray="4,4"/>\`;
      svg += \`<line x1="\${x1}" y1="\${y0}" x2="\${x0}" y2="\${y1}" stroke="#c0403a" stroke-width="0.4" opacity="0.3" stroke-dasharray="4,4"/>\`;
    }
  }
  gridSVG.innerHTML = svg;
}

function showGrid(on) {
  gridVisible = on;
  gridSVG.style.display = on ? 'block' : 'none';
  if (on) buildGrid();
  btnGrid.style.background = on ? 'rgba(180,40,40,0.10)' : 'none';
}

function setMode(mode) {
  currentMode = mode;

  if (mode === 'calli') {
    /* 書法 mode */
    btnCalli.style.background = 'rgba(40,20,0,0.12)';
    btnCalli.style.color = 'rgba(40,20,0,0.75)';
    btnFluid.style.background = 'none';
    btnFluid.style.color = 'rgba(40,20,0,0.38)';
    btnGrid.style.display  = 'block';
    sideLeft.style.display = 'block';
    sideRight.style.display = 'none';
    /* Restore previous grid state */
    showGrid(gridWasVisible);
  } else {
    /* 墨流 mode */
    btnFluid.style.background = 'rgba(40,20,0,0.12)';
    btnFluid.style.color = 'rgba(40,20,0,0.75)';
    btnCalli.style.background = 'none';
    btnCalli.style.color = 'rgba(40,20,0,0.38)';
    btnGrid.style.display  = 'none';
    sideLeft.style.display = 'none';
    sideRight.style.display = 'block';
    /* Save & hide grid */
    gridWasVisible = gridVisible;
    showGrid(false);
  }
}

btnCalli.onclick = () => setMode('calli');
btnFluid.onclick = () => setMode('fluid');
btnGrid.onclick  = () => showGrid(!gridVisible);

/* Rebuild grid on resize */
window.addEventListener('resize', () => { if (gridVisible) buildGrid(); });

/* Init in 書法 mode */
setMode('calli');

/* ═══════════════════════════════════════════
   Main simulation step
   ═══════════════════════════════════════════ */
function step() {
  const W = canvas.width, H = canvas.height;

  /* ── Mouse interaction ─── */
  const dx = mx - pmx;
  const dy = my - pmy;
  const moved = Math.abs(dx) + Math.abs(dy) > 0.3;

  if (moved) {
    const ux = mx / W;
    const uy = 1.0 - my / H;
    /* Clamp UV deltas to prevent huge impulse on first move */
    const fx = Math.max(-0.05, Math.min(0.05,  dx / W));
    const fy = Math.max(-0.05, Math.min(0.05, -dy / H));

    if (isDown) {
      /* Press + drag: strong velocity + dense dye */
      splatVelocity(ux, uy, fx * 5.0, fy * 5.0, 0.0005);
      splatDye(ux, uy, INKS[inkIdx], 0.0003, 1.0);
    } else {
      /* Hover only: gentle velocity disturbance, no dye */
      splatVelocity(ux, uy, fx * 1.8, fy * 1.8, 0.0015);
    }
  }
  pmx = mx; pmy = my;

  /* ── Pass 1: Advect velocity ─── */
  pAdvect.use();
  gl.uniform1i(pAdvect.u('uVelocity'),    0);
  gl.uniform1i(pAdvect.u('uSource'),      1);
  gl.uniform1f(pAdvect.u('uDissipation'), DISS_VEL);
  bindTex(velocity.read.tex, 0);
  bindTex(velocity.read.tex, 1);
  blit(velocity.write);
  velocity.swap();

  /* ── Pass 1b: Advect dye (with Laplacian diffusion) ─── */
  pDyeAdvect.use();
  gl.uniform1i(pDyeAdvect.u('uVelocity'),    0);
  gl.uniform1i(pDyeAdvect.u('uSource'),      1);
  gl.uniform1f(pDyeAdvect.u('uDissipation'), DISS_DYE);
  bindTex(velocity.read.tex, 0);
  bindTex(dye.read.tex,      1);
  blit(dye.write);
  dye.swap();

  /* ── Pass 2a: Divergence ─── */
  pDiv.use();
  gl.uniform1i(pDiv.u('uVelocity'), 0);
  bindTex(velocity.read.tex, 0);
  blit(divFBO);

  /* ── Pass 2b: Pressure (Jacobi x30) ─── */
  pPressure.use();
  gl.uniform1i(pPressure.u('uPressure'),   0);
  gl.uniform1i(pPressure.u('uDivergence'), 1);
  gl.uniform1f(pPressure.u('uDissipation'), DISS_P);
  bindTex(divFBO.tex, 1);
  for (let i = 0; i < P_ITER; i++) {
    bindTex(pressure.read.tex, 0);
    blit(pressure.write);
    pressure.swap();
  }

  /* ── Pass 3: Gradient subtract ─── */
  pGrad.use();
  gl.uniform1i(pGrad.u('uPressure'),  0);
  gl.uniform1i(pGrad.u('uVelocity'), 1);
  bindTex(pressure.read.tex, 0);
  bindTex(velocity.read.tex, 1);
  blit(velocity.write);
  velocity.swap();

  /* ── Pass 4: Render dye to canvas ─── */
  pDisplay.use();
  gl.uniform1i(pDisplay.u('uDye'), 0);
  bindTex(dye.read.tex, 0);
  blit(null);
}

/* ── Animation loop ──────────────────────── */
(function loop() {
  requestAnimationFrame(loop);
  try { step(); } catch(e) { console.error(e); }
})();

})();
</script>
</body>
</html>`
