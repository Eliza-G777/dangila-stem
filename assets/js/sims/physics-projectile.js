/* Physics: projectile motion — launch a ball, change angle, speed and planet, hit the target. */
(()=>{
const {$,clamp,fit,slider,markTried,SIMS,T}=STEM;
const PLANETS=[['Earth',9.8],['Moon',1.6],['Mars',3.7],['Jupiter',24.8]];
const COLORS=['#e5483a','#3d6fe6','#2c9a59','#e9a400','#7a4fd6','#0e8a8a'];
SIMS.push({id:'projectile-motion',subject:'physics',title:'Projectile motion: launch and land',level:'Grade 9–11',blurb:'Change the launch angle, speed and planet, then predict where the ball will land. Can you hit the target?',mount(el){
 el.innerHTML=`<div class="split"><div class="fig"><canvas aria-label="Projectile launcher"></canvas></div><div class="panel">
 ${slider('ang','Launch angle',5,85,1,45,'°')}${slider('spd','Launch speed',5,40,1,20,' m/s')}${slider('h0','Launch height',0,20,1,0,' m')}
 <label><b>Planet</b><select class="pl">${PLANETS.map(([n,g])=>`<option value="${g}">${n} (g = ${g} m/s²)</option>`).join('')}</select></label>
 <div class="row"><button class="btn y go">Launch</button><button class="btn ghost clr">Clear paths</button><button class="btn ghost tg">New target</button></div>
 <div class="stats"><div class="stat"><small>Time in the air</small><b class="ft">–</b></div><div class="stat"><small>Highest point</small><b class="mh">–</b></div><div class="stat"><small>Range</small><b class="rg">–</b></div><div class="stat"><small>Target at</small><b class="tgv">–</b></div></div>
 <div class="out msg" aria-live="polite"><p>Predict first: which angle sends the ball furthest? Launch and find out.</p></div></div></div>`;
 const g=k=>+$('.'+k,el).value;let trails=[],ball=null,target=0,hits=0;
 ['ang','spd','h0'].forEach(k=>$('.'+k,el).oninput=()=>{$('.'+k+'v',el).textContent=g(k)+(k==='ang'?'°':k==='spd'?' m/s':' m');calc()});
 $('.pl',el).onchange=()=>{newTarget();calc()};
 const grav=()=>+$('.pl',el).value;
 const theory=()=>{const v=g('spd'),a=g('ang')*Math.PI/180,h=g('h0'),G=grav(),vy=v*Math.sin(a),vx=v*Math.cos(a);const t=(vy+Math.sqrt(vy*vy+2*G*h))/G;return{t,H:h+vy*vy/(2*G),R:vx*t}};
 const calc=()=>{const th=theory();$('.ft',el).textContent=th.t.toFixed(2)+' s';$('.mh',el).textContent=th.H.toFixed(1)+' m';$('.rg',el).textContent=th.R.toFixed(1)+' m'};
 const newTarget=()=>{const G=grav(),maxR=40*40/G;target=Math.round((0.25+Math.random()*0.55)*Math.min(maxR,400));$('.tgv',el).textContent=target+' m'};
 $('.go',el).onclick=()=>{if(ball)return;const v=g('spd'),a=g('ang')*Math.PI/180;ball={t:0,vx:v*Math.cos(a),vy:v*Math.sin(a),h:g('h0'),G:grav(),pts:[],col:COLORS[trails.length%COLORS.length],ang:g('ang')};markTried('projectile-motion')};
 $('.clr',el).onclick=()=>{trails=[];ball=null};$('.tg',el).onclick=newTarget;newTarget();calc();
 let world=50;
 return{frame(dt){const cv=$('canvas',el),{c,w,h}=fit(cv);c.clearRect(0,0,w,h);
  const th=theory();const need=Math.max(target+10,th.R*1.1,...trails.map(t=>t.R*1.05),(th.H)*1.6);world+=(need-world)*Math.min(1,dt*3);
  const L=34,B=h-34,sc=Math.min((w-L-16)/world,(B-16)/(world*0.55)),X=x=>L+x*sc,Y=y=>B-y*sc;
  // sky + ground
  c.fillStyle=T.card;c.fillRect(0,0,w,h);c.fillStyle='#2c9a59';c.globalAlpha=.25;c.fillRect(0,B,w,h-B);c.globalAlpha=1;
  c.strokeStyle=T.mut;c.lineWidth=1;c.font='11px Lexend,sans-serif';c.fillStyle=T.mut;c.textAlign='center';
  const step=world>200?50:world>80?20:world>30?10:5;for(let x=0;x<=world;x+=step){c.beginPath();c.moveTo(X(x),B);c.lineTo(X(x),B+5);c.stroke();c.fillText(x+' m',X(x),B+18)}
  // target
  c.fillStyle='#e5483a';c.fillRect(X(target)-1,Y(0)-28,3,28);c.beginPath();c.moveTo(X(target)+2,Y(0)-28);c.lineTo(X(target)+18,Y(0)-22);c.lineTo(X(target)+2,Y(0)-16);c.fill();
  c.strokeStyle='#e5483a';c.lineWidth=3;c.beginPath();c.moveTo(X(target-1),B);c.lineTo(X(target+1),B);c.stroke();
  // platform + cannon
  const h0=g('h0');c.fillStyle=T.mut;c.fillRect(X(0)-12,Y(h0),24,h0*sc);
  c.save();c.translate(X(0),Y(h0));c.rotate(-g('ang')*Math.PI/180);c.fillStyle=T.ink;c.fillRect(0,-5,30,10);c.restore();c.beginPath();c.arc(X(0),Y(h0),8,0,7);c.fillStyle=T.ink;c.fill();
  // predicted path (dashed)
  c.setLineDash([4,5]);c.strokeStyle=T.mut;c.lineWidth=1.5;c.beginPath();const v=g('spd'),a=g('ang')*Math.PI/180,G=grav();for(let i=0;i<=40;i++){const t=th.t*i/40,x=v*Math.cos(a)*t,y=h0+v*Math.sin(a)*t-.5*G*t*t;i?c.lineTo(X(x),Y(Math.max(0,y))):c.moveTo(X(x),Y(y))}c.stroke();c.setLineDash([]);
  // trails
  trails.forEach(t=>{c.strokeStyle=t.col;c.lineWidth=2.5;c.beginPath();t.pts.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.stroke();c.fillStyle=t.col;c.fillText(t.ang+'°',X(t.R),B-6)});
  // flying ball
  if(ball){const speedup=Math.max(1,ball.vx*1.2/Math.max(8,world/6));ball.t+=dt*speedup;const x=ball.vx*ball.t,y=ball.h+ball.vy*ball.t-.5*ball.G*ball.t*ball.t;
   if(y<=0&&ball.t>0){const tl=(ball.vy+Math.sqrt(ball.vy*ball.vy+2*ball.G*ball.h))/ball.G,R=ball.vx*tl;ball.pts.push([R,0]);trails.push({pts:ball.pts,col:ball.col,R,ang:ball.ang});
    const off=R-target,hit=Math.abs(off)<=Math.max(1,target*.02);if(hit)hits++;
    $('.msg',el).innerHTML=hit?`<p class="eq">🎯 Hit! Landed at ${R.toFixed(1)} m</p><p>Targets hit: ${hits}. Press “New target” for another.</p>`:`<p class="eq">Landed at ${R.toFixed(1)} m</p><p>${off>0?'Too far':'Too short'} by ${Math.abs(off).toFixed(1)} m. ${g('h0')?'':'Tip: on flat ground, angles that add up to 90° (like 30° and 60°) land in the same place.'}</p>`;ball=null}
   else{ball.pts.push([x,y]);c.strokeStyle=ball.col;c.lineWidth=2.5;c.beginPath();ball.pts.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.stroke();
    c.fillStyle=ball.col;c.beginPath();c.arc(X(x),Y(y),7,0,7);c.fill();
    const vy=ball.vy-ball.G*ball.t;c.strokeStyle=T.ink;c.lineWidth=2;c.beginPath();c.moveTo(X(x),Y(y));c.lineTo(X(x)+ball.vx*1.5,Y(y)-vy*1.5);c.stroke();
    c.fillStyle=T.ink;c.textAlign='left';c.fillText(`t = ${ball.t.toFixed(1)} s`,12,18)}}
 }}}});
})();
