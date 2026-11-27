/* Math: Function Transformer — one simulation. Copy this file to make a new one. */
(()=>{
const {$,clamp,lerp,fit,slider,markTried,SIMS,T}=STEM;
const FN={'x':x=>x,'x²':x=>x*x,'x³':x=>x*x*x,'sin x':Math.sin,'|x|':Math.abs,'√x':x=>x>=0?Math.sqrt(x):NaN,'2ˣ':x=>2**x,'1/x':x=>1/x};
SIMS.push({id:'graph-transformer',subject:'math',title:'Graph transformer',level:'Grade 9–12',blurb:'Pick a function and stretch, squash and shift it with sliders: y = a·f(b(x − h)) + k.',mount(el){
 el.innerHTML=`<div class="split"><div class="fig"><canvas aria-label="Function graph"></canvas></div><div class="panel">
 <div class="chips">${Object.keys(FN).map((k,i)=>`<button data-f="${k}" class="${i===1?'on':''}">${k}</button>`).join('')}</div>
 <div class="out"><p class="eq fx"></p><p class="note pt">Move over the graph to read points.</p></div>
 ${slider('a','a: vertical stretch (negative flips)',-3,3,.1,1)}${slider('b','b: horizontal squash',.2,3,.1,1)}${slider('h','h: shift right',-6,6,.5,0)}${slider('k','k: shift up',-6,6,.5,0)}
 <button class="btn ghost rs">Reset sliders</button></div></div>`;
 let fk='x²',hover=null;const g=k=>+$('.'+k,el).value;const G=x=>g('a')*FN[fk](g('b')*(x-g('h')))+g('k');
 const label=()=>{['a','b','h','k'].forEach(k=>$('.'+k+'v',el).textContent=g(k));const a=g('a'),b=g('b'),hh=g('h'),k=g('k');const inner=`${b===1?'':b}(x ${hh<0?'+':'−'} ${Math.abs(hh)})`;const f=fk==='2ˣ'?`2^[${inner}]`:fk==='x'?inner:fk.replace('x',inner);$('.fx',el).textContent=`y = ${a===1?'':a===-1?'−':a+' · '}${f} ${k<0?'−':'+'} ${Math.abs(k)}`};
 el.querySelectorAll('input').forEach(i=>i.oninput=()=>{label();markTried('graph-transformer')});
 el.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{fk=b.dataset.f;el.querySelectorAll('.chips button').forEach(x=>x.classList.toggle('on',x===b));label()});
 $('.rs',el).onclick=()=>{[['a',1],['b',1],['h',0],['k',0]].forEach(([k,v])=>$('.'+k,el).value=v);label()};label();
 const cv=$('canvas',el);cv.onpointermove=e=>{const r=cv.getBoundingClientRect();hover=(e.clientX-r.left)/r.width};cv.onpointerleave=()=>{hover=null;$('.pt',el).textContent='Move over the graph to read points.'};
 return{frame(){const{c,w,h}=fit(cv);c.clearRect(0,0,w,h);const xr=10,sc=w/(2*xr),yr=h/2/sc,X=x=>w/2+x*sc,Y=y=>h/2-y*sc;
  c.lineWidth=1;c.strokeStyle=T.ink;c.globalAlpha=.1;for(let i=-xr;i<=xr;i++){c.beginPath();c.moveTo(X(i),0);c.lineTo(X(i),h);c.stroke()}for(let j=Math.ceil(-yr);j<=yr;j++){c.beginPath();c.moveTo(0,Y(j));c.lineTo(w,Y(j));c.stroke()}c.globalAlpha=.6;c.lineWidth=1.5;c.beginPath();c.moveTo(0,h/2);c.lineTo(w,h/2);c.moveTo(w/2,0);c.lineTo(w/2,h);c.stroke();c.globalAlpha=1;
  c.fillStyle=T.mut;c.font='11px Lexend,sans-serif';c.textAlign='center';for(let i=-xr+2;i<xr;i+=2)if(i)c.fillText(i,X(i),h/2+14);
  const plot=(fn,col,wd,dash)=>{c.strokeStyle=col;c.lineWidth=wd;c.setLineDash(dash);c.beginPath();let pen=false,py=0;for(let px=0;px<=w;px++){const x=(px-w/2)/sc,y=fn(x),sy=Y(y);if(!isFinite(y)||Math.abs(sy-py)>h&&pen){pen=false;if(!isFinite(y))continue}pen?c.lineTo(px,sy):c.moveTo(px,sy);pen=true;py=sy}c.stroke();c.setLineDash([])};
  plot(FN[fk],T.mut,2,[5,5]);plot(G,'#3d6fe6',3.5,[]);
  if(hover!=null){const x=(hover*w-w/2)/sc,y=G(x);if(isFinite(y)){c.fillStyle='#e5483a';c.beginPath();c.arc(X(x),Y(y),6,0,7);c.fill();$('.pt',el).textContent=`Point: (${x.toFixed(2)}, ${y.toFixed(2)})`}}
  c.textAlign='left';c.fillStyle=T.mut;c.fillText('dashed = original f(x)',8,h-8)}}}});
})();
