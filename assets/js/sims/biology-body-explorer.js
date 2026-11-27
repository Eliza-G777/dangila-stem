/* Biology: human body explorer — organs and body systems with live animation. */
(()=>{
const {$,slider,markTried,SIMS}=STEM;
const ORG={
 brain:{n:'Brain',am:'አንጎል',sys:'Nervous system',does:'Controls the whole body. It receives messages from the senses and sends signals through nerves to muscles and organs.',fact:'It uses about 20% of the body’s energy, though it is only about 2% of body mass.'},
 spine:{n:'Spinal cord',am:'ሕብለ ሰረሰር',sys:'Nervous system',does:'Carries messages between the brain and the rest of the body. Some fast reflexes are handled here without the brain.',fact:'It is protected inside the backbone (vertebrae).'},
 lungs:{n:'Lungs',am:'ሳንባ',sys:'Respiratory system',does:'Take oxygen from the air into the blood and remove carbon dioxide. Gas exchange happens in millions of tiny air sacs called alveoli.',fact:'Spread out flat, the alveoli would cover about half a tennis court.'},
 heart:{n:'Heart',am:'ልብ',sys:'Circulatory system',does:'A muscular pump with four chambers. It pushes blood around the body, carrying oxygen and food to every cell.',fact:'It beats about 100,000 times a day.'},
 liver:{n:'Liver',am:'ጉበት',sys:'Digestive system',does:'Makes bile to help digest fats, stores glucose, and cleans harmful substances out of the blood.',fact:'It is the largest organ inside the body and can regrow if part is removed.'},
 stomach:{n:'Stomach',am:'ጨጓራ',sys:'Digestive system',does:'Churns food with acid and enzymes to start breaking down proteins.',fact:'Stomach acid has a pH of about 1.5 to 3.5.'},
 intestines:{n:'Intestines',am:'አንጀት',sys:'Digestive system',does:'The small intestine absorbs nutrients into the blood. The large intestine absorbs water.',fact:'The small intestine is about 6 metres long.'},
 kidneys:{n:'Kidneys',am:'ኩላሊት',sys:'Excretory system',does:'Filter waste and extra water out of the blood to make urine.',fact:'They filter about 180 litres of blood plasma every day.'},
 bladder:{n:'Bladder',am:'ፊኛ',sys:'Excretory system',does:'Stores urine made by the kidneys until it leaves the body.',fact:'An adult bladder holds about 400 to 600 ml.'}
};
const SYS=[['circ','Circulatory (blood)','#e5483a'],['resp','Respiratory (breathing)','#3d6fe6'],['dig','Digestive (food)','#c98a00'],['nerv','Nervous (signals)','#7a4fd6']];
SIMS.push({id:'body-explorer',subject:'biology',title:'Human body explorer',level:'Grade 9–10',blurb:'Click the organs to learn what they do, and switch on body systems to watch blood flow, breathing, digestion and nerve signals.',mount(el){
 el.innerHTML=`<div class="split"><div class="fig bodyfig"><svg viewBox="0 0 300 460" class="body" role="img" aria-label="Human body with organs">
  <defs><radialGradient id="skin" cx="50%" cy="35%"><stop offset="0" stop-color="#e8b48a"/><stop offset="1" stop-color="#c98d63"/></radialGradient></defs>
  <g class="sil" fill="url(#skin)" opacity=".55"><circle cx="150" cy="48" r="34"/><rect x="138" y="78" width="24" height="18"/><path d="M95 98 Q150 86 205 98 L215 250 Q150 270 85 250Z"/><path d="M95 100 L60 230 L74 236 L108 130Z"/><path d="M205 100 L240 230 L226 236 L192 130Z"/><path d="M95 248 L108 440 L136 440 L146 262Z"/><path d="M205 248 L192 440 L164 440 L154 262Z"/></g>
  <g class="nerv"><path d="M150 70 L150 250" stroke="#7a4fd6" stroke-width="5" fill="none"/><path d="M150 120 L80 220 M150 120 L220 220 M150 250 L122 430 M150 250 L178 430" stroke="#7a4fd6" stroke-width="1.6" fill="none" opacity=".7"/><g class="pulses"></g></g>
  <g class="dig"><path class="tract" d="M150 72 L150 150 Q170 156 178 166 Q196 182 178 196 Q160 204 150 196 Q120 200 118 214 Q120 230 150 226 Q182 222 182 238 Q180 252 150 250 Q122 252 124 238" stroke="#c98a00" stroke-width="3" fill="none" opacity=".5"/><circle class="bolus" r="5" fill="#c98a00"/></g>
  <g class="circ"><path class="artery" d="M158 150 L158 120 Q190 110 214 180 L228 228 M158 120 Q120 110 86 180 L72 228 M158 150 L160 250 L182 430 M160 250 L120 430" stroke="#e5483a" stroke-width="2.4" fill="none" opacity=".6"/><g class="blood"></g></g>
  <g class="org" data-o="brain"><path d="M122 40 Q124 18 150 16 Q178 18 178 40 Q180 58 150 60 Q120 58 122 40Z" fill="#f3a6b8" stroke="#c46a82"/><path d="M135 30 Q145 36 140 46 M160 26 Q152 36 162 46" stroke="#c46a82" fill="none"/></g>
  <g class="org" data-o="spine"><rect x="146" y="70" width="8" height="10" fill="#7a4fd6" opacity="0"/></g>
  <g class="org lungs" data-o="lungs"><path class="lL" d="M140 108 Q112 106 108 150 Q106 182 138 178Z" fill="#f5b3c0" stroke="#c46a82"/><path class="lR" d="M160 108 Q188 106 192 150 Q194 182 162 178Z" fill="#f5b3c0" stroke="#c46a82"/></g>
  <g class="org" data-o="heart"><path class="hrt" d="M158 142 C150 130 136 136 140 150 C142 160 156 168 162 174 C168 166 180 158 180 148 C180 136 166 132 158 142Z" fill="#d7263d" stroke="#8c1424"/></g>
  <g class="org" data-o="liver"><path d="M104 182 Q140 172 156 186 Q150 204 108 206Z" fill="#8b3a2b" stroke="#5c2419"/></g>
  <g class="org" data-o="stomach"><path d="M160 180 Q190 172 196 192 Q194 214 172 210 Q160 206 160 196Z" fill="#e8a2a0" stroke="#b0605c"/></g>
  <g class="org" data-o="intestines"><path d="M124 214 Q150 206 176 214 Q186 232 174 246 Q150 256 126 246 Q114 232 124 214Z" fill="#e7b58f" stroke="#b07c55"/><path d="M130 224 Q150 218 170 226 M130 236 Q150 230 170 238" stroke="#b07c55" fill="none"/></g>
  <g class="org" data-o="kidneys"><ellipse cx="128" cy="204" rx="7" ry="11" fill="#9b2f3f" opacity=".85"/><ellipse cx="172" cy="204" rx="7" ry="11" fill="#9b2f3f" opacity=".85"/></g>
  <g class="org" data-o="bladder"><ellipse cx="150" cy="262" rx="12" ry="9" fill="#f2d24b" stroke="#b39516"/></g>
  <g class="lbl" font-size="9" font-family="Lexend,sans-serif" fill="currentColor"></g>
 </svg></div><div class="panel">
  <div class="chips sys">${SYS.map(([k,n])=>`<button data-s="${k}" class="on">${n}</button>`).join('')}</div>
  ${slider('bpm','Heart rate',50,180,1,72,' beats/min')}${slider('br','Breathing rate',8,40,1,14,' breaths/min')}
  <div class="row"><button class="btn ghost run">Exercise!</button><button class="btn ghost eat">Eat food</button><label class="check"><input type="checkbox" class="labels" checked> Labels</label></div>
  <div class="out info" aria-live="polite"><p class="eq">Click an organ</p><p>Each organ belongs to a body system. Systems work together: when you exercise, your heart and breathing both speed up to bring more oxygen to your muscles.</p></div></div></div>`;
 const svg=$('svg',el),g=k=>+$('.'+k,el).value,show={circ:1,resp:1,dig:1,nerv:1};
 const LBL=[['brain',186,30],['lungs',196,122],['heart',186,152],['liver',62,190],['stomach',202,190],['intestines',190,244],['kidneys',62,212],['bladder',172,272],['spine',158,92]];
 const drawLabels=()=>{svg.querySelector('.lbl').innerHTML=$('.labels',el).checked?LBL.map(([k,x,y])=>`<text x="${x}" y="${y}" ${x<100?'text-anchor="start"':''}>${ORG[k].n}</text>`).join(''):''};
 drawLabels();$('.labels',el).onchange=drawLabels;
 el.querySelectorAll('.sys button').forEach(b=>b.onclick=()=>{show[b.dataset.s]=!show[b.dataset.s];b.classList.toggle('on',!!show[b.dataset.s]);markTried('body-explorer')});
 ['bpm','br'].forEach(k=>$('.'+k,el).oninput=()=>$('.'+k+'v',el).textContent=g(k)+(k==='bpm'?' beats/min':' breaths/min'));
 let exercise=0;$('.run',el).onclick=()=>{exercise=8;markTried('body-explorer')};
 let bolus=-1;$('.eat',el).onclick=()=>{bolus=0;markTried('body-explorer')};
 el.querySelectorAll('.org').forEach(o=>{o.style.cursor='pointer';o.onclick=()=>{const d=ORG[o.dataset.o];el.querySelectorAll('.org').forEach(x=>x.classList.toggle('sel',x===o));
  $('.info',el).innerHTML=`<p class="eq">${d.n} <span class="muted">· ${d.am}</span></p><p><span class="tag">${d.sys}</span></p><p>${d.does}</p><p><b>Did you know?</b> ${d.fact}</p>`;markTried('body-explorer')}});
 const tract=svg.querySelector('.tract'),tl=tract.getTotalLength?tract.getTotalLength():400,art=svg.querySelector('.artery'),al=art.getTotalLength?art.getTotalLength():600;
 const drops=Array.from({length:18},(_,i)=>i/18);let t=0,pulses=[],ptimer=0;
 return{frame(dt){t+=dt;
  if(exercise>0){exercise-=dt;$('.bpm',el).value=Math.min(160,g('bpm')+dt*30);$('.br',el).value=Math.min(34,g('br')+dt*6)}
  else if(g('bpm')>72&&exercise>-20){exercise-=dt;if(exercise<-3){$('.bpm',el).value=Math.max(72,g('bpm')-dt*8);$('.br',el).value=Math.max(14,g('br')-dt*2)}}
  $('.bpmv',el).textContent=Math.round(g('bpm'))+' beats/min';$('.brv',el).textContent=Math.round(g('br'))+' breaths/min';
  const beat=(t*g('bpm')/60)%1,sq=beat<.15?1-Math.sin(beat/.15*Math.PI)*.12:1;
  svg.querySelector('.hrt').setAttribute('transform',`translate(160 155) scale(${sq}) translate(-160 -155)`);
  const breath=.5-.5*Math.cos(t*g('br')/60*2*Math.PI),ls=show.resp?0.92+breath*.14:1;
  svg.querySelector('.lungs').setAttribute('transform',`translate(150 145) scale(${ls} ${0.95+breath*.07*(show.resp?1:0)}) translate(-150 -145)`);
  ['circ','dig','nerv'].forEach(k=>svg.querySelector('.'+k).style.display=show[k]?'':'none');
  if(show.circ&&art.getPointAtLength){const sp=g('bpm')/60*0.12;svg.querySelector('.blood').innerHTML=drops.map((d,i)=>{const f=(d+t*sp)%1,p=art.getPointAtLength(f*al);return`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.6" fill="${i%3?'#e5483a':'#3d6fe6'}"/>`}).join('')}
  const bl=svg.querySelector('.bolus');if(bolus>=0&&tract.getPointAtLength){bolus+=dt*0.08;if(bolus>1)bolus=-1;const p=tract.getPointAtLength(Math.min(1,bolus)*tl);bl.setAttribute('cx',p.x);bl.setAttribute('cy',p.y);bl.style.display=''}else bl.style.display='none';
  if(show.nerv){ptimer-=dt;if(ptimer<0){ptimer=.35;pulses.push({y:70,side:Math.random()<.5?-1:1})}pulses=pulses.filter(p=>(p.y+=dt*160)<430);
   svg.querySelector('.pulses').innerHTML=pulses.map(p=>{const y=p.y,x=y<250?150:150+p.side*(y-250)*0.15;return`<circle cx="${x}" cy="${y}" r="3" fill="#b79cff"/>`}).join('')}
 }}}});
})();
