/* Chemistry: reactions at the particle level — collision theory and reaction rate. */
(()=>{
const {$,fit,slider,markTried,SIMS,T}=STEM;
SIMS.push({id:'collision-theory',subject:'chemistry',title:'Reactions up close: collision theory',level:'Grade 10–11',blurb:'Watch particles A and B collide and react to make AB. Change the temperature, concentration and catalyst and compare the reaction rates.',mount(el){
 el.innerHTML=`<div class="split"><div><div class="fig"><canvas aria-label="Reacting particles"></canvas></div><div class="fig small"><canvas class="gr" aria-label="Amount of product over time"></canvas></div>
 <div class="legend" style="margin-top:8px"><span><i style="background:#e5483a;height:10px;width:10px;border-radius:50%"></i>A</span><span><i style="background:#3d6fe6;height:10px;width:10px;border-radius:50%"></i>B</span><span><i style="background:#7a4fd6;height:10px;width:16px;border-radius:5px"></i>Product AB</span><span><i style="background:#e9a400"></i>Bouncing collision (not enough energy)</span></div></div><div class="panel">
 ${slider('temp','Temperature',10,100,1,40,' °C')}${slider('n','Concentration (particles of each)',10,60,1,30,'')}
 <label class="check"><input type="checkbox" class="cat"> Add a catalyst (lowers the energy needed)</label>
 <div class="row"><button class="btn y rs">Start again</button><button class="btn ghost keep">Keep this run on the graph</button></div>
 <div class="stats"><div class="stat"><small>Product made</small><b class="pd">0</b></div><div class="stat"><small>Successful collisions</small><b class="sc">0%</b></div></div>
 <div class="out"><p>Particles only react when they <b>collide</b> with <b>enough energy</b> (the activation energy). Hotter particles move faster, so more collisions succeed. More particles means more collisions. A catalyst lowers the energy needed.</p></div></div></div>`;
 const g=k=>+$('.'+k,el).value;let P=[],hist=[],old=[],t=0,hits=0,tries=0,flashes=[],tick=0;
 const init=()=>{const cv=$('canvas',el),r=cv.getBoundingClientRect(),W=r.width||400,H=r.height||300;P=[];hits=0;tries=0;hist=[];t=0;
  for(let i=0;i<g('n')*2;i++){const a=Math.random()*7;P.push({x:10+Math.random()*(W-20),y:10+Math.random()*(H-20),a,s:0,k:i%2?'B':'A',r:6})}};
 el.querySelectorAll('input').forEach(i=>i.oninput=()=>{$('.tempv',el).textContent=g('temp')+' °C';$('.nv',el).textContent=g('n');if(i.classList.contains('n'))init();markTried('collision-theory')});
 $('.rs',el).onclick=init;$('.keep',el).onclick=()=>{if(hist.length){old.push({h:hist.slice(),lab:`${g('temp')}°C, ${g('n')}${$('.cat',el).checked?', catalyst':''}`});if(old.length>3)old.shift()}init()};
 let started=false;
 return{frame(dt){const cv=$('canvas',el),{c,w,h}=fit(cv);if(!started&&w>10){init();started=true}t+=dt;
  const speed=30+g('temp')*2.2,Ea=$('.cat',el).checked?0.6:1.05;
  P.forEach(p=>{if(!p.s)p.s=speed*(0.5+Math.random());p.s+=(speed*(0.5+Math.random())-p.s)*dt*.5;p.a+=(Math.random()-.5)*.3;p.x+=Math.cos(p.a)*p.s*dt;p.y+=Math.sin(p.a)*p.s*dt;
   if(p.x<p.r||p.x>w-p.r){p.a=Math.PI-p.a;p.x=Math.max(p.r,Math.min(w-p.r,p.x))}if(p.y<p.r||p.y>h-p.r){p.a=-p.a;p.y=Math.max(p.r,Math.min(h-p.r,p.y))}});
  for(let i=0;i<P.length;i++){const a=P[i];if(a.k!=='A')continue;for(let j=0;j<P.length;j++){const b=P[j];if(b.k!=='B')continue;const dx=a.x-b.x,dy=a.y-b.y;if(dx*dx+dy*dy<144){
   tries++;const rel=(a.s+b.s)/2/130*(0.5+Math.random())*(Math.random()<0.08?1.8:1);
   if(rel>Ea){a.k='AB';a.r=8;b.dead=true;hits++;flashes.push({x:a.x,y:a.y,t:.4,ok:1})}else{a.a+=Math.PI;b.a+=Math.PI;a.x+=dx*.3;b.x-=dx*.3;a.y+=dy*.3;b.y-=dy*.3;flashes.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,t:.25,ok:0})}break}}}
  P=P.filter(p=>!p.dead);
  c.clearRect(0,0,w,h);c.fillStyle=T.card;c.fillRect(0,0,w,h);
  P.forEach(p=>{if(p.k==='AB'){c.fillStyle='#e5483a';c.beginPath();c.arc(p.x-4,p.y,6,0,7);c.fill();c.fillStyle='#3d6fe6';c.beginPath();c.arc(p.x+4,p.y,6,0,7);c.fill();c.strokeStyle='#7a4fd6';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,11,0,7);c.stroke()}
   else{c.fillStyle=p.k==='A'?'#e5483a':'#3d6fe6';c.beginPath();c.arc(p.x,p.y,6,0,7);c.fill()}});
  flashes=flashes.filter(f=>(f.t-=dt)>0);flashes.forEach(f=>{c.strokeStyle=f.ok?'rgba(122,79,214,'+f.t*2+')':'rgba(233,164,0,'+f.t*3+')';c.lineWidth=2;c.beginPath();c.arc(f.x,f.y,14+(1-f.t)*10,0,7);c.stroke()});
  const made=P.filter(p=>p.k==='AB').length;
  if((tick+=dt)>0.2){tick=0;hist.push(made);if(hist.length>300)hist.shift();$('.pd',el).textContent=made+' of '+g('n');$('.sc',el).textContent=(tries?Math.round(100*hits/tries):0)+'%'}
  const gc=$('.gr',el),G=fit(gc),c2=G.c;c2.clearRect(0,0,G.w,G.h);const n=g('n');
  const line=(arr,col,dash)=>{c2.strokeStyle=col;c2.lineWidth=2.5;c2.setLineDash(dash||[]);c2.beginPath();arr.forEach((v,i)=>{const X=8+i*(G.w-16)/300,Y=G.h-8-(v/n)*(G.h-24);i?c2.lineTo(X,Y):c2.moveTo(X,Y)});c2.stroke();c2.setLineDash([])};
  old.forEach((o,i)=>line(o.h,['#9aa3ba','#c7b3f5','#f5c77a'][i],[4,4]));line(hist,'#7a4fd6');
  c2.fillStyle=T.mut;c2.font='11px Lexend,sans-serif';c2.textAlign='left';c2.fillText('product made over time'+(old.length?' (dashed = earlier runs: '+old.map(o=>o.lab).join(' | ')+')':''),8,14)
 }}}});
})();
