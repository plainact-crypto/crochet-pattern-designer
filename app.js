const defs=[['chain','Chain','ch'],['slip','Slip Stitch','sl st'],['single','Single Crochet','sc'],['half','Half Double Crochet','hdc'],['double','Double Crochet','dc'],['treble','Treble Crochet','tr'],['dtr','Double Treble Crochet','dtr'],['picot','Picot','picot'],['puff','Puff Stitch','puff'],['cluster','Cluster','cl'],['shell','Shell','shell'],['ring','Magic Ring','MR']].map(([id,name,abbr])=>({id,name,abbr}));
const board=document.getElementById('board');
const boardWrap=document.getElementById('boardWrap');
const emptyHint=document.getElementById('emptyHint');
const MIN_ZOOM=1,MAX_ZOOM=3,SYMBOL_SIZE=46;
let items=[],selected=null,history=[],currentRow=0,currentCol=0,placementRotation=0,zoom=1;
function line(a,b,c,d){return `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`}
function svgFor(type,size,color='#111'){
 const s=size,sw=Math.max(1.8,size/19);let b='';
 if(type==='chain')b=`<ellipse cx="${s/2}" cy="${s/2}" rx="${s*.34}" ry="${s*.14}"/>`;
 if(type==='slip')b=`<circle cx="${s/2}" cy="${s/2}" r="${s*.1}" fill="${color}"/>`;
 if(type==='single')b=line(s*.25,s*.25,s*.75,s*.75)+line(s*.75,s*.25,s*.25,s*.75);
 if(type==='half')b=line(s*.5,s*.1,s*.5,s*.9)+line(s*.27,s*.35,s*.73,s*.35);
 if(type==='double')b=line(s*.5,s*.08,s*.5,s*.92)+line(s*.27,s*.30,s*.73,s*.30)+line(s*.30,s*.55,s*.70,s*.40);
 if(type==='treble')b=line(s*.5,s*.05,s*.5,s*.95)+line(s*.27,s*.25,s*.73,s*.25)+line(s*.30,s*.50,s*.70,s*.36)+line(s*.30,s*.66,s*.70,s*.52);
 if(type==='dtr')b=line(s*.5,s*.04,s*.5,s*.96)+line(s*.25,s*.22,s*.75,s*.22)+line(s*.30,s*.44,s*.70,s*.32)+line(s*.30,s*.59,s*.70,s*.47)+line(s*.30,s*.74,s*.70,s*.62);
 if(type==='picot')b=`<circle cx="${s/2}" cy="${s*.28}" r="${s*.12}"/>${line(s*.5,s*.40,s*.5,s*.88)}`;
 if(type==='ring')b=`<circle cx="${s/2}" cy="${s/2}" r="${s*.30}"/>`;
 if(type==='puff')b=[.32,.42,.5,.58,.68].map(x=>`<path d="M ${s*.5} ${s*.84} Q ${s*x} ${s*.35} ${s*.5} ${s*.16}"/>`).join('');
 if(type==='cluster')b=[.34,.5,.66].map(x=>`<path d="M ${s*.5} ${s*.86} Q ${s*x} ${s*.48} ${s*.5} ${s*.16}"/>`).join('')+`<circle cx="${s*.5}" cy="${s*.16}" r="${s*.06}"/>`;
 if(type==='shell')b=[.2,.35,.5,.65,.8].map(x=>`<path d="M ${s*.5} ${s*.86} Q ${s*x} ${s*.48} ${s*x} ${s*.18}"/>`).join('');
 return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
}
function snapshot(){history.push(JSON.stringify({items,currentRow,currentCol}));if(history.length>20)history.shift()}
function applyZoom(nextZoom){zoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,Number(nextZoom)||1));if(board)board.style.zoom=zoom;const z=document.getElementById('zoomReadout');if(z)z.textContent=Math.round(zoom*100)+'%'}
function render(){
 if(!board)return;
 board.querySelectorAll('.placed').forEach(n=>n.remove());
 if(emptyHint)emptyHint.hidden=items.length>0;
 for(const it of items){const e=document.createElement('div');e.className='placed';e.style.position='absolute';e.style.left=(it.x||50)+'%';e.style.top=(it.y||500)+'px';e.style.transform=`translate(-50%,-50%) rotate(${it.rotation||0}deg)`;e.style.display='grid';e.style.placeItems='center';e.innerHTML=svgFor(it.type,SYMBOL_SIZE);board.appendChild(e)}
}
if(boardWrap){boardWrap.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();applyZoom(zoom+(e.deltaY<0?.1:-.1))},{passive:false})}
applyZoom(1);render();
window.getCrochetBoardItems=()=>items;
window.getCrochetBoardState=()=>({items,currentRow,currentCol,zoom});
window.setCrochetZoom=applyZoom;
