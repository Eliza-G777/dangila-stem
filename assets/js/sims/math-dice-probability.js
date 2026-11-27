/* Math: Dice Probability — one simulation. Copy this file to make a new one. */
(()=>{
const {$,clamp,lerp,fit,slider,markTried,SIMS,T}=STEM;
SIMS.push({id:'dice-probability',subject:'math',title:'Two dice: probability',level:'Grade 9–11',blurb:'Roll two dice many times. Why is 7 the most common total? Compare results with the theory.',mount(el){
 el.innerHTML=`<div><div class="bars"></div><div class="barlab">${[...Array(11)].map((_,i)=>`<span>${i+2}</span>`).join('')}</div>
 <div class="split" style="margin-top:16px"><div class="out res" aria-live="polite"></div><div class="panel"><div class="row"><button class="btn" data-n="1">Roll once</button><button class="btn" data-n="100">Roll 100</button><button class="btn" data-n="1000">Roll 1,000</button><button class="btn ghost rs">Reset</button></div>
 <p class="note">Bars are your results. Dashed lines are the theory: there are 6 ways out of 36 to make 7, but only 1 way to make 2 or 12.</p></div></div></div>`;
 let cnt=Array(13).fill(0),N=0,last=null;const bars=$('.bars',el);bars.innerHTML=[...Array(11)].map(()=>'<div><span class="b"></span><span class="x"></span></div>').join('');
 const upd=()=>{const cols=bars.children;for(let s=2;s<=12;s++){const e=(6-Math.abs(s-7))/36,o=N?cnt[s]/N:0;cols[s-2].querySelector('.b').style.height=Math.min(100,o/(8/36)*100)+'%';cols[s-2].querySelector('.x').style.bottom=e/(8/36)*100+'%'}
  $('.res',el).innerHTML=`<p class="eq">${N.toLocaleString()} rolls</p>${last?`<p>Last roll: ${last[0]} + ${last[1]} = <b>${last[0]+last[1]}</b></p>`:''}<p>Sevens: ${N?(cnt[7]/N*100).toFixed(1):0}% (theory 16.7%)</p><p>The more you roll, the closer the bars get to the dashed lines. This is the <b>law of large numbers</b>.</p>`};
 el.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{for(let i=0;i<+b.dataset.n;i++){const d1=1+Math.floor(Math.random()*6),d2=1+Math.floor(Math.random()*6);cnt[d1+d2]++;N++;last=[d1,d2]}markTried('dice-probability');upd()});
 $('.rs',el).onclick=()=>{cnt.fill(0);N=0;last=null;upd()};upd();return{}}});
})();
