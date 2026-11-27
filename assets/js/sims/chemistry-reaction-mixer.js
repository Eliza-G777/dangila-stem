/* Chemistry: Reaction Mixer — one simulation. Copy this file to make a new one. */
(()=>{
const {$,clamp,lerp,fit,slider,markTried,SIMS,T}=STEM;
const RG=[
 {id:'hcl',n:'Hydrochloric acid',f:'HCl',col:[205,228,255,.35]},
 {id:'naoh',n:'Sodium hydroxide',f:'NaOH',col:[215,232,255,.35]},
 {id:'vin',n:'Vinegar',f:'CH₃COOH',col:[240,228,190,.45]},
 {id:'soda',n:'Baking soda',f:'NaHCO₃',solid:'heap'},
 {id:'zn',n:'Zinc granules',f:'Zn',solid:'gran'},
 {id:'fe',n:'Iron nail',f:'Fe',solid:'nail'},
 {id:'cuso4',n:'Copper(II) sulfate',f:'CuSO₄',col:[40,120,230,.75]},
 {id:'agno3',n:'Silver nitrate',f:'AgNO₃',col:[222,228,240,.32]},
 {id:'nacl',n:'Salt water',f:'NaCl',col:[222,234,246,.3]},
 {id:'h2o2',n:'Hydrogen peroxide',f:'H₂O₂',col:[218,238,255,.3]},
 {id:'ki',n:'Potassium iodide',f:'KI',col:[238,232,205,.4]}];
const RX={
 'hcl|naoh':{eq:'HCl + NaOH → NaCl + H₂O',t:'Neutralisation (acid + base)',see:'No colour change, but the beaker gets warm.',why:'H⁺ ions from the acid join OH⁻ ions from the base to make water. Energy is given out, so the reaction is exothermic.',heat:6},
 'soda|vin':{eq:'NaHCO₃ + CH₃COOH → CH₃COONa + H₂O + CO₂↑',t:'Acid + carbonate',see:'Strong fizzing as the baking soda disappears.',why:'The acid breaks up the carbonate and carbon dioxide gas escapes. This is the safe one you can try in class.',gas:1,eat:1,heat:-2},
 'hcl|soda':{eq:'NaHCO₃ + HCl → NaCl + H₂O + CO₂↑',t:'Acid + carbonate',see:'Fast fizzing; the white powder dissolves.',why:'Every acid reacts with carbonates to give a salt, water and carbon dioxide.',gas:1,eat:1},
 'hcl|zn':{eq:'Zn + 2HCl → ZnCl₂ + H₂↑',t:'Metal + acid',see:'Steady bubbles form on the zinc, which slowly gets smaller.',why:'Zinc is more reactive than hydrogen, so it pushes hydrogen out of the acid. A lit splint would give a squeaky pop.',gas:.45,eat:.6,heat:3},
 'cuso4|fe':{eq:'Fe + CuSO₄ → FeSO₄ + Cu',t:'Displacement',see:'The blue colour fades to pale green and brown copper coats the nail.',why:'Iron is more reactive than copper, so it takes copper’s place in the solution.',end:[150,195,150,.5],coat:1},
 'cuso4|zn':{eq:'Zn + CuSO₄ → ZnSO₄ + Cu',t:'Displacement',see:'Blue fades to colourless; brown copper forms on the zinc.',why:'Zinc is higher than copper in the reactivity series, so it displaces it.',end:[228,234,242,.3],coat:1,heat:4},
 'agno3|nacl':{eq:'AgNO₃ + NaCl → AgCl↓ + NaNO₃',t:'Precipitation',see:'A white cloudy solid forms and sinks to the bottom.',why:'Silver chloride does not dissolve in water, so it comes out of solution as a precipitate. This is how chemists test for chloride ions.',ppt:[246,246,246]},
 'agno3|hcl':{eq:'AgNO₃ + HCl → AgCl↓ + HNO₃',t:'Precipitation',see:'A white precipitate forms.',why:'Any chloride, including hydrochloric acid, gives white silver chloride with silver nitrate.',ppt:[246,246,246]},
 'cuso4|naoh':{eq:'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',t:'Precipitation',see:'A pale blue jelly-like solid forms; the liquid becomes paler.',why:'Copper ions meet hydroxide ions and form copper(II) hydroxide, which cannot dissolve.',ppt:[90,150,235],end:[205,222,245,.35]},
 'h2o2|ki':{eq:'2H₂O₂ → 2H₂O + O₂↑',t:'Decomposition with a catalyst',see:'Rapid bubbling and foam. A glowing splint would relight.',why:'Iodide ions are a catalyst: they speed up the breakdown of hydrogen peroxide without being used up.',gas:1,foam:1,end:[240,200,120,.5],heat:8}};
SIMS.push({id:'reaction-mixer',subject:'chemistry',title:'Reaction mixer',level:'Grade 9–10',blurb:'Choose two chemicals, mix them, and see what happens and why.',mount(el){
 const opts=RG.map(r=>`<option value="${r.id}">${r.n} (${r.f})</option>`).join('');
 el.innerHTML=`<div class="split"><div class="fig"><canvas aria-label="Beaker animation"></canvas></div><div class="panel">
 <label><b>First chemical</b><select class="a">${opts}</select></label>
 <label><b>Second chemical</b><select class="b">${opts}</select></label>
 <div class="row"><button class="btn go">Mix</button><button class="btn ghost rs">Empty beaker</button></div>
 <div class="out" aria-live="polite"></div>
 <p class="note">Try: vinegar + baking soda, copper sulfate + iron nail, silver nitrate + salt water.</p></div></div>`;
 const cv=$('canvas',el),out=$('.out',el),A=$('.a',el),B=$('.b',el);A.value='vin';B.value='soda';
 let S=null;
 const reset=()=>{S={liq:null,solid:null,rx:null,p:0,col:[230,236,245,0],tcol:[230,236,245,0],bub:[],ppt:[],settled:0,foam:0,temp:22,ttemp:22,eaten:0,coat:0};out.innerHTML='Pick two chemicals and press <b>Mix</b>.'};
 const mix=()=>{reset();const a=RG.find(r=>r.id===A.value),b=RG.find(r=>r.id===B.value);
  const liqs=[a,b].filter(r=>!r.solid),sol=[a,b].find(r=>r.solid);S.solid=sol?sol.solid:null;
  if(liqs.length){const c=liqs.reduce((s,r)=>s.map((v,i)=>v+r.col[i]/liqs.length),[0,0,0,0]);S.col=c.slice();S.tcol=c.slice();S.liq=1}
  if(a.id===b.id){out.innerHTML='<p class="eq">Same chemical twice</p><p>Nothing new happens: you need two different substances for a reaction.</p>';return}
  if(!liqs.length){out.innerHTML='<p class="eq">Two dry solids</p><p>Solids barely react on their own. Add a liquid so the particles can move and meet.</p>';return}
  const r=RX[[a.id,b.id].sort().join('|')];S.rx=r||null;
  if(!r){out.innerHTML=`<p class="eq">${a.f} + ${b.f} → no visible reaction</p><p>These two just mix. Not every pair of chemicals reacts: look for gas, colour change, a precipitate or a temperature change as signs of a reaction.</p>`;return}
  if(r.end)S.tcol=r.end.slice();S.ttemp=22+(r.heat||0);
  out.innerHTML=`<span class="tag">${r.t}</span><p class="eq">${r.eq}</p><p><b>You see:</b> ${r.see}</p><p><b>Why:</b> ${r.why}</p>`;markTried('reaction-mixer')};
 $('.go',el).onclick=mix;$('.rs',el).onclick=reset;reset();
 return{frame(dt){const{c,w,h}=fit(cv);c.clearRect(0,0,w,h);
  const bw=Math.min(230,w*.55),bh=Math.min(250,h*.72),bx=(w-bw)/2,by=(h-bh)/2+14,lv=by+bh*.38,bot=by+bh;
  const r=S.rx;if(r){S.p=Math.min(1,S.p+dt/3.5)}const p=S.p;
  const col=S.col.map((v,i)=>lerp(v,S.tcol[i],p));S.temp=lerp(22,S.ttemp,p);
  if(S.liq){c.fillStyle=`rgba(${col[0]|0},${col[1]|0},${col[2]|0},${col[3]+.15})`;c.fillRect(bx+4,lv,bw-8,bot-lv-4);
   c.fillStyle='rgba(255,255,255,.25)';c.fillRect(bx+4,lv,bw-8,4)}
  // solid
  const cx=w/2,eat=r&&r.eat?p*r.eat:0,coat=r&&r.coat?p:0;
  const metal=`rgb(${lerp(150,170,coat)|0},${lerp(156,92,coat)|0},${lerp(168,45,coat)|0})`;
  if(S.solid==='heap'&&eat<1){const s=1-eat;c.fillStyle='#f7f7f2';c.beginPath();c.ellipse(cx,bot-6,50*s+2,22*s+2,0,Math.PI,0);c.fill()}
  if(S.solid==='gran'){c.fillStyle=metal;[[-40,0],[-14,4],[14,-2],[38,3],[-26,-14],[24,-14]].forEach(([dx,dy])=>{c.beginPath();c.arc(cx+dx,bot-14+dy,12*(1-eat*.5),0,7);c.fill()})}
  if(S.solid==='nail'){c.save();c.translate(cx,bot-24);c.rotate(-.35);c.fillStyle=metal;c.fillRect(-70,-5,130,10);c.fillRect(-78,-11,10,22);c.beginPath();c.moveTo(60,-5);c.lineTo(78,0);c.lineTo(60,5);c.fill();c.restore()}
  // bubbles
  if(r&&r.gas&&p<1&&S.liq){const n=r.gas*90*dt*(1.2-p),k=Math.floor(n)+(Math.random()<n%1?1:0);for(let i=0;i<k;i++)S.bub.push({x:cx+(Math.random()-.5)*bw*.7,y:bot-10,r:2+Math.random()*4,v:40+Math.random()*60})}
  c.fillStyle='rgba(255,255,255,.85)';c.strokeStyle='rgba(120,140,170,.6)';
  S.bub=S.bub.filter(b=>{b.y-=b.v*dt;b.x+=Math.sin(b.y/9)*.4;c.beginPath();c.arc(b.x,b.y,b.r,0,7);c.fill();c.stroke();return b.y>lv-(S.foam>0?S.foam:0)});
  // foam
  if(r&&r.foam){S.foam=Math.min(bh*.62+40,p*(bh*.62+40));c.fillStyle='rgba(250,240,215,.95)';for(let i=0;i<26;i++){const fx=bx+10+((i*37)%(bw-20)),fy=lv-S.foam*((i%5)/5);c.beginPath();c.arc(fx,fy+8,14,0,7);c.fill()}
   c.fillRect(bx+6,lv-S.foam+8,bw-12,S.foam)}
  // precipitate
  if(r&&r.ppt){if(p<.85)for(let i=0;i<4;i++)S.ppt.push({x:bx+12+Math.random()*(bw-24),y:lv+Math.random()*20,v:15+Math.random()*30});
   const pc=r.ppt;c.fillStyle=`rgba(${pc[0]},${pc[1]},${pc[2]},.8)`;
   S.ppt=S.ppt.filter(q=>{q.y+=q.v*dt;if(q.y>bot-8-S.settled){S.settled=Math.min(28,S.settled+.02);return false}c.fillRect(q.x,q.y,3,3);return true});
   c.fillStyle=`rgb(${pc[0]},${pc[1]},${pc[2]})`;c.fillRect(bx+4,bot-4-S.settled,bw-8,S.settled);
   c.fillStyle=`rgba(${pc[0]},${pc[1]},${pc[2]},${.25*(1-p)})`;c.fillRect(bx+4,lv,bw-8,bot-lv-4)}
  // beaker glass
  c.strokeStyle=T.ink;c.lineWidth=3;c.beginPath();c.moveTo(bx-10,by);c.lineTo(bx,by+8);c.lineTo(bx,bot);c.lineTo(bx+bw,bot);c.lineTo(bx+bw,by+8);c.lineTo(bx+bw+10,by);c.stroke();
  c.lineWidth=1.5;c.fillStyle=T.mut;c.font='12px Lexend,sans-serif';for(let i=1;i<5;i++){const y=bot-(bot-by)*i/5;c.beginPath();c.moveTo(bx+bw-22,y);c.lineTo(bx+bw-6,y);c.strokeStyle=T.mut;c.stroke()}
  // thermometer
  c.fillStyle=T.ink;c.font='600 15px Lexend,sans-serif';c.textAlign='left';c.fillText(`${S.temp.toFixed(1)} °C`,14,26);
  if(r&&r.heat>0&&p>.1){c.strokeStyle='rgba(229,72,58,.55)';c.lineWidth=2;for(let i=0;i<3;i++){const x=cx-30+i*30;c.beginPath();for(let y=0;y<34;y+=2)c.lineTo(x+Math.sin((y+performance.now()/60)/5)*4,by-6-y);c.stroke()}}
 }}}});
})();
