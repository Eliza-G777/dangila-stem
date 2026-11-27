/* Chemistry: Ph — one simulation. Copy this file to make a new one. */
(()=>{
const {$,clamp,lerp,fit,slider,markTried,SIMS,T}=STEM;
const PHC=['#e0261c','#ec4a20','#f47a22','#f9a825','#fcc729','#f2e130','#bfe03a','#5cbd4a','#2aa66a','#1f9d9a','#2a7fc9','#3c58b8','#5a3fa8','#6b2f98','#5c2184'];
const PHS=[['Stomach acid',1.5],['Lemon juice',2.2],['Vinegar',2.9],['Tomato',4.3],['Black coffee',5],['Milk',6.6],['Pure water',7],['Blood',7.4],['Baking soda',8.4],['Soap',10],['Ammonia cleaner',11.5],['Bleach',12.6]];
SIMS.push({id:'ph-scale',subject:'chemistry',title:'pH and indicators',level:'Grade 9',blurb:'Test everyday substances with universal indicator and see how acidic or alkaline they are.',mount(el){
 el.innerHTML=`<div class="split"><div class="panel"><div class="tube"><div class="tf"></div></div>
 <div class="phscale">${PHC.map((c,i)=>`<span style="background:${c};color:${i>9?'#fff':'#141a2c'}">${i}</span>`).join('')}</div>
 <div class="ph-big"><span class="pv">7</span></div><div class="out pr" aria-live="polite"></div></div>
 <div class="panel">${slider('ph','pH value',0,14,.1,7)}<div class="chips">${PHS.map(s=>`<button data-v="${s[1]}">${s[0]}</button>`).join('')}</div>
 <p class="note">Each step down the scale means 10 times more hydrogen ions (H⁺).</p></div></div>`;
 const sl=$('.ph',el);
 const show=v=>{v=+v;const i=Math.round(v);$('.tf',el).style.background=PHC[clamp(i,0,14)];$('.pv',el).textContent='pH '+v.toFixed(1);$('.phv',el).textContent=v.toFixed(1);
  const k=v<6.5?'Acidic':v>7.5?'Alkaline (basic)':'Neutral',f=Math.pow(10,Math.abs(7-v));
  $('.pr',el).innerHTML=`<p class="eq">${k}</p><p>${v<6.5?`About ${f>=100?Math.round(f).toLocaleString():f.toFixed(1)} times more H⁺ ions than pure water.`:v>7.5?`About ${f>=100?Math.round(f).toLocaleString():f.toFixed(1)} times fewer H⁺ ions than pure water.`:'Hydrogen and hydroxide ions are balanced.'}</p><p>Universal indicator turns <b>${v<3?'red':v<5?'orange':v<6.5?'yellow':v<7.5?'green':v<10?'blue':'purple'}</b>.</p>`;
  el.querySelectorAll('.chips button').forEach(b=>b.classList.toggle('on',+b.dataset.v===v))};
 sl.oninput=()=>{show(sl.value);markTried('ph-scale')};
 el.querySelectorAll('.chips button').forEach(b=>b.onclick=()=>{sl.value=b.dataset.v;show(b.dataset.v);markTried('ph-scale')});show(7);return{}}});
})();
