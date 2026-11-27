/* Math: Unit Circle — one simulation. Copy this file to make a new one. */
(()=>{
const {$,clamp,lerp,fit,slider,markTried,SIMS,T}=STEM;
SIMS.push({id:'unit-circle',subject:'math',title:'Unit circle and the sine wave',level:'Grade 10–12',blurb:'A point goes round a circle of radius 1. Its height traces the sine wave, its sideways position is cosine.',mount(el){
 el.innerHTML=`<div class="split"><div class="fig"><canvas aria-label="Unit circle drawing a sine wave"></canvas></div><div class="panel">
 <div class="stats"><div class="stat"><small>Angle θ</small><b class="th"></b></div><div class="stat"><small>θ in radians</small><b class="rd"></b></div><div class="stat"><small>sin θ (height)</small><b class="sn" style="color:#e5483a"></b></div><div class="stat"><small>cos θ (sideways)</small><b class="cs" style="color:#3d6fe6"></b></div></div>
 ${slider('sp','Speed',0,3,.1,1)}<div class="row"><button class="btn pz">Pause</button><button class="btn ghost st">Step 15°</button></div>
 <p class="note">Check: sin² θ + cos² θ always equals 1, because the point stays on a circle of radius 1.</p></div></div>`;
 let th=0,run=true,trail=[];$('.pz',el).onclick=e=>{run=!run;e.target.textContent=run?'Pause':'Play'};$('.st',el).onclick=()=>{th+=Math.PI/12;markTried('unit-circle')};
 $('.sp',el).oninput=e=>{$('.spv',el).textContent=e.target.value;markTried('unit-circle')};
 return{frame(dt){if(run)th+=dt*+$('.sp',el).value;const d=((th*180/Math.PI)%360+360)%360;
  $('.th',el).textContent=d.toFixed(0)+'°';$('.rd',el).textContent=(d*Math.PI/180).toFixed(2);$('.sn',el).textContent=Math.sin(th).toFixed(3);$('.cs',el).textContent=Math.cos(th).toFixed(3);
  const cv=$('canvas',el),{c,w,h}=fit(cv);c.clearRect(0,0,w,h);const R=Math.min(h*.36,w*.2),cx=R+24,cy=h/2,x0=cx+R+30;
  trail.unshift(Math.sin(th));const tl=Math.max(10,Math.floor((w-x0-10)/1.2));if(trail.length>tl)trail.length=tl;
  c.strokeStyle=T.ink;c.globalAlpha=.25;c.lineWidth=1;c.beginPath();c.moveTo(cx-R-10,cy);c.lineTo(w-8,cy);c.moveTo(cx,cy-R-10);c.lineTo(cx,cy+R+10);c.stroke();c.globalAlpha=1;
  c.lineWidth=2.5;c.beginPath();c.arc(cx,cy,R,0,7);c.stroke();
  const px=cx+Math.cos(th)*R,py=cy-Math.sin(th)*R;
  c.strokeStyle='#e9a400';c.beginPath();c.moveTo(cx+18,cy);c.arc(cx,cy,18,0,-((th%(2*Math.PI))+2*Math.PI)%(2*Math.PI),true);c.stroke();
  c.strokeStyle=T.ink;c.beginPath();c.moveTo(cx,cy);c.lineTo(px,py);c.stroke();
  c.strokeStyle='#3d6fe6';c.lineWidth=4;c.beginPath();c.moveTo(cx,cy);c.lineTo(px,cy);c.stroke();
  c.strokeStyle='#e5483a';c.beginPath();c.moveTo(px,cy);c.lineTo(px,py);c.stroke();
  c.setLineDash([4,4]);c.lineWidth=1.5;c.strokeStyle=T.mut;c.beginPath();c.moveTo(px,py);c.lineTo(x0,py);c.stroke();c.setLineDash([]);
  c.strokeStyle='#e5483a';c.lineWidth=3;c.beginPath();trail.forEach((v,i)=>{const X=x0+i*1.2,Y=cy-v*R;i?c.lineTo(X,Y):c.moveTo(X,Y)});c.stroke();
  c.fillStyle=T.ink;c.beginPath();c.arc(px,py,7,0,7);c.fill();c.fillStyle='#e5483a';c.beginPath();c.arc(x0,py,6,0,7);c.fill();
  c.fillStyle=T.mut;c.font='12px Lexend,sans-serif';c.textAlign='left';c.fillText('y = sin θ',x0+6,cy-R-6)}}}});
})();
