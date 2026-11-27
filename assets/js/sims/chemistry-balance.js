/* Chemistry: balancing equations — count the atoms on each side until they match. */
(()=>{
const {$,markTried,SIMS}=STEM;
const COL={H:'#f2f2f2',O:'#e5483a',C:'#333a46',N:'#3d6fe6',Cl:'#2c9a59',Na:'#8e6fd8',Fe:'#c06a2b',Al:'#9aa3ba',Mg:'#5fb3a1',S:'#e9c300',Ca:'#7fa650',K:'#b07bd8'};
const RX=[
 [['H2','O2'],['H2O'],[2,1,2],'Hydrogen burns in oxygen to make water.'],
 [['N2','H2'],['NH3'],[1,3,2],'The Haber process makes ammonia for fertilisers.'],
 [['CH4','O2'],['CO2','H2O'],[1,2,1,2],'Methane (natural gas) burning.'],
 [['Na','Cl2'],['NaCl'],[2,1,2],'Sodium reacts with chlorine to make table salt.'],
 [['Mg','HCl'],['MgCl2','H2'],[1,2,1,1],'A metal reacting with an acid gives a salt and hydrogen.'],
 [['Fe','O2'],['Fe2O3'],[4,3,2],'Iron rusting.'],
 [['C3H8','O2'],['CO2','H2O'],[1,5,3,4],'Propane (bottled gas) burning.'],
 [['Al','O2'],['Al2O3'],[4,3,2],'Aluminium forms a protective oxide layer.'],
 [['CaCO3'],['CaO','CO2'],[1,1,1],'Heating limestone makes lime (thermal decomposition).'],
 [['C6H12O6','O2'],['CO2','H2O'],[1,6,6,6],'Respiration in your cells releases energy from glucose.']
];
const parse=f=>{const out={};f.replace(/([A-Z][a-z]?)(\d*)/g,(_,e,n)=>{out[e]=(out[e]||0)+(+n||1)});return out};
const sub=f=>f.replace(/(\d+)/g,'<sub>$1</sub>');
SIMS.push({id:'balance-equations',subject:'chemistry',title:'Balancing chemical equations',level:'Grade 9–10',blurb:'Atoms are never created or destroyed in a reaction. Change the numbers in front of each formula until every atom is balanced.',mount(el){
 el.innerHTML=`<div class="balance"><div class="row between"><b class="rxn-n"></b><div class="row"><button class="btn ghost sm prev">← Previous</button><button class="btn ghost sm hint">Hint</button><button class="btn sm next">Next reaction →</button></div></div>
  <p class="note rxn-d"></p><div class="eqn" aria-live="polite"></div><div class="mols"></div><div class="atomtable"></div><div class="out res" aria-live="polite"></div><p class="note">Score: <b class="score">0</b> balanced</p></div>`;
 let i=0,co=[],score=0,solved={};
 const load=()=>{const r=RX[i];co=r[2].map(()=>1);$('.rxn-n',el).textContent=`Reaction ${i+1} of ${RX.length}`;$('.rxn-d',el).textContent=r[3];draw()};
 const draw=()=>{const [L,R]=RX[i],all=[...L,...R];
  const side=(arr,off)=>arr.map((f,k)=>`<span class="sp"><span class="stepper"><button class="dn" data-k="${k+off}" aria-label="Fewer ${f}">−</button><b>${co[k+off]}</b><button class="up" data-k="${k+off}" aria-label="More ${f}">+</button></span><span class="fm">${sub(f)}</span></span>`).join('<span class="op">+</span>');
  $('.eqn',el).innerHTML=side(L,0)+'<span class="op arrow">→</span>'+side(R,L.length);
  const count=(arr,off)=>{const t={};arr.forEach((f,k)=>Object.entries(parse(f)).forEach(([e,n])=>t[e]=(t[e]||0)+n*co[k+off]));return t};
  const lc=count(L,0),rc=count(R,L.length),els=[...new Set([...Object.keys(lc),...Object.keys(rc)])];
  const ok=els.every(e=>lc[e]===rc[e]);
  $('.atomtable',el).innerHTML=`<table><thead><tr><th>Atom</th><th class="num">Left</th><th class="num">Right</th><th></th></tr></thead><tbody>${els.map(e=>`<tr><td><span class="atom" style="background:${COL[e]||'#999'}"></span> ${e}</td><td class="num">${lc[e]||0}</td><td class="num">${rc[e]||0}</td><td>${lc[e]===rc[e]?'<span class="badge ok">✓</span>':'<span class="badge bad">✗</span>'}</td></tr>`).join('')}</tbody></table>`;
  const mol=f=>{const a=parse(f);return`<span class="mol">${Object.entries(a).flatMap(([e,n])=>Array(Math.min(n,12)).fill(`<i style="background:${COL[e]||'#999'}" title="${e}"></i>`)).join('')}</span>`};
  const pics=(arr,off)=>arr.map((f,k)=>`<span class="molgrp">${Array(co[k+off]).fill(mol(f)).join('')}</span>`).join('<span class="op">+</span>');
  $('.mols',el).innerHTML=pics(L,0)+'<span class="op arrow">→</span>'+pics(R,L.length);
  const simplest=co.reduce((a,b)=>{let x=a,y=b;while(y){[x,y]=[y,x%y]}return x})===1;
  $('.res',el).innerHTML=ok?`<p class="eq">✓ Balanced!</p><p>${simplest?'Every atom on the left is also on the right. Mass is conserved.':'Balanced, but you can divide all the numbers by the same amount to get the simplest whole numbers.'}</p>`:'<p>Not balanced yet. Find an atom whose numbers do not match, then change the number in front of a formula that contains it.</p>';
  if(ok&&simplest&&!solved[i]){solved[i]=1;score++;$('.score',el).textContent=score;markTried('balance-equations')}
  el.querySelectorAll('.up,.dn').forEach(b=>b.onclick=()=>{const k=+b.dataset.k;co[k]=Math.max(1,Math.min(12,co[k]+(b.classList.contains('up')?1:-1)));draw()});
 };
 $('.next',el).onclick=()=>{i=(i+1)%RX.length;load()};$('.prev',el).onclick=()=>{i=(i-1+RX.length)%RX.length;load()};
 $('.hint',el).onclick=()=>{const ans=RX[i][2],k=co.findIndex((c,j)=>c!==ans[j]);if(k<0)return;const all=[...RX[i][0],...RX[i][1]];$('.res',el).innerHTML=`<p><b>Hint:</b> try ${ans[k]} in front of ${sub(all[k])}.</p>`};
 load();return{}}});
})();
