/* Physics: pendulum and energy — period, kinetic and potential energy, damping. */
(()=>{
const {$,fit,slider,markTried,SIMS,T}=STEM;
const PLANETS=[['Earth',9.8],['Moon',1.6],['Mars',3.7],['Jupiter',24.8]];
SIMS.push({id:'pendulum-energy',subject:'physics',title:'Pendulum and energy',level:'Grade 10–12',blurb:'Watch energy change between kinetic and potential as a pendulum swings. What changes the time of one swing?',mount(el){
 el.innerHTML=`<div class="split"><div class="fig"><canvas aria-label="Swinging pendulum with energy bars"></canvas></div><div class="panel">
 ${slider('len','String length',0.2,3,0.1,1,' m')}${slider('amp','Release angle',5,80,1,30,'°')}${slider('mass','Mass of the bob',0.1,5,0.1,1,' kg')}
 <label><b>Planet</b><select class="pl">${PLANETS.map(([n,g])=>`<option value="${g}">${n} (g = ${g} m/s²)</option>`).join('')}</select></label>
 <label class="check"><input type="checkbox" class="damp"> Air resistance (the swing slowly dies away)</label>
 <div class="row"><button class="btn y rel">Release</button></div>
 <div class="stats"><div class="stat"><small>Measured period</small><b class="pm">–</b></div><div class="stat"><small>Formula T = 2π√(L/g)</small><b class="pf">–</b></div></div>
 <p class="note">Try: does a heavier bob swing faster? Does a longer string? Change one thing at a time.</p></div></div>`;
 const g=k=>+$('.'+k,el).value,G=()=>+$('.pl',el).value;let th=0,om=0,lastCross=null,period=null,t=0,prevSign=0;
 const release=()=>{th=g('amp')*Math.PI/180;om=0;t=0;lastCross=null;period=null;prevSign=0;$('.pm',el).textContent='measuring…';markTried('pendulum-energy')};
 const upd=()=>{$('.lenv',el).textContent=g('len')+' m';$('.ampv',el).textContent=g('amp')+'°';$('.massv',el).textContent=g('mass')+' kg';$('.pf',el).textContent=(2*Math.PI*Math.sqrt(g('len')/G())).toFixed(2)+' s'};
 el.querySelectorAll('input[type=range]').forEach(i=>i.oninput=()=>{upd();release()});$('.pl',el).onchange=()=>{upd();release()};$('.rel',el).onclick=release;upd();release();
 const acc=(a,w)=>-(G()/g('len'))*Math.sin(a)-($('.damp',el).checked?0.25:0)*w;
 return{frame(dt){const steps=8,hh=dt/steps;for(let i=0;i<steps;i++){const k1a=om,k1w=acc(th,om),k2a=om+hh/2*k1w,k2w=acc(th+hh/2*k1a,om+hh/2*k1w),k3a=om+hh/2*k2w,k3w=acc(th+hh/2*k2a,om+hh/2*k2w),k4a=om+hh*k3w,k4w=acc(th+hh*k3a,om+hh*k3w);
   th+=hh/6*(k1a+2*k2a+2*k3a+k4a);om+=hh/6*(k1w+2*k2w+2*k3w+k4w);t+=hh;const s=Math.sign(th);if(prevSign<0&&s>0){if(lastCross!=null){period=t-lastCross;$('.pm',el).textContent=period.toFixed(2)+' s'}lastCross=t}if(s)prevSign=s}
  const cv=$('canvas',el),{c,w,h}=fit(cv);c.clearRect(0,0,w,h);const L=g('len'),m=g('mass'),Gv=G();
  const bw=Math.min(150,w*.3),px=(w-bw)/2,py=24,scale=(h-70)/3.1,len=L*scale,bx=px+Math.sin(th)*len,by=py+Math.cos(th)*len;
  c.strokeStyle=T.mut;c.lineWidth=4;c.beginPath();c.moveTo(px-50,py);c.lineTo(px+50,py);c.stroke();
  c.setLineDash([3,4]);c.lineWidth=1;c.beginPath();c.moveTo(px,py);c.lineTo(px,py+len+20);c.stroke();c.setLineDash([]);
  const lowest=py+len;c.strokeStyle=T.mut;c.beginPath();c.moveTo(px-40,lowest+18);c.lineTo(px+40,lowest+18);c.stroke();
  c.strokeStyle=T.ink;c.lineWidth=2;c.beginPath();c.moveTo(px,py);c.lineTo(bx,by);c.stroke();
  const r=8+Math.cbrt(m)*7,gr=c.createRadialGradient(bx-r/3,by-r/3,2,bx,by,r);gr.addColorStop(0,'#ffd36b');gr.addColorStop(1,'#c98a00');c.fillStyle=gr;c.beginPath();c.arc(bx,by,r,0,7);c.fill();
  // energy bars
  const hgt=L*(1-Math.cos(th)),PE=m*Gv*hgt,KE=.5*m*(om*L)**2,TOT=m*Gv*L*(1-Math.cos(g('amp')*Math.PI/180))||1;
  const bars=[['KE',KE,'#e5483a'],['PE',PE,'#3d6fe6'],['Total',KE+PE,'#2c9a59']],x0=w-bw-10,bh=h-80;
  c.font='12px Lexend,sans-serif';c.textAlign='center';
  bars.forEach(([n,v,col],i)=>{const x=x0+i*(bw/3)+6,bwid=bw/3-12,H=Math.min(1,v/TOT)*bh;c.fillStyle=T.card;c.fillRect(x,30,bwid,bh);c.fillStyle=col;c.fillRect(x,30+bh-H,bwid,H);c.fillStyle=T.ink;c.fillText(n,x+bwid/2,h-34);c.fillText(v.toFixed(2)+' J',x+bwid/2,h-18)});
  c.textAlign='left';c.fillStyle=T.mut;c.fillText('Energy',x0+6,20)
 }}}});
})();
