/* Biology: the heart in detail — four chambers, valves and blood flow through one heartbeat. */
(()=>{
const {$,fit,slider,markTried,SIMS,T}=STEM;
const PARTS={
 RA:['Right atrium','Receives blood low in oxygen from the body through the vena cava.'],
 RV:['Right ventricle','Pumps blood to the lungs through the pulmonary artery to pick up oxygen.'],
 LA:['Left atrium','Receives oxygen-rich blood from the lungs through the pulmonary veins.'],
 LV:['Left ventricle','The strongest chamber: pumps oxygen-rich blood to the whole body through the aorta. Its wall is the thickest.']
};
const PHASES=[['Atria fill','Both atria fill with blood. The valves between atria and ventricles are open.'],['Atria squeeze','The atria contract and push the last blood down into the ventricles.'],['Ventricles squeeze','The ventricles contract. The tricuspid and mitral valves snap shut (the “lub” sound). Blood is pushed into the pulmonary artery and the aorta.'],['Relax','The ventricles relax. The pulmonary and aortic valves close (the “dub” sound) so blood cannot flow back.']];
SIMS.push({id:'heart-detail',subject:'biology',title:'Inside the heart',level:'Grade 10–12',blurb:'Watch the four chambers, valves and blood flow through one heartbeat. Slow it down to see each step.',mount(el){
 el.innerHTML=`<div class="split"><div><div class="fig"><canvas aria-label="Cross-section of the heart with blood flow"></canvas></div><div class="legend" style="margin-top:8px"><span><i style="background:#3d6fe6"></i>Blood low in oxygen</span><span><i style="background:#e5483a"></i>Blood rich in oxygen</span></div></div><div class="panel">
 ${slider('bpm','Heart rate',30,150,1,60,' beats/min')}<label class="check"><input type="checkbox" class="slow"> Slow motion (one beat every 6 seconds)</label><label class="check"><input type="checkbox" class="lab" checked> Show labels</label>
 <div class="out phase" aria-live="polite"></div><div class="out part"><p class="eq">Click a chamber</p><p>Remember: the diagram is drawn as if you are facing the person, so their left side is on your right.</p></div></div></div>`;
 const g=k=>+$('.'+k,el).value;let t=0,phaseShown=-1,sel=null,flowB=[],flowR=[];
 $('.bpm',el).oninput=()=>$('.bpmv',el).textContent=g('bpm')+' beats/min';
 for(let i=0;i<26;i++){flowB.push(i/26);flowR.push(i/26)}
 const cv=$('canvas',el);let geo=null;
 cv.addEventListener('click',e=>{if(!geo)return;const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(const k of Object.keys(geo.ch)){const q=geo.ch[k];if(x>q[0]&&x<q[0]+q[2]&&y>q[1]&&y<q[1]+q[3]){sel=k;$('.part',el).innerHTML=`<p class="eq">${PARTS[k][0]}</p><p>${PARTS[k][1]}</p>`;markTried('heart-detail')}}});
 const along=(pts,f)=>{let L=0;const seg=[];for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);L+=d}let s=f*L;for(let i=0;i<seg.length;i++){if(s<=seg[i]){const a=pts[i],b=pts[i+1],u=s/seg[i];return[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]}s-=seg[i]}return pts[pts.length-1]};
 return{frame(dt){const period=$('.slow',el).checked?6:60/g('bpm');t+=dt/period;const ph=t%1,phase=ph<.45?0:ph<.6?1:ph<.85?2:3;
  if(phase!==phaseShown){phaseShown=phase;$('.phase',el).innerHTML=`<p class="eq">${phase+1}. ${PHASES[phase][0]}</p><p>${PHASES[phase][1]}</p>`}
  const {c,w,h}=fit(cv);c.clearRect(0,0,w,h);const S=Math.min(w/420,h/360),ox=(w-420*S)/2,oy=(h-360*S)/2,X=x=>ox+x*S,Y=y=>oy+y*S;
  const aS=phase===1?.86:phase===0?1.04:1,vS=phase===2?.84:phase===3?1.04:1;
  // chambers: [x,y,w,h] in design space, scaled around their centre
  const box=(x,y,bw,bh,s)=>[x+bw*(1-s)/2,y+bh*(1-s)/2,bw*s,bh*s];
  const ch={RA:box(60,100,110,85,aS),LA:box(250,100,110,85,aS),RV:box(50,198,130,125,vS),LV:box(240,198,140,132,vS)};
  geo={ch:{}};Object.entries(ch).forEach(([k,q])=>geo.ch[k]=[X(q[0]),Y(q[1]),q[2]*S,q[3]*S]);
  c.lineCap='round';c.lineJoin='round';const vessel=(pts,col,wid)=>{c.strokeStyle=col;c.lineWidth=wid*S;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.stroke()};
  const VC=[[20,30],[90,108]],PA=[[185,210],[192,60],[180,28],[110,12]],PV=[[410,60],[330,108]],AO=[[235,210],[228,60],[245,26],[330,12]];
  vessel(VC,'#5b7fd6',24);vessel(PV,'#e86a5f',20);vessel(PA,'#5b7fd6',20);vessel(AO,'#d7263d',24);
  Object.entries(ch).forEach(([k,q])=>{const left=k==='RA'||k==='RV';c.fillStyle=left?'#9fb6ee':'#f2a19a';c.strokeStyle='#7a1c2a';c.lineWidth=(k==='LV'?9:k==='RV'?5:4)*S;
   c.beginPath();const x=X(q[0]),y=Y(q[1]),ww=q[2]*S,hh=q[3]*S;c.roundRect?c.roundRect(x,y,ww,hh,20*S):c.rect(x,y,ww,hh);c.fill();c.stroke();
   if(sel===k){c.strokeStyle='#ffc533';c.lineWidth=3;c.stroke()}});
  // septum between the ventricles
  c.strokeStyle='#7a1c2a';c.lineWidth=7*S;c.beginPath();c.moveTo(X(210),Y(205));c.lineTo(X(210),Y(330));c.stroke();
  // valves: open = two flaps pointing the way blood flows, closed = a dark bar
  const valve=(x1,x2,y,open,up)=>{c.lineWidth=5*S;if(open){c.strokeStyle='#fff';const d=(up?-1:1)*14*S;c.beginPath();c.moveTo(X(x1),Y(y));c.lineTo(X(x1)+6*S,Y(y)+d);c.moveTo(X(x2),Y(y));c.lineTo(X(x2)-6*S,Y(y)+d);c.stroke()}else{c.strokeStyle='#2b1a12';c.beginPath();c.moveTo(X(x1),Y(y));c.lineTo(X(x2),Y(y));c.stroke()}};
  const avOpen=phase<=1,slOpen=phase===2;
  valve(85,145,192,avOpen,false);valve(275,335,192,avOpen,false);valve(176,196,214,slOpen,true);valve(225,245,214,slOpen,true);
  const pathB=[[20,30],[90,108],[115,140],[115,192],[115,262],[180,218],[192,60],[180,28],[110,12]],pathR=[[410,60],[330,108],[305,140],[305,192],[310,268],[240,218],[228,60],[245,26],[330,12]];
  const sp=dt/period*0.9;flowB=flowB.map(f=>(f+sp)%1);flowR=flowR.map(f=>(f+sp)%1);
  c.fillStyle='#2648a8';flowB.forEach(f=>{const p=along(pathB,f);c.beginPath();c.arc(X(p[0]),Y(p[1]),4*S,0,7);c.fill()});
  c.fillStyle='#b3121f';flowR.forEach(f=>{const p=along(pathR,f);c.beginPath();c.arc(X(p[0]),Y(p[1]),4*S,0,7);c.fill()});
  if($('.lab',el).checked){c.fillStyle=T.ink;c.font=`600 ${Math.max(10,12*S)}px Lexend,sans-serif`;c.textAlign='center';
   [['Right atrium',115,170],['Left atrium',305,170],['Right ventricle',115,305],['Left ventricle',310,312]].forEach(([n,x,y])=>c.fillText(n,X(x),Y(y)));
   c.font=`${Math.max(9,10.5*S)}px Lexend,sans-serif`;c.fillStyle=T.mut;c.textAlign='left';
   [['Vena cava ← body',4,74],['Pulmonary artery → lungs',4,4],['Pulmonary veins ← lungs',318,96],['Aorta → body',322,40]].forEach(([n,x,y])=>{const tw=c.measureText(n).width,fh=Math.max(9,10.5*S);c.fillStyle=T.bg;c.globalAlpha=.85;c.fillRect(X(x)-3,Y(y)-fh,tw+6,fh+5);c.globalAlpha=1;c.fillStyle=T.mut;c.fillText(n,X(x),Y(y))});
   c.textAlign='center';c.fillStyle=T.ink;c.fillText('Valves: white = open, dark bar = closed',X(210),Y(352))}
 }}}});
})();
