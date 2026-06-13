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
<title>墨流し</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#f2ece0}
#wrap{width:100vw;height:100vh;position:relative;cursor:none}
canvas{display:block;width:100%;height:100%}
#ui{
  position:absolute;bottom:24px;left:50%;transform:translateX(-50%);
  display:flex;align-items:center;gap:14px;
  background:rgba(242,236,224,0.90);backdrop-filter:blur(12px);
  border:1px solid rgba(60,40,20,0.12);border-radius:36px;
  padding:10px 24px;z-index:10
}
.ink-swatch{
  width:26px;height:26px;border-radius:50%;
  border:2px solid transparent;cursor:pointer;
  transition:transform .18s,border-color .18s;flex-shrink:0
}
.ink-swatch.sel{border-color:rgba(40,20,0,0.55);transform:scale(1.22)}
.vline{width:1px;height:18px;background:rgba(60,40,20,0.13)}
.btn{
  background:none;border:1px solid rgba(60,40,20,0.18);
  border-radius:16px;padding:5px 14px;
  font-size:11px;color:#3a2810;cursor:pointer;
  font-family:serif;letter-spacing:.1em;white-space:nowrap;
  transition:background .15s
}
.btn:hover{background:rgba(60,40,20,0.07)}
#title{
  position:absolute;top:20px;left:50%;transform:translateX(-50%);
  font-family:serif;font-size:13px;letter-spacing:.4em;
  color:rgba(40,20,0,0.28);pointer-events:none;white-space:nowrap
}
#hint{
  position:absolute;bottom:80px;left:50%;transform:translateX(-50%);
  font-family:serif;font-size:11px;letter-spacing:.18em;
  color:rgba(40,20,0,0.22);pointer-events:none;
  transition:opacity 2s;white-space:nowrap
}
#cursor-ring{
  position:absolute;pointer-events:none;z-index:20;
  transform:translate(-50%,-50%);transition:transform .1s
}
</style>
</head>
<body>
<div id="wrap">
  <canvas id="c"></canvas>
  <div id="title">墨　流　し</div>
  <div id="hint">点墨　｜　攪拌</div>
  <svg id="cursor-ring" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="3.5" fill="rgba(15,8,2,0.75)"/>
    <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(15,8,2,0.2)" stroke-width="1"/>
  </svg>
  <div id="ui">
    <div class="ink-swatch sel" id="sw0" style="background:#100b05" title="松煙"></div>
    <div class="ink-swatch"     id="sw1" style="background:#0e2e22" title="青墨"></div>
    <div class="ink-swatch"     id="sw2" style="background:#3d0e0e" title="朱墨"></div>
    <div class="vline"></div>
    <button class="btn" id="btn-wave">波紋</button>
    <button class="btn" id="btn-clear">清紙</button>
  </div>
</div>
<script>
(function(){
const wrap=document.getElementById('wrap');
const canvas=document.getElementById('c');
const ctx=canvas.getContext('2d');
const curRing=document.getElementById('cursor-ring');
const hint=document.getElementById('hint');

let W,H,gW,gH;
const GRID=52;

const INK=[
  [16,11,5],
  [14,46,34],
  [61,14,14]
];
let inkIdx=0;

const swatches=[0,1,2].map(i=>document.getElementById('sw'+i));
swatches.forEach((s,i)=>s.onclick=()=>{
  swatches.forEach(x=>x.classList.remove('sel'));
  s.classList.add('sel');
  inkIdx=i;
});

let velX,velY,dye;

function init(){
  const r=wrap.getBoundingClientRect();
  W=canvas.width=r.width|0;
  H=canvas.height=r.height|0;
  gW=Math.ceil(W/GRID)+3;
  gH=Math.ceil(H/GRID)+3;
  const n=gW*gH;
  velX=new Float32Array(n);
  velY=new Float32Array(n);
  dye=[];
  for(let i=0;i<n;i++) dye.push(new Float32Array(4));
  drawPaper();
}

function drawPaper(){
  ctx.fillStyle='#f2ece0';
  ctx.fillRect(0,0,W,H);
  ctx.save();
  for(let i=0;i<280;i++){
    const x=Math.random()*W,y=Math.random()*H;
    const l=15+Math.random()*90,a=Math.random()*Math.PI;
    ctx.strokeStyle='rgba('+(155+Math.random()*40|0)+','+(140+Math.random()*30|0)+','+(108+Math.random()*25|0)+','+(0.02+Math.random()*0.045)+')';
    ctx.lineWidth=0.2+Math.random()*0.5;
    ctx.beginPath();ctx.moveTo(x,y);
    ctx.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);
    ctx.stroke();
  }
  ctx.restore();
}

function gi(x,y){return Math.max(0,Math.min(gW-1,x))+Math.max(0,Math.min(gH-1,y))*gW}

function addDye(gx,gy,r,g,b,amt){
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<=1.5){
      const f=(1-d/2)*amt;
      const i=gi(gx+dx,gy+dy);
      dye[i][0]+=r*f;dye[i][1]+=g*f;dye[i][2]+=b*f;dye[i][3]+=f;
    }
  }
}

function addVel(gx,gy,vx,vy,str){
  for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<=2){
      const f=(1-d/2.5)*str;
      const i=gi(gx+dx,gy+dy);
      velX[i]+=vx*f;velY[i]+=vy*f;
    }
  }
}

function step(){
  const n=gW*gH;
  const nvx=new Float32Array(n),nvy=new Float32Array(n);
  const nd=[];for(let i=0;i<n;i++) nd.push(new Float32Array(4));

  for(let y=1;y<gH-1;y++) for(let x=1;x<gW-1;x++){
    const i=gi(x,y);
    const vx=velX[i],vy=velY[i];
    const px=x-vx,py=y-vy;
    const x0=Math.floor(px)|0,y0=Math.floor(py)|0;
    const fx=px-x0,fy=py-y0;
    const i00=gi(x0,y0),i10=gi(x0+1,y0),i01=gi(x0,y0+1),i11=gi(x0+1,y0+1);
    const w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
    nvx[i]=(velX[i00]*w00+velX[i10]*w10+velX[i01]*w01+velX[i11]*w11)*0.987;
    nvy[i]=(velY[i00]*w00+velY[i10]*w10+velY[i01]*w01+velY[i11]*w11)*0.987;
    for(let c=0;c<4;c++){
      nd[i][c]=(dye[i00][c]*w00+dye[i10][c]*w10+dye[i01][c]*w01+dye[i11][c]*w11)*0.997;
    }
  }

  const diff=0.008;
  for(let y=1;y<gH-1;y++) for(let x=1;x<gW-1;x++){
    const i=gi(x,y);
    for(let c=0;c<4;c++){
      nd[i][c]+=diff*(nd[gi(x-1,y)][c]+nd[gi(x+1,y)][c]+nd[gi(x,y-1)][c]+nd[gi(x,y+1)][c]-4*nd[i][c]);
    }
  }

  const div=new Float32Array(n),p=new Float32Array(n);
  for(let y=1;y<gH-1;y++) for(let x=1;x<gW-1;x++){
    div[gi(x,y)]=-0.5*(nvx[gi(x+1,y)]-nvx[gi(x-1,y)]+nvy[gi(x,y+1)]-nvy[gi(x,y-1)]);
  }
  for(let iter=0;iter<8;iter++){
    for(let y=1;y<gH-1;y++) for(let x=1;x<gW-1;x++){
      const i=gi(x,y);
      p[i]=(div[i]+p[gi(x-1,y)]+p[gi(x+1,y)]+p[gi(x,y-1)]+p[gi(x,y+1)])/4;
    }
  }
  for(let y=1;y<gH-1;y++) for(let x=1;x<gW-1;x++){
    const i=gi(x,y);
    nvx[i]-=0.5*(p[gi(x+1,y)]-p[gi(x-1,y)]);
    nvy[i]-=0.5*(p[gi(x,y+1)]-p[gi(x,y-1)]);
  }

  velX.set(nvx);velY.set(nvy);
  for(let i=0;i<n;i++) dye[i].set(nd[i]);
}

function render(){
  const img=ctx.getImageData(0,0,W,H);
  const d=img.data;
  const pr=242,pg=236,pb=224;
  for(let gy=0;gy<gH-1;gy++) for(let gx=0;gx<gW-1;gx++){
    const px0=gx*GRID,py0=gy*GRID;
    const i00=gi(gx,gy),i10=gi(gx+1,gy),i01=gi(gx,gy+1),i11=gi(gx+1,gy+1);
    for(let ly=0;ly<GRID&&py0+ly<H;ly++) for(let lx=0;lx<GRID&&px0+lx<W;lx++){
      const fx=lx/GRID,fy=ly/GRID;
      const w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
      let dr=0,dg=0,db=0,da=0;
      da=dye[i00][3]*w00+dye[i10][3]*w10+dye[i01][3]*w01+dye[i11][3]*w11;
      if(da<0.003) continue;
      dr=dye[i00][0]*w00+dye[i10][0]*w10+dye[i01][0]*w01+dye[i11][0]*w11;
      dg=dye[i00][1]*w00+dye[i10][1]*w10+dye[i01][1]*w01+dye[i11][1]*w11;
      db=dye[i00][2]*w00+dye[i10][2]*w10+dye[i01][2]*w01+dye[i11][2]*w11;
      const alpha=Math.min(1,da*0.85);
      const ir=dr/da,ig=dg/da,ib=db/da;
      const pi=((py0+ly)*W+(px0+lx))*4;
      d[pi  ]=pr+(ir-pr)*alpha|0;
      d[pi+1]=pg+(ig-pg)*alpha|0;
      d[pi+2]=pb+(ib-pb)*alpha|0;
      d[pi+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
}

let mouse={x:0,y:0,px:0,py:0,down:false};

function pos(e){
  const r=wrap.getBoundingClientRect();
  const t=e.touches?e.touches[0]:e;
  return{x:t.clientX-r.left,y:t.clientY-r.top};
}

wrap.addEventListener('mousedown',e=>{
  mouse.down=true;
  const p=pos(e);mouse.x=mouse.px=p.x;mouse.y=mouse.py=p.y;
  const gx=Math.round(p.x/GRID)|0,gy=Math.round(p.y/GRID)|0;
  const c=INK[inkIdx];
  addDye(gx,gy,c[0],c[1],c[2],0.7);
  hint.style.opacity='0';
});
wrap.addEventListener('mouseup',()=>mouse.down=false);
wrap.addEventListener('mousemove',e=>{
  const p=pos(e);
  curRing.style.left=p.x+'px';curRing.style.top=p.y+'px';
  mouse.px=mouse.x;mouse.py=mouse.y;
  mouse.x=p.x;mouse.y=p.y;
  if(!mouse.down) return;
  const dvx=(p.x-mouse.px)/GRID,dvy=(p.y-mouse.py)/GRID;
  const gx=Math.round(p.x/GRID)|0,gy=Math.round(p.y/GRID)|0;
  const spd=Math.sqrt(dvx*dvx+dvy*dvy);
  if(spd>0.02) addVel(gx,gy,dvx*2.5,dvy*2.5,Math.min(2.5,spd*6));
  if(spd>0.04){
    const c=INK[inkIdx];
    addDye(gx,gy,c[0],c[1],c[2],0.08*Math.min(1,spd));
  }
});

wrap.addEventListener('touchstart',e=>{e.preventDefault();mouse.down=true;const p=pos(e);mouse.x=mouse.px=p.x;mouse.y=mouse.py=p.y;const gx=Math.round(p.x/GRID)|0,gy=Math.round(p.y/GRID)|0;const c=INK[inkIdx];addDye(gx,gy,c[0],c[1],c[2],0.7);hint.style.opacity='0';},{passive:false});
wrap.addEventListener('touchend',()=>mouse.down=false);
wrap.addEventListener('touchmove',e=>{e.preventDefault();const p=pos(e);mouse.px=mouse.x;mouse.py=mouse.y;mouse.x=p.x;mouse.y=p.y;if(!mouse.down)return;const dvx=(p.x-mouse.px)/GRID,dvy=(p.y-mouse.py)/GRID;const gx=Math.round(p.x/GRID)|0,gy=Math.round(p.y/GRID)|0;const spd=Math.sqrt(dvx*dvx+dvy*dvy);if(spd>0.02)addVel(gx,gy,dvx*2.5,dvy*2.5,Math.min(2.5,spd*6));if(spd>0.04){const c=INK[inkIdx];addDye(gx,gy,c[0],c[1],c[2],0.08*Math.min(1,spd));}},{passive:false});

document.getElementById('btn-wave').onclick=()=>{
  for(let i=0;i<10;i++){
    const gx=(1+Math.random()*(gW-2))|0,gy=(1+Math.random()*(gH-2))|0;
    const a=Math.random()*Math.PI*2;
    addVel(gx,gy,Math.cos(a)*1.2,Math.sin(a)*1.2,1.8);
  }
};
document.getElementById('btn-clear').onclick=()=>{
  const n=gW*gH;
  velX=new Float32Array(n);velY=new Float32Array(n);
  dye=[];for(let i=0;i<n;i++) dye.push(new Float32Array(4));
  drawPaper();
};

let frame=0;
function loop(){
  requestAnimationFrame(loop);
  frame++;
  step();
  if(frame%2===0) render();
}

window.addEventListener('resize',init);
init();loop();
})();
</script>
</body>
</html>`
