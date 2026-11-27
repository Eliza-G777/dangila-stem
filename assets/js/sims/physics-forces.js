/* Physics: forces and motion — Newton's second law with friction. */
(()=>{
const {$,clamp,fit,slider,markTried,SIMS,T}=STEM;
const SURF=[['Ice',0.03,'#bfe3f5'],['Wooden floor',0.3,'#c99a6b'],['Rough road',0.6,'#8a8f99']];
SIMS.push({id:'forces-motion',subject:'physics',title:'Forces and motion: F = m × a',level:'Grade 9–10',blurb:'Push a box with different forces, masses and surfaces. See how friction and net force decide the acceleration.',mount(el){
 el.innerHTML=`<div class="split"><div><div class="fig"><canvas aria-label="Box being pushed with force arrows"></canvas></div><div class="fig small"><canvas class="gr" aria-label="Velocity against time"></canvas></div></div><div class="panel">
 ${slider('f','Your push (negative = pull back)',-200,200,5,60,' N')}${slider('m','Mass of the box',1,50,1,10,' kg')}
 <label><b>Surface</b><select class="sf">${SURF.map(([n,mu],i)=>`<option value="${i}" ${i===1?'selected':''}>${n} (μ = ${mu})</option>`).join('')}</select></label>
 <div class="row"><button class="btn ghost stop">Stop the box</button></div>
 <div class="stats"><div class="stat"><small>Friction</small><b class="fr">–</b></div><div class="stat"><small>Net force</small><b class="fn">–</b></div><div class="stat"><small>Acceleration</small><b class="ac">–</b></div><div class="stat"><small>Velocity</small><b class="ve">–</b></div></div>
 <div class="out ex" aria-live="polite"></div></div></div>`;
 const g=k=>+$('.'+k,el).value;let v=0,x=0,hist=[],acc=0,tick=0;
 el.querySelectorAll('input').forEach(i=>i.oninput=()=>{$('.fv',el).textContent=g('f')+' N';$('.mv',el).textContent=g('m')+' kg';markTried('forces-motion')});
 $('.stop',el).onclick=()=>{v=0;$('.f',el).value=0;$('.fv',el).textContent='0 N'};
 return{frame(dt){const F=g('f'),m=g('m'),s=SURF[+$('.sf',el).value],mu=s[1],N=m*9.8,fmax=mu*N;let fr=0;
  if(Math.abs(v)<0.02&&Math.abs(F)<=fmax){fr=-F;v=0}else{fr=-Math.sign(v||F)*fmax}
  const net=F+fr;acc=net/m;const nv=v+acc*dt;if(v!==0&&Math.sign(nv)!==Math.sign(v)&&Math.abs(F)<=fmax)v=0;else v=nv;v=Math.max(-40,Math.min(40,v));x+=v*dt;
  if((tick+=dt)>0.05){tick=0;hist.push(v);if(hist.length>240)hist.shift();
   $('.fr',el).textContent=Math.abs(fr).toFixed(0)+' N';$('.fn',el).textContent=net.toFixed(0)+' N';$('.ac',el).textContent=acc.toFixed(2)+' m/s²';$('.ve',el).textContent=v.toFixed(1)+' m/s';
   $('.ex',el).innerHTML=Math.abs(v)<0.02&&Math.abs(F)<=fmax&&F!==0?`<p>The box does not move: friction can push back up to μ × m × g = ${fmax.toFixed(0)} N, which is more than your ${Math.abs(F)} N push.</p>`:F===0&&Math.abs(v)>0.02?'<p>No push, but the box is still moving: friction is the only force, so it slows down.</p>':`<p>Net force = push − friction = ${F} − ${Math.abs(fr).toFixed(0)} = ${net.toFixed(0)} N. a = F ÷ m = ${net.toFixed(0)} ÷ ${m} = <b>${acc.toFixed(2)} m/s²</b>.</p>`}
  const cv=$('canvas',el),{c,w,h}=fit(cv);c.clearRect(0,0,w,h);const gy=h*.7;
  c.fillStyle=s[2];c.fillRect(0,gy,w,h-gy);c.strokeStyle=T.ink;c.globalAlpha=.25;const off=((x*30)%60+60)%60;for(let i=-60;i<w+60;i+=60){c.beginPath();c.moveTo(i-off,gy);c.lineTo(i-off-14,h);c.stroke()}c.globalAlpha=1;
  const bs=40+Math.sqrt(m)*8,bx=w/2-bs/2,by=gy-bs;c.fillStyle='#c98a00';c.fillRect(bx,by,bs,bs);c.strokeStyle='#7a5200';c.lineWidth=2;c.strokeRect(bx,by,bs,bs);c.fillStyle='#fff';c.font='600 13px Lexend,sans-serif';c.textAlign='center';c.fillText(m+' kg',w/2,by+bs/2+5);
  const arrow=(x0,y0,dx,dy,col,lab)=>{if(Math.abs(dx)+Math.abs(dy)<2)return;c.strokeStyle=col;c.fillStyle=col;c.lineWidth=4;c.beginPath();c.moveTo(x0,y0);c.lineTo(x0+dx,y0+dy);c.stroke();const a=Math.atan2(dy,dx);c.beginPath();c.moveTo(x0+dx,y0+dy);c.lineTo(x0+dx-10*Math.cos(a-.4),y0+dy-10*Math.sin(a-.4));c.lineTo(x0+dx-10*Math.cos(a+.4),y0+dy-10*Math.sin(a+.4));c.fill();c.font='12px Lexend,sans-serif';c.fillText(lab,x0+dx+(dx>0?22:dx<0?-22:0),y0+dy+(dy>0?14:dy<0?-6:4))};
  const k=Math.min(.5,(w*.35)/Math.max(200,N));
  arrow(F>=0?bx:bx+bs,by+bs/2,F*k*.9||0,0,'#e5483a','Push '+F+' N');arrow(F>=0?bx+bs:bx,gy-6,fr*k*.9,0,'#3d6fe6','Friction');
  arrow(w/2,gy,0,Math.min(70,N*k*.4),'#7a4fd6','Weight');arrow(w/2,by,0,-Math.min(70,N*k*.4),'#2c9a59','Normal');
  const gc=$('.gr',el),G2=fit(gc),c2=G2.c;c2.clearRect(0,0,G2.w,G2.h);const mid=G2.h/2;c2.strokeStyle=T.mut;c2.lineWidth=1;c2.beginPath();c2.moveTo(0,mid);c2.lineTo(G2.w,mid);c2.stroke();
  c2.strokeStyle='#e9a400';c2.lineWidth=2.5;c2.beginPath();hist.forEach((q,i)=>{const X=i*G2.w/240,Y=mid-q/40*(mid-8);i?c2.lineTo(X,Y):c2.moveTo(X,Y)});c2.stroke();c2.fillStyle=T.mut;c2.font='11px Lexend,sans-serif';c2.textAlign='left';c2.fillText('velocity over time',6,14)
 }}}});
})();
