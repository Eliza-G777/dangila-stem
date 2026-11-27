/* Biology: Diffusion Across A Membrane — one simulation. Copy this file to make a new one. */
(()=>{
const {$,clamp,lerp,fit,slider,markTried,SIMS,T}=STEM;
SIMS.push({id:'membrane-diffusion',subject:'biology',title:'Diffusion through a cell membrane',level:'Grade 9–10',blurb:'Small molecules slip through the pores of a membrane; big ones are blocked. Change pore size and temperature.',mount(el){
 el.innerHTML=`<div class="split"><div><div class="fig"><canvas aria-label="Particles moving across a membrane"></canvas></div><div class="legend" style="margin-top:8px"><span><i style="background:#3d6fe6;height:10px;width:10px;border-radius:50%"></i>Small molecules (like oxygen)</span><span><i style="background:#e5483a;height:14px;width:14px;border-radius:50%"></i>Large molecules (like starch)</span></div></div><div class="panel">
 ${slider('pore','Pore size',0,10,.5,3,' nm')}${slider('temp','Temperature',5,60,1,25,' °C')}
 <div class="stats"><div class="stat"><small>Small: left | right</small><b class="sm"></b></div><div class="stat"><small>Large: left | right</small><b class="lg"></b></div></div>
 <div class="row"><button class="btn rs">Restart</button></div>
 <div class="out" aria-live="polite"><p>Molecules move randomly from where there are many to where there are few. That is <b>diffusion</b>. The membrane is <b>partially permeable</b>: it lets some molecules through and not others.</p><p>Small molecules fit through pores of 2 nm or more; large ones need about 5 nm.</p></div></div></div>`;
 let P=[],tick=0;const g=k=>+$('.'+k,el).value;
 const init=()=>{const cv=$('canvas',el),r=cv.getBoundingClientRect(),W=r.width||400,H=r.height||300;P=[];for(let i=0;i<90;i++){const big=i>=60;P.push({x:10+Math.random()*(W/2-30),y:10+Math.random()*(H-20),r:big?7:3,big,a:Math.random()*7})}};
 el.querySelectorAll('input').forEach(i=>i.oninput=()=>{$('.'+i.className+'v',el).textContent=i.value+(i.className==='pore'?' nm':' °C');markTried('membrane-diffusion')});
 $('.rs',el).onclick=init;let started=false;
 return{frame(dt){const cv=$('canvas',el),{c,w,h}=fit(cv);if(!started&&w>10){init();started=true}c.clearRect(0,0,w,h);const mid=w/2,sp=20,top=0,gap=g('pore')*3,spd=40+g('temp')*5;
  c.fillStyle='rgba(61,111,230,.06)';c.fillRect(0,0,mid,h);
  c.fillStyle='#2c9a59';for(let y=top;y<h;y+=sp){const g0=y+sp/2-gap/2,g1=y+sp/2+gap/2;c.fillRect(mid-4,y,8,Math.max(0,g0-y));c.fillRect(mid-4,g1,8,Math.max(0,y+sp-g1))}
  let s=[0,0],l=[0,0];
  P.forEach(p=>{p.a+=(Math.random()-.5)*2.5;const v=spd*(p.big?.55:1);let nx=p.x+Math.cos(p.a)*v*dt,ny=p.y+Math.sin(p.a)*v*dt;
   if(ny<p.r||ny>h-p.r){p.a=-p.a;ny=clamp(ny,p.r,h-p.r)}if(nx<p.r||nx>w-p.r){p.a=Math.PI-p.a;nx=clamp(nx,p.r,w-p.r)}
   if(nx+p.r>mid-4&&nx-p.r<mid+4){const off=((ny-top)%sp+sp)%sp-sp/2;if(2*p.r>gap||Math.abs(off)>gap/2){p.a=Math.PI-p.a;nx=p.x}}
   p.x=nx;p.y=ny;(p.big?l:s)[p.x<mid?0:1]++;c.fillStyle=p.big?'#e5483a':'#3d6fe6';c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill()});
  if((tick=(tick+1)%10)===0){$('.sm',el).textContent=s[0]+' | '+s[1];$('.lg',el).textContent=l[0]+' | '+l[1]}
  c.fillStyle=T.mut;c.font='12px Lexend,sans-serif';c.textAlign='center';c.fillText('Inside cell',mid/2,16);c.fillText('Outside cell',mid*1.5,16)}}}});
})();
