/* Biology: animal and plant cell explorer — click organelles to learn what they do. */
(()=>{
const {$,markTried,SIMS}=STEM;
const INFO={
 membrane:['Cell membrane','A thin, flexible layer that controls what goes in and out of the cell.','both'],
 wall:['Cell wall','A strong outer layer made of cellulose. It supports the plant cell and keeps its shape.','plant'],
 nucleus:['Nucleus','Contains DNA, the instructions for the cell. It controls the cell’s activities.','both'],
 mito:['Mitochondria','Release energy from glucose by respiration. Busy cells such as muscle cells have many.','both'],
 ribo:['Ribosomes','Tiny structures where proteins are made.','both'],
 er:['Endoplasmic reticulum','A network of folded membranes that transports materials. Rough ER has ribosomes on it.','both'],
 golgi:['Golgi apparatus','Packages and sends out proteins made by the cell.','both'],
 chloro:['Chloroplasts','Contain green chlorophyll and carry out photosynthesis, making glucose from light, water and carbon dioxide.','plant'],
 vacuole:['Vacuole','In plants, a large space filled with cell sap that keeps the cell firm.','plant'],
 cyto:['Cytoplasm','A jelly-like liquid where most chemical reactions happen.','both']
};
SIMS.push({id:'cell-explorer',subject:'biology',title:'Cell explorer: animal and plant cells',level:'Grade 9',blurb:'Compare an animal cell with a plant cell. Click each part to find out what it does.',mount(el){
 el.innerHTML=`<div class="split"><div class="fig bodyfig"><svg viewBox="0 0 400 300" class="cell" role="img" aria-label="Cell diagram"></svg></div><div class="panel">
 <div class="chips kind"><button data-k="animal" class="on">Animal cell</button><button data-k="plant">Plant cell</button></div>
 <label class="check"><input type="checkbox" class="labels" checked> Labels</label>
 <div class="out info" aria-live="polite"><p class="eq">Click a part of the cell</p><p>Both cells have a nucleus, cytoplasm, membrane, mitochondria and ribosomes. Only plant cells have a cell wall, chloroplasts and a large vacuole.</p></div>
 <div class="out quizq"></div></div></div>`;
 let kind='animal',t=0,dots=[];const svg=$('svg',el);
 for(let i=0;i<40;i++)dots.push({a:Math.random()*7,r:40+Math.random()*90,s:.2+Math.random()*.3});
 const draw=()=>{const P=kind==='plant',lab=$('.labels',el).checked;
  const outer=P?'<rect class="part" data-p="wall" x="20" y="20" width="360" height="260" rx="16" fill="#9bd18f" stroke="#3f7a35" stroke-width="10"/><rect class="part" data-p="membrane" x="32" y="32" width="336" height="236" rx="10" fill="#e9f6dc" stroke="#6aa85d" stroke-width="3"/>':'<path class="part" data-p="membrane" d="M60 150 Q50 50 190 40 Q350 30 350 140 Q360 260 210 262 Q60 270 60 150Z" fill="#fbe3d6" stroke="#d98b6b" stroke-width="4"/>';
  svg.innerHTML=`${outer}<g class="cytodots"></g>
   ${P?'<rect class="part" data-p="vacuole" x="150" y="70" width="160" height="150" rx="40" fill="#cde8f7" stroke="#6fa8c9" stroke-width="2"/>':''}
   <g class="part" data-p="nucleus"><circle cx="${P?95:190}" cy="${P?95:150}" r="${P?34:42}" fill="#b49ad8" stroke="#6d4fa1" stroke-width="3"/><circle cx="${P?102:198}" cy="${P?90:142}" r="${P?10:13}" fill="#6d4fa1"/></g>
   <g class="part" data-p="er"><path d="M${P?70:120} ${P?150:205} q20 -12 40 0 t40 0 M${P?70:120} ${P?162:217} q20 -12 40 0 t40 0" stroke="#d98bb0" stroke-width="5" fill="none"/></g>
   <g class="part" data-p="golgi"><path d="M${P?320:270} ${P?235:90} q-25 -10 -50 0 M${P?320:270} ${P?245:100} q-25 -10 -50 0 M${P?320:270} ${P?255:110} q-25 -10 -50 0" stroke="#e6a23c" stroke-width="5" fill="none"/></g>
   ${[[P?80:110,P?235:100],[P?110:280,P?250:200],[P?330:250,P?60:235]].map(([x,y],i)=>`<g class="part mito" data-p="mito" transform="translate(${x} ${y}) rotate(${i*40})"><ellipse rx="20" ry="9" fill="#f08a5d" stroke="#b4532a" stroke-width="2"/><path d="M-14 0 q4 -6 8 0 t8 0 t8 0" stroke="#b4532a" fill="none"/></g>`).join('')}
   ${P?[[60,215],[330,120],[200,245],[330,190]].map(([x,y])=>`<g class="part chl" data-p="chloro" transform="translate(${x} ${y})"><ellipse rx="18" ry="10" fill="#3fa34d" stroke="#1f6b2b" stroke-width="2"/><path d="M-10 -3 h20 M-10 2 h20" stroke="#1f6b2b"/></g>`).join(''):''}
   <g class="part" data-p="ribo">${Array.from({length:14},(_,i)=>`<circle cx="${(P?60:100)+((i*53)%(P?260:200))}" cy="${(P?60:80)+((i*37)%(P?180:140))}" r="3" fill="#3d4a7a"/>`).join('')}</g>
   <rect class="part" data-p="cyto" x="0" y="0" width="0" height="0"/>
   ${lab?`<g font-family="Lexend,sans-serif" font-size="11" fill="currentColor">${(P?[['Cell wall',22,14],['Nucleus',70,52],['Vacuole',205,64],['Chloroplast',300,108],['Mitochondrion',40,262],['Golgi',265,228],['ER',72,142],['Cell membrane',260,292]]:[['Nucleus',165,100],['Mitochondrion',70,82],['Golgi',230,76],['ER',125,196],['Ribosomes',255,165],['Cell membrane',290,40]]).map(([n,x,y])=>`<text x="${x}" y="${y}">${n}</text>`).join('')}</g>`:''}`;
  svg.querySelectorAll('.part').forEach(p=>{p.style.cursor='pointer';p.addEventListener('click',e=>{e.stopPropagation();const k=p.dataset.p,d=INFO[k];
   svg.querySelectorAll('.part').forEach(x=>x.classList.toggle('sel',x.dataset.p===k));
   $('.info',el).innerHTML=`<p class="eq">${d[0]}</p><p><span class="tag">${d[2]==='plant'?'Plant cells only':'Animal and plant cells'}</span></p><p>${d[1]}</p>`;markTried('cell-explorer')})});
  svg.onclick=()=>{$('.info',el).innerHTML=`<p class="eq">${INFO.cyto[0]}</p><p>${INFO.cyto[1]}</p>`};
 };
 el.querySelectorAll('.kind button').forEach(b=>b.onclick=()=>{kind=b.dataset.k;el.querySelectorAll('.kind button').forEach(x=>x.classList.toggle('on',x===b));draw();markTried('cell-explorer');ask()});
 $('.labels',el).onchange=draw;
 const QS=[['Which part carries out photosynthesis?','chloro'],['Which part controls the cell and holds the DNA?','nucleus'],['Where is energy released by respiration?','mito'],['Which part do only plant cells have to keep their shape?','wall']];
 let qi=0;const ask=()=>{const q=QS[qi%QS.length];$('.quizq',el).innerHTML=`<p><b>Quick quiz:</b> ${q[0]} <button class="linkbtn rev">Show answer</button></p>`;$('.rev',el).onclick=()=>{$('.quizq',el).innerHTML=`<p><b>Answer:</b> ${INFO[q[1]][0]}. <button class="linkbtn nx">Next question</button></p>`;$('.nx',el).onclick=()=>{qi++;ask()}}};
 draw();ask();
 return{frame(dt){t+=dt;const P=kind==='plant',cx=P?200:205,cy=150,g=svg.querySelector('.cytodots');if(!g)return;
  g.innerHTML=dots.map(d=>{const a=d.a+t*d.s,x=cx+Math.cos(a)*d.r*(P?1.3:1),y=cy+Math.sin(a)*d.r*.75;return`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="${P?'#7fbf6e':'#e3a98c'}" opacity=".6"/>`}).join('');
  svg.querySelectorAll('.mito').forEach((m,i)=>{const tr=m.getAttribute('transform').replace(/ rotate\([^)]*\)/,'');m.setAttribute('transform',tr+` rotate(${i*40+Math.sin(t*1.5+i)*8})`)});
 }}}});
})();
