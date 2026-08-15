const defs=[
['chain','Chain','ch'],['slip','Slip Stitch','sl st'],['single','Single Crochet','sc'],['half','Half Double Crochet','hdc'],['double','Double Crochet','dc'],['treble','Treble Crochet','tr'],['dtr','Double Treble Crochet','dtr'],['picot','Picot','picot'],['puff','Puff Stitch','puff'],['cluster','Cluster','cl'],['shell','Shell','shell'],['ring','Magic Ring','MR']
].map(([id,name,abbr])=>({id,name,abbr}));

const board=document.getElementById('board');
const boardWrap=document.getElementById('boardWrap');
const stitchSelect=document.getElementById('stitchSelect');
const directionSelect=document.getElementById('directionSelect');
const placeBtn=document.getElementById('placeBtn');
const newRowBtn=document.getElementById('newRowBtn');
const rotateBtn=document.getElementById('rotateBtn');
const deleteBtn=document.getElementById('deleteBtn');
const undoBtn=document.getElementById('undoBtn');
const clearBtn=document.getElementById('clearBtn');
const emptyHint=document.getElementById('emptyHint');
const rowStatus=document.getElementById('rowStatus');
const selectedStatus=document.getElementById('selectedStatus');
const zoomInBtn=document.getElementById('zoomInBtn');
const zoomOutBtn=document.getElementById('zoomOutBtn');
const zoomResetBtn=document.getElementById('zoomResetBtn');
const quickPlaceBtn=document.getElementById('quickPlaceBtn');
const quickUndoBtn=document.getElementById('quickUndoBtn');
const quickDeleteBtn=document.getElementById('quickDeleteBtn');
const quickRotateBtn=document.getElementById('quickRotateBtn');

const SYMBOL_SIZE=46,MIN_ZOOM=.5,MAX_ZOOM=3,STEP_PX=58,PATH_GAP=110,BASE_Y=170;
const vectors={e:[1,0],se:[1,1],s:[0,1],sw:[-1,1],w:[-1,0],nw:[-1,-1],n:[0,-1],ne:[1,-1]};
let items=[],selected=null,history=[],currentRow=0,currentCol=0,placementRotation=0,zoom=1,pinchStartDistance=null,pinchStartZoom=1,lastPointerAction=0;

function makeId(){try{if(globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')return globalThis.crypto.randomUUID();}catch(e){}return 'stitch-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
function line(a,b,c,d){return `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`}
function svgFor(type,size,color='#171717'){
  const s=size,sw=Math.max(1.7,size/20);let b='';
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

function snapshot(){history.push(JSON.stringify({items,currentRow,currentCol,placementRotation}));if(history.length>80)history.shift()}
function ensureBoardHeight(){const maxY=Math.max(BASE_Y+currentRow*PATH_GAP,...items.map(i=>i.y||0),0);board.style.minHeight=Math.max(window.innerHeight-190,maxY+180)+'px'}
function applyZoom(nextZoom){zoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,nextZoom));board.style.zoom=zoom;zoomResetBtn.textContent=Math.round(zoom*100)+'%'}
function zoomAround(nextZoom,clientX,clientY){const oldZoom=zoom,rect=boardWrap.getBoundingClientRect(),cx=clientX??(rect.left+rect.width/2),cy=clientY??(rect.top+rect.height/2),localX=cx-rect.left+boardWrap.scrollLeft,localY=cy-rect.top+boardWrap.scrollTop;applyZoom(nextZoom);const ratio=zoom/oldZoom;boardWrap.scrollLeft=Math.max(0,localX*ratio-(cx-rect.left));boardWrap.scrollTop=Math.max(0,localY*ratio-(cy-rect.top))}
function anchorForPath(){const pathItems=items.filter(i=>i.row===currentRow);if(selected){const s=items.find(i=>i.id===selected);if(s&&s.row===currentRow)return s}return pathItems[pathItems.length-1]||null}
function firstPosition(){return{x:50,y:BASE_Y+(currentRow*PATH_GAP)}}
function nextPosition(){const anchor=anchorForPath();if(!anchor)return firstPosition();const [vx,vy]=vectors[directionSelect.value]||vectors.e;const width=Math.max(board.clientWidth,320),dxPct=(STEP_PX/width)*100;let x=anchor.x+(vx*dxPct),y=anchor.y+(vy*STEP_PX);x=Math.max(4,Math.min(96,x));y=Math.max(44,y);return{x,y}}

function render(){
  board.querySelectorAll('.placed,.path-guide').forEach(n=>n.remove());emptyHint.style.display=items.length?'none':'flex';
  const pathYs=[...new Set(items.map(i=>i.row))];for(const r of pathYs){const first=items.find(i=>i.row===r);if(!first)continue;const g=document.createElement('div');g.className='path-guide';g.style.top=first.y+'px';board.appendChild(g)}
  for(const it of items){const e=document.createElement('div');e.className='placed'+(selected===it.id?' selected':'');e.style.left=it.x+'%';e.style.top=it.y+'px';e.style.transform=`translate(-50%,-50%) rotate(${it.rotation||0}deg)`;e.innerHTML=svgFor(it.type,SYMBOL_SIZE);e.addEventListener('click',ev=>{ev.stopPropagation();selected=it.id;render()});board.appendChild(e)}
  const count=items.filter(i=>i.row===currentRow).length;rowStatus.textContent=`Path ${currentRow+1} · ${count} stitch${count===1?'':'es'}`;const sel=items.find(i=>i.id===selected);selectedStatus.textContent=sel?`${defs.find(d=>d.id===sel.type)?.name||sel.type} selected`:`Rotation ${placementRotation}°`;rotateBtn.textContent=`Rotate ${placementRotation}°`;ensureBoardHeight()
}
function place(){snapshot();const type=stitchSelect.value||'chain',pos=nextPosition(),item={id:makeId(),type,row:currentRow,col:currentCol,x:pos.x,y:pos.y,rotation:placementRotation,direction:directionSelect.value};items.push(item);selected=item.id;currentCol++;render();selectedStatus.textContent=`Placed ${defs.find(d=>d.id===type)?.name||type} ${directionSelect.options[directionSelect.selectedIndex]?.text||''}`}
function nextRow(makeSnapshot=true){if(makeSnapshot)snapshot();currentRow++;currentCol=0;selected=null;render()}
function rotate(){placementRotation=(placementRotation+45)%360;const it=items.find(i=>i.id===selected);if(it){snapshot();it.rotation=(it.rotation+45)%360}render()}
function removeSelected(){if(!items.length)return;snapshot();if(selected){items=items.filter(i=>i.id!==selected);selected=null}else items.pop();currentCol=items.filter(i=>i.row===currentRow).length;render()}
function undo(){if(!history.length)return;const prev=JSON.parse(history.pop());items=prev.items||[];currentRow=prev.currentRow||0;currentCol=prev.currentCol||0;placementRotation=prev.placementRotation||0;selected=null;render()}
function bindTap(el,fn){if(!el)return;el.addEventListener('pointerup',e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();lastPointerAction=Date.now();fn()}});el.addEventListener('click',e=>{if(Date.now()-lastPointerAction<500)return;e.preventDefault();fn()})}
bindTap(placeBtn,place);bindTap(quickPlaceBtn,place);bindTap(newRowBtn,()=>nextRow(true));bindTap(rotateBtn,rotate);bindTap(quickRotateBtn,rotate);bindTap(deleteBtn,removeSelected);bindTap(quickDeleteBtn,removeSelected);bindTap(undoBtn,undo);bindTap(quickUndoBtn,undo);bindTap(clearBtn,()=>{if(!items.length)return;if(!confirm('Clear the whole board?'))return;snapshot();items=[];selected=null;currentRow=0;currentCol=0;placementRotation=0;render()});bindTap(zoomInBtn,()=>zoomAround(zoom+.15));bindTap(zoomOutBtn,()=>zoomAround(zoom-.15));bindTap(zoomResetBtn,()=>zoomAround(1));
function touchDistance(touches){const a=touches[0],b=touches[1];return Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY)}
function touchMidpoint(touches){return{x:(touches[0].clientX+touches[1].clientX)/2,y:(touches[0].clientY+touches[1].clientY)/2}}
boardWrap.addEventListener('touchstart',e=>{if(e.touches.length===2){pinchStartDistance=touchDistance(e.touches);pinchStartZoom=zoom;e.preventDefault()}},{passive:false});boardWrap.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinchStartDistance){const mid=touchMidpoint(e.touches),ratio=touchDistance(e.touches)/pinchStartDistance;zoomAround(pinchStartZoom*ratio,mid.x,mid.y);e.preventDefault()}},{passive:false});boardWrap.addEventListener('touchend',e=>{if(e.touches.length<2)pinchStartDistance=null});board.addEventListener('click',()=>{selected=null;render()});window.addEventListener('resize',ensureBoardHeight);applyZoom(1);render();

// Explicit diagnostic accessors. Keep board state owned by this module; diagnostics read it through functions.
window.getCrochetBoardItems=()=>items;
window.getCrochetBoardState=()=>({items,currentRow,currentCol,placementRotation,zoom});