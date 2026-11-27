/* Biology: Predator–Prey — one simulation. Copy this file to make a new one. */
(()=>{
const {$,clamp,lerp,fit,slider,markTried,SIMS,T}=STEM;
SIMS.push({id:'predator-prey',subject:'biology',title:'Predators and prey',level:'Grade 10–11',blurb:'Antelope eat grass and lions eat antelope. Change the rates and watch both populations rise and fall in cycles.',mount(el){
 el.innerHTML=`<div class="split"><div><div class="fig"><canvas aria-label="Population graph"></canvas></div><div class="legend" style="margin-top:8px"><span><i style="background:#e9a400"></i>Antelope (prey)</span><span><i style="background:#e5483a"></i>Lions (predators)</span></div></div><div class="panel">
 ${slider('a','Antelope birth rate',.2,2,.05,1)}${slider('b','How often lions catch antelope',.02,.2,.01,.1)}${slider('cc','Lion death rate',.2,2,.05,1.5)}${slider('d','Food turned into new lions',.02,.2,.005,.075)}
 <div class="stats"><div class="stat"><small>Antelope</small><b class="x"></b></div><div class="stat"><small>Lions</small><b class="y"></b></div></div>
 <div class="row"><button class="btn pz">Pause</button><button class="btn ghost rs">Restart</button></div>
 <p class="note">Notice that the lion peak always comes after the antelope peak. Why?</p></div></div>`;
 let x=40,y=9,t=0,hist=[],run=true,acc=0;const g=k=>+$('.'+k,el).value;
 el.querySelectorAll('input').forEach(i=>i.oninput=()=>{$('.'+i.className+'v',el).textContent=i.value;markTried('predator-prey')});
 const restart=()=>{x=40;y=9;t=0;hist=[]};$('.rs',el).onclick=restart;$('.pz',el).onclick=e=>{run=!run;e.target.textContent=run?'Pause':'Play'};
 const f=(x,y)=>[g('a')*x-g('b')*x*y,g('d')*x*y-g('cc')*y];
 return{frame(dt){if(run){const H=.005;for(let k=0;k<Math.round(dt*1.2/H);k++){const k1=f(x,y),k2=f(x+H/2*k1[0],y+H/2*k1[1]),k3=f(x+H/2*k2[0],y+H/2*k2[1]),k4=f(x+H*k3[0],y+H*k3[1]);x=Math.max(.01,x+H/6*(k1[0]+2*k2[0]+2*k3[0]+k4[0]));y=Math.max(.01,y+H/6*(k1[1]+2*k2[1]+2*k3[1]+k4[1]));t+=H;acc+=H;if(acc>.04){acc=0;hist.push([x,y]);if(hist.length>700)hist.shift()}}}
  $('.x',el).textContent=Math.round(x);$('.y',el).textContent=Math.round(y);
  const cv=$('canvas',el),{c,w,h}=fit(cv);c.clearRect(0,0,w,h);const L=40,B=h-26,mx=Math.max(20,...hist.map(p=>Math.max(p[0],p[1])))*1.1;
  c.strokeStyle=T.ink;c.globalAlpha=.15;c.lineWidth=1;for(let k=0;k<=4;k++){const yy=B-(B-14)*k/4;c.beginPath();c.moveTo(L,yy);c.lineTo(w-10,yy);c.stroke()}c.globalAlpha=1;
  c.fillStyle=T.mut;c.font='12px Lexend,sans-serif';c.textAlign='right';for(let k=0;k<=4;k++)c.fillText(Math.round(mx*k/4),L-6,B-(B-14)*k/4+4);c.textAlign='center';c.fillText('time →',w/2,h-6);
  const sx=(w-L-10)/700;[[0,'#e9a400'],[1,'#e5483a']].forEach(([j,col])=>{c.strokeStyle=col;c.lineWidth=3;c.beginPath();hist.forEach((p,i)=>{const X=L+i*sx,Y=B-(B-14)*p[j]/mx;i?c.lineTo(X,Y):c.moveTo(X,Y)});c.stroke()})}}}});
})();
