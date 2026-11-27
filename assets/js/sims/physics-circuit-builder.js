/* Electricity: Circuit — one simulation. Copy this file to make a new one. */
(()=>{
const {$,clamp,lerp,fit,slider,markTried,SIMS,T}=STEM;
SIMS.push({id:'circuit-builder',subject:'physics',title:'Circuit builder: series and parallel',level:'Grade 9–10',blurb:'Change the battery and two bulbs, then compare series and parallel circuits using Ohm’s law (V = I × R).',mount(el){
 el.innerHTML=`<div class="split"><div class="fig"><canvas aria-label="Circuit animation"></canvas></div><div class="panel">
 <div class="row"><button class="btn md on" data-m="s">Series</button><button class="btn ghost md" data-m="p">Parallel</button><button class="btn ghost sw">Open switch</button></div>
 ${slider('v','Battery voltage',1.5,12,.5,6,' V')}${slider('r1','Bulb 1 resistance',1,50,1,10,' Ω')}${slider('r2','Bulb 2 resistance',1,50,1,10,' Ω')}
 <div class="stats"><div class="stat"><small>Total resistance</small><b class="rt"></b></div><div class="stat"><small>Current from battery</small><b class="it"></b></div><div class="stat"><small>Bulb 1 power</small><b class="p1"></b></div><div class="stat"><small>Bulb 2 power</small><b class="p2"></b></div></div>
 <div class="out ex" aria-live="polite"></div><button class="btn ghost fix" hidden>Replace burnt bulbs</button></div></div>`;
 let mode='s',closed=true,blown=[false,false],E={I:0,I1:0,I2:0,P1:0,P2:0,R:0};const off=[0,0];
 const g=k=>+$('.'+k,el).value;
 const calc=()=>{const V=g('v'),R1=g('r1'),R2=g('r2');['v','r1','r2'].forEach(k=>$('.'+k+'v',el).textContent=$('.'+k,el).value+(k==='v'?' V':' Ω'));
  for(let pass=0;pass<2;pass++){if(mode==='s'){const R=R1+R2;const I=closed&&!blown[0]&&!blown[1]?V/R:0;E={R,I,I1:I,I2:I,P1:I*I*R1,P2:I*I*R2}}
   else{const I1=closed&&!blown[0]?V/R1:0,I2=closed&&!blown[1]?V/R2:0;E={R:1/(1/R1+1/R2),I:I1+I2,I1,I2,P1:I1*I1*R1,P2:I2*I2*R2}}
   if(E.P1>20)blown[0]=true;if(E.P2>20)blown[1]=true}
  $('.rt',el).textContent=E.R.toFixed(1)+' Ω';$('.it',el).textContent=E.I.toFixed(2)+' A';
  $('.p1',el).textContent=blown[0]?'burnt out':E.P1.toFixed(1)+' W';$('.p2',el).textContent=blown[1]?'burnt out':E.P2.toFixed(1)+' W';
  $('.fix',el).hidden=!(blown[0]||blown[1]);
  $('.ex',el).innerHTML=!closed?'<p>The switch is open, so there is a gap in the circuit. No current flows anywhere.</p>':(blown[0]||blown[1])?`<p><b>A bulb burnt out</b> (over 20 W). ${mode==='s'?'In series there is only one path, so <b>both</b> bulbs go dark.':'In parallel each bulb has its own path, so the other bulb stays on.'}</p>`:mode==='s'?`<p>One path: the same current (${E.I.toFixed(2)} A) goes through both bulbs. Resistances add: ${g('r1')} + ${g('r2')} = ${E.R} Ω. The bigger resistance gets more voltage and glows brighter.</p>`:`<p>Two paths: each bulb gets the full ${g('v')} V. Currents add: ${E.I1.toFixed(2)} + ${E.I2.toFixed(2)} = ${E.I.toFixed(2)} A. The smaller resistance draws more current and glows brighter.</p>`};
 el.querySelectorAll('input').forEach(i=>i.oninput=()=>{calc();markTried('circuit-builder')});
 el.querySelectorAll('.md').forEach(b=>b.onclick=()=>{mode=b.dataset.m;el.querySelectorAll('.md').forEach(x=>{x.classList.toggle('on',x===b);x.classList.toggle('ghost',x!==b)});calc()});
 $('.sw',el).onclick=e=>{closed=!closed;e.target.textContent=closed?'Open switch':'Close switch';calc()};
 $('.fix',el).onclick=()=>{blown=[false,false];calc()};calc();
 const along=(pts,s)=>{for(let i=0;i<pts.length-1;i++){const[a,b]=[pts[i],pts[i+1]],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(s<=L)return[a[0]+(b[0]-a[0])*s/L,a[1]+(b[1]-a[1])*s/L];s-=L}return pts[pts.length-1]};
 const len=pts=>pts.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]),0);
 return{frame(dt){const{c,w,h}=fit($('canvas',el));c.clearRect(0,0,w,h);
  const X=x=>x*w,Y=y=>y*h,P=a=>a.map(([x,y])=>[X(x),Y(y)]);
  const outer=P([[.12,.5],[.12,.15],[.88,.15],[.88,.85],[.12,.85],[.12,.5]]),inner=P([[.12,.5],[.12,.15],[.55,.15],[.55,.85],[.12,.85],[.12,.5]]);
  c.strokeStyle=T.ink;c.lineWidth=4;c.lineJoin='round';c.beginPath();outer.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();
  if(mode==='p'){c.beginPath();c.moveTo(X(.55),Y(.15));c.lineTo(X(.55),Y(.85));c.stroke()}
  // switch
  const sx=X(.3),sy=Y(.85);c.fillStyle=T.card;c.fillRect(sx-16,sy-6,32,12);c.beginPath();c.arc(sx-16,sy,4,0,7);c.arc(sx+16,sy,4,0,7);c.fillStyle=T.ink;c.fill();
  c.beginPath();c.moveTo(sx-16,sy);closed?c.lineTo(sx+16,sy):c.lineTo(sx+12,sy-20);c.stroke();
  // electrons
  const loops=mode==='s'?[[outer,E.I]]:[[outer,E.I1],[inner,E.I2]];
  loops.forEach(([pts,I],k)=>{const L=len(pts);off[k]=(off[k]+Math.min(260,I*45)*dt)%28;c.fillStyle='#3d6fe6';for(let s=off[k];s<L;s+=28){const[x,y]=along(pts,L-s);c.beginPath();c.arc(x,y,3.5,0,7);c.fill()}});
  // battery
  const bx=X(.12),byy=Y(.5);c.fillStyle=T.card;c.fillRect(bx-24,byy-14,48,28);c.strokeStyle=T.ink;c.lineWidth=4;c.beginPath();c.moveTo(bx-22,byy-6);c.lineTo(bx+22,byy-6);c.stroke();c.lineWidth=7;c.beginPath();c.moveTo(bx-11,byy+6);c.lineTo(bx+11,byy+6);c.stroke();
  c.fillStyle=T.ink;c.font='600 14px Lexend,sans-serif';c.textAlign='left';c.fillText('+',bx+26,byy-2);c.fillText(g('v')+' V',bx+26,byy+18);
  // bulbs
  const bulbs=mode==='s'?[[X(.5),Y(.15),E.P1,0],[X(.88),Y(.5),E.P2,1]]:[[X(.88),Y(.5),E.P1,0],[X(.55),Y(.5),E.P2,1]];
  bulbs.forEach(([x,y,Pw,i])=>{const b=blown[i]?0:clamp(Pw/4,0,1);if(b>0){const gr=c.createRadialGradient(x,y,4,x,y,20+50*b);gr.addColorStop(0,`rgba(255,215,80,${.9*b})`);gr.addColorStop(1,'rgba(255,200,60,0)');c.fillStyle=gr;c.beginPath();c.arc(x,y,20+50*b,0,7);c.fill()}
   c.fillStyle=blown[i]?'#7a7f8c':`rgb(${lerp(235,255,b)|0},${lerp(238,236,b)|0},${lerp(245,140,b)|0})`;c.strokeStyle=T.ink;c.lineWidth=2.5;c.beginPath();c.arc(x,y,17,0,7);c.fill();c.stroke();
   c.beginPath();c.moveTo(x-8,y+4);c.quadraticCurveTo(x-4,y-8,x,y+4);c.quadraticCurveTo(x+4,y-8,x+8,y+4);c.stroke();
   c.fillStyle=T.ink;c.font='500 13px Lexend,sans-serif';c.textAlign='center';if(i===0&&mode==='s')c.fillText('Bulb 1',x,y-28);else{c.textAlign='right';c.fillText(`Bulb ${i+1}`,x-24,y+5)}});
  c.textAlign='left';c.fillStyle=T.mut;c.font='12px Lexend,sans-serif';c.fillText('Blue dots: electrons',12,h-10);
 }}}});
})();
