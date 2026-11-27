/* Electricity: Ohm'S Law Graph — one simulation. Copy this file to make a new one. */
(()=>{
const {$,clamp,lerp,fit,slider,markTried,SIMS,T}=STEM;
SIMS.push({id:'ohms-law',subject:'physics',title:'Ohm’s law lab',level:'Grade 9',blurb:'Take readings like a real experiment and plot current against voltage to find resistance.',mount(el){
 el.innerHTML=`<div class="split"><div class="fig"><canvas aria-label="Current against voltage graph"></canvas></div><div class="panel">
 ${slider('r','Mystery resistor',2,40,1,12,' Ω')}${slider('v','Voltage',0,12,.5,4,' V')}
 <div class="stats"><div class="stat"><small>Ammeter reading</small><b class="i"></b></div><div class="stat"><small>Points taken</small><b class="n">0</b></div></div>
 <div class="row"><button class="btn rec">Record reading</button><button class="btn ghost clr">Clear</button><button class="btn ghost hide">Hide resistor value</button></div>
 <div class="out res" aria-live="polite"><p>Record at least 3 readings at different voltages.</p></div></div></div>`;
 let pts=[],hidden=false;const R=()=>+$('.r',el).value,V=()=>+$('.v',el).value;
 const upd=()=>{$('.rv',el).textContent=hidden?'?':R()+' Ω';$('.vv',el).textContent=V()+' V';$('.i',el).textContent=(V()/R()).toFixed(3)+' A';$('.n',el).textContent=pts.length;
  if(pts.length>=3){const sxy=pts.reduce((s,p)=>s+p[0]*p[1],0),sxx=pts.reduce((s,p)=>s+p[0]*p[0],0);const m=sxy/sxx;$('.res',el).innerHTML=`<p class="eq">Gradient = ${m.toFixed(3)} A/V</p><p>Resistance = 1 ÷ gradient = <b>${(1/m).toFixed(1)} Ω</b>. A straight line through zero means current is proportional to voltage: that is Ohm’s law.</p>`}else $('.res',el).innerHTML='<p>Record at least 3 readings at different voltages.</p>'};
 el.querySelectorAll('input').forEach(i=>i.oninput=()=>{if(i.classList.contains('r'))pts=[];upd()});
 $('.rec',el).onclick=()=>{const noise=1+(Math.random()-.5)*.04;pts.push([V(),V()/R()*noise]);markTried('ohms-law');upd()};
 $('.clr',el).onclick=()=>{pts=[];upd()};$('.hide',el).onclick=e=>{hidden=!hidden;e.target.textContent=hidden?'Show resistor value':'Hide resistor value';upd()};upd();
 return{frame(){const cv=$('canvas',el),{c,w,h}=fit(cv);c.clearRect(0,0,w,h);const L=52,B=h-40,Wd=w-L-20,Ht=B-20,raw=12/R()*1.15,st=raw>4?1:raw>1.6?.5:raw>.8?.2:.1,imax=Math.ceil(raw/st)*st;
  const px=v=>L+v/12*Wd,py=i=>B-i/imax*Ht;c.strokeStyle=T.ink;c.lineWidth=1;c.globalAlpha=.15;for(let v=0;v<=12;v+=2){c.beginPath();c.moveTo(px(v),B);c.lineTo(px(v),20);c.stroke()}for(let i=0;i<=imax+1e-9;i+=st){c.beginPath();c.moveTo(L,py(i));c.lineTo(L+Wd,py(i));c.stroke()}c.globalAlpha=1;
  c.lineWidth=2;c.beginPath();c.moveTo(L,20);c.lineTo(L,B);c.lineTo(L+Wd,B);c.stroke();c.fillStyle=T.mut;c.font='12px Lexend,sans-serif';c.textAlign='center';for(let v=0;v<=12;v+=w<520?4:2)c.fillText(v,px(v),B+16);c.fillText('Voltage (V)',L+Wd/2,B+32);
  c.textAlign='right';for(let i=0;i<=imax+1e-9;i+=st)c.fillText(+i.toFixed(2),L-6,py(i)+4);c.save();c.translate(14,20+Ht/2);c.rotate(-Math.PI/2);c.textAlign='center';c.fillText('Current (A)',0,0);c.restore();
  if(pts.length>=3){const m=pts.reduce((s,p)=>s+p[0]*p[1],0)/pts.reduce((s,p)=>s+p[0]*p[0],0);c.strokeStyle='#e9a400';c.lineWidth=3;c.beginPath();c.moveTo(px(0),py(0));c.lineTo(px(12),py(Math.min(imax,12*m)));c.stroke()}
  c.fillStyle='#e5483a';pts.forEach(p=>{c.beginPath();c.arc(px(p[0]),py(Math.min(p[1],imax)),6,0,7);c.fill()});
  const v=V(),i=v/R();c.strokeStyle='#3d6fe6';c.setLineDash([4,4]);c.lineWidth=1.5;c.beginPath();c.moveTo(px(v),B);c.lineTo(px(v),py(Math.min(i,imax)));c.stroke();c.setLineDash([])}}}});
})();
