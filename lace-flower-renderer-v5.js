// Lace Flower Renderer v6 — canonical-sector constrained grid geometry engine.
(()=>{
const CELL=24,TAU=Math.PI*2,SECTORS=5,STEP=TAU/SECTORS,VERSION='v6.0';
if(typeof render!=='function'||typeof board==='undefined'){console.error('lace-v6 bootstrap failed');return;}
window.__LACE_RENDERER_VERSION=VERSION;board.dataset.laceRenderer=VERSION;
const BODY_TYPES=new Set(['chain','single','half','double','treble','dtr','picot','puff','bobble','cluster','shell']);
const JOIN_ROLE=/join$/;
const M=()=>window.CROCHET_STITCH_METRICS||{};
const ROLE_ORDER=['inner-chain','inner-petal-stitch','mid-chain','mid-petal-stitch','outer-chain','outer-petal-stitch','edge-sc'];
const CANONICAL={
 'inner-chain':[[-1,5],[0,6],[1,5]],
 'inner-petal-stitch':[[-4,7],[-3,8],[-2,9],[0,10],[2,9],[3,8],[4,7]],
 'mid-chain':[[-4,12],[-3,13],[-2,14],[0,15],[2,14],[3,13],[4,12]],
 'mid-petal-stitch':[[-8,16],[-7,17],[-6,18],[-4,19],[-2,20],[0,22],[2,20],[4,19],[6,18],[7,17],[8,16]],
 'outer-chain':[[-9,24],[-8,25],[-6,26],[-4,27],[-2,28],[0,29],[2,28],[4,27],[6,26],[8,25],[9,24]],
 'outer-petal-stitch':[[-14,30],[-13,31],[-12,32],[-10,33],[-8,34],[-6,35],[-4,36],[-2,38],[0,41],[2,38],[4,36],[6,35],[8,34],[10,33],[12,32],[13,31],[14,30]],
 'edge-sc':[[-16,44],[-14,45],[-12,46],[-10,47],[-8,48],[-6,49],[-4,50],[-2,51],[-1,53],[0,55],[1,53],[2,51],[4,50],[6,49],[8,48],[10,47],[12,46],[14,45],[16,44]]
};
const CENTER_RING=[0,0],CENTER_SC=[[0,-4],[2,-3],[4,-1],[4,1],[2,3],[0,4],[-2,3],[-4,1],[-4,-1],[-2,-3]];
const q=n=>Math.round(n);
function roleItems(g,role,sector){return g.filter(i=>i.role===role&&(sector==null||i.sector===sector)).sort((a,b)=>(a.orderInPath??0)-(b.orderInPath??0));}
function isBody(i){return BODY_TYPES.has(i?.type)&&!JOIN_ROLE.test(i?.role||'');}
function metric(i){const m=M()[i.type]||{visualWidthPx:18,visualHeightPx:18};return{w:m.visualWidthPx||18,h:m.visualHeightPx||18};}
function setNode(i,c,r,rotation=0){
 i.gridCol=c;i.gridRow=r;i.gridX=c;i.gridY=r;i.xPx=c*CELL;i.yPx=r*CELL;
 i.x=(i.xPx/Math.max(board.clientWidth||2200,1))*100;i.y=i.yPx;i.rotation=rotation;
 i.gridCellPx=CELL;i.coordinateSystem='grid-index';const m=metric(i);i.visualWidth=m.w;i.visualHeight=m.h;
 i.footprint={widthPx:m.w,heightPx:m.h,rotationDeg:rotation,body:isBody(i)};
 if(!Object.prototype.hasOwnProperty.call(i,'workedInto'))i.workedInto=null;
}
function transformed(t,r,a,cx,cy){t*=1.5;r*=1.5;const ux=Math.cos(a),uy=Math.sin(a),tx=-uy,ty=ux;return{x:cx+ux*r+tx*t,y:cy+uy*r+ty*t};}
function sectorRaw(sector,cx,cy){const a=-Math.PI/2+(sector-1)*STEP,roles={};for(const role of ROLE_ORDER)roles[role]=CANONICAL[role].map(([t,r])=>transformed(t,r,a,cx,cy));return{a,roles};}
function snapSector(sector,cx,cy){
 const raw=sectorRaw(sector,cx,cy),phases=[-.45,-.3,-.15,0,.15,.3,.45];let best=null;
 for(const px of phases)for(const py of phases){const snapped={},seen=new Set();let score=0,dupes=0;
   for(const role of ROLE_ORDER){const pts=raw.roles[role];snapped[role]=pts.map(p=>({x:q(p.x+px),y:q(p.y+py)}));for(let k=0;k<pts.length;k++){const sp=snapped[role][k],rp=pts[k];score+=(sp.x-rp.x)**2+(sp.y-rp.y)**2;const kk=`${sp.x},${sp.y}`;if(seen.has(kk))dupes++;seen.add(kk);}for(let k=1;k<pts.length;k++){const rd=Math.hypot(pts[k].x-pts[k-1].x,pts[k].y-pts[k-1].y),sd=Math.hypot(snapped[role][k].x-snapped[role][k-1].x,snapped[role][k].y-snapped[role][k-1].y);score+=(sd-rd)**2*.6;}}
   score+=dupes*10000;if(!best||score<best.score)best={score,snapped,phase:{x:px,y:py}};
 }
 return{a:raw.a,raw:raw.roles,snapped:best.snapped,phase:best.phase};
}
function orientedCorners(i){const m=metric(i),hw=m.w/2+1.5,hh=m.h/2+1.5,a=(i.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=i.gridCol*CELL,cy=i.gridRow*CELL;return[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([x,y])=>({x:cx+x*c-y*s,y:cy+x*s+y*c}));}
function project(poly,axis){let min=Infinity,max=-Infinity;for(const p of poly){const v=p.x*axis.x+p.y*axis.y;min=Math.min(min,v);max=Math.max(max,v)}return{min,max};}
function overlapSAT(a,b){const pa=orientedCorners(a),pb=orientedCorners(b),axes=[];for(const p of [pa,pb])for(let k=0;k<2;k++){const p1=p[k],p2=p[(k+1)%4],dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.hypot(dx,dy)||1;axes.push({x:-dy/len,y:dx/len});}for(const ax of axes){const A=project(pa,ax),B=project(pb,ax);if(A.max<=B.min+.25||B.max<=A.min+.25)return false;}return true;}
function bodyCollisions(g){const b=g.filter(isBody),out=[];for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++){if(overlapSAT(b[i],b[j]))out.push({a:b[i],b:b[j]});}return out;}
function bbox(nodes){if(!nodes.length)return null;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const i of nodes){const m=metric(i),x=i.gridCol,y=i.gridRow,hw=(m.w/2)/CELL,hh=(m.h/2)/CELL;minX=Math.min(minX,x-hw);maxX=Math.max(maxX,x+hw);minY=Math.min(minY,y-hh);maxY=Math.max(maxY,y+hh);}return{minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};}
function radial(i,cx,cy){return Math.hypot(i.gridCol-cx,i.gridRow-cy);}
function sectorLocalBBox(nodes,cx,cy,sector){if(!nodes.length)return null;const a=-Math.PI/2+(sector-1)*STEP,ux=Math.cos(a),uy=Math.sin(a),tx=-uy,ty=ux;let minT=Infinity,maxT=-Infinity,minR=Infinity,maxR=-Infinity;for(const i of nodes){const dx=i.gridCol-cx,dy=i.gridRow-cy,t=dx*tx+dy*ty,r=dx*ux+dy*uy,m=metric(i),ht=(m.w/2)/CELL,hr=(m.h/2)/CELL;minT=Math.min(minT,t-ht);maxT=Math.max(maxT,t+ht);minR=Math.min(minR,r-hr);maxR=Math.max(maxR,r+hr);}return{minX:minT,maxX:maxT,minY:minR,maxY:maxR,width:maxT-minT,height:maxR-minR};}
function symmetryError(g,cx,cy){let max=0;const base={};for(const role of ROLE_ORDER)base[role]=roleItems(g,role,1);for(let s=2;s<=SECTORS;s++){const ang=-(s-1)*STEP,c=Math.cos(ang),si=Math.sin(ang);for(const role of ROLE_ORDER){const a=base[role],b=roleItems(g,role,s);for(let k=0;k<Math.min(a.length,b.length);k++){const x=b[k].gridCol-cx,y=b[k].gridRow-cy,rx=x*c-y*si,ry=x*si+y*c;max=Math.max(max,Math.hypot(rx-(a[k].gridCol-cx),ry-(a[k].gridRow-cy)));}}}return max;}
function validate(g,cx,cy){
 const errors=[];const sectors=[1,2,3,4,5].filter(s=>g.some(i=>i.sector===s));if(sectors.length!==5)errors.push(`expected 5 sectors, found ${sectors.length}`);
 const counts=[];for(let s=1;s<=5;s++)counts.push(g.filter(i=>i.sector===s&&!JOIN_ROLE.test(i.role||'')).length);if(new Set(counts).size>1)errors.push(`sector stitch counts differ: ${counts.join('/')}`);
 const missing=g.filter(i=>!Number.isInteger(i.gridCol)||!Number.isInteger(i.gridRow));if(missing.length)errors.push(`missing/non-integer grid coordinates: ${missing.length}`);
 const collisions=bodyCollisions(g);if(collisions.length)errors.push(`body collisions: ${collisions.length}`);
 const boxes=[];for(let s=1;s<=5;s++)boxes.push(sectorLocalBBox(g.filter(i=>i.sector===s&&!JOIN_ROLE.test(i.role||'')),cx,cy,s));
 if(boxes.every(Boolean)){const ws=boxes.map(b=>b.width),hs=boxes.map(b=>b.height);if(Math.max(...ws)-Math.min(...ws)>1.05||Math.max(...hs)-Math.min(...hs)>1.05)errors.push('sector bbox consistency exceeded 1 grid cell');}
 const layers=[['inner',['inner-chain','inner-petal-stitch']],['middle',['mid-chain','mid-petal-stitch']],['outer',['outer-chain','outer-petal-stitch']],['edge',['edge-sc']]];
 for(let s=1;s<=5;s++){let prevMax=-Infinity;for(const [name,roles] of layers){const ns=g.filter(i=>i.sector===s&&roles.includes(i.role));if(!ns.length){errors.push(`sector ${s} missing ${name} layer`);continue;}const rs=ns.map(i=>radial(i,cx,cy)),lo=Math.min(...rs),hi=Math.max(...rs);if(lo<=prevMax+.25)errors.push(`sector ${s} ${name} layer is not nested outside previous layer`);prevMax=hi;}}
 const sym=symmetryError(g,cx,cy);if(sym>1.75)errors.push(`rotational symmetry error ${sym.toFixed(2)} cells exceeds tolerance`);
 const whole=bbox(g.filter(i=>!JOIN_ROLE.test(i.role||''))),boardCols=190,boardRows=190;let clipped=0;if(whole){for(const i of g.filter(i=>!JOIN_ROLE.test(i.role||''))){const b=bbox([i]);if(b.minX<0||b.minY<0||b.maxX>boardCols||b.maxY>boardRows)clipped++;}if(clipped)errors.push(`clipped symbols: ${clipped}`);}
 return{ok:!errors.length,errors,bodyCollisions:collisions.length,collisions,sectorBboxes:boxes,symmetryError:sym,clippedSymbols:clipped,wholeBBox:whole,counts};
}
function placeJoin(i,target){if(!i||!target)return;setNode(i,target.gridCol,target.gridRow,target.rotation||0);i.visualJoin=true;i.footprint.body=false;}
function normalizeToBoard(g,targetCx,targetCy){const b=bbox(g.filter(i=>!JOIN_ROLE.test(i.role||'')));if(!b)return{dx:0,dy:0};const dx=q(targetCx-(b.minX+b.maxX)/2),dy=q(targetCy-(b.minY+b.maxY)/2);if(dx||dy)for(const i of g){i.gridCol+=dx;i.gridRow+=dy;i.gridX=i.gridCol;i.gridY=i.gridRow;i.xPx=i.gridCol*CELL;i.yPx=i.gridRow*CELL;i.x=(i.xPx/Math.max(board.clientWidth||2200,1))*100;i.y=i.yPx;}return{dx,dy};}
function layout(list,options={}){
 const g=list.filter(i=>i?.generatedPattern&&i.patternKind==='lace-flower');if(!g.length)return{ok:true,errors:[],bodyCollisions:0,sectorBboxes:[],symmetryError:0,clippedSymbols:0};
 const sideCells=190;if(board.style){board.style.width=(sideCells*CELL)+'px';board.style.height=(sideCells*CELL)+'px';board.style.minWidth=(sideCells*CELL)+'px';board.style.minHeight=(sideCells*CELL)+'px';}const cx=95,cy=95,center=g.find(i=>i.role==='start');if(!center)return{ok:false,errors:['Missing center'],bodyCollisions:0,sectorBboxes:[],symmetryError:Infinity,clippedSymbols:0};
 setNode(center,cx+CENTER_RING[0],cy+CENTER_RING[1],0);center.footprint.body=false;
 const csc=roleItems(g,'center-sc',null).sort((a,b)=>(a.centerIndex??0)-(b.centerIndex??0));csc.forEach((i,k)=>{const p=CENTER_SC[k];setNode(i,cx+p[0],cy+p[1],k*36)});const rj=g.find(i=>i.role==='r1-join');placeJoin(rj,csc[0]);
 for(let s=1;s<=5;s++){
   const sec=snapSector(s,cx,cy),rot=sec.a*180/Math.PI+90;
   for(const role of ROLE_ORDER){const arr=roleItems(g,role,s),pts=sec.snapped[role];if(arr.length!==pts.length)continue;arr.forEach((i,k)=>{setNode(i,pts[k].x,pts[k].y,rot);i.canonicalLocal={t:CANONICAL[role][k][0],r:CANONICAL[role][k][1]};i.sectorAngleDeg=(s-1)*72;});}
   const even=csc[(s*2)%10],odd=csc[(s*2+1)%10],mp=roleItems(g,'mid-petal-stitch',s),edge=roleItems(g,'edge-sc',s);
   placeJoin(g.find(i=>i.role==='inner-chain-join'&&i.sector===s),even);placeJoin(g.find(i=>i.role==='inner-petal-stitch-join'&&i.sector===s),even);
   placeJoin(g.find(i=>i.role==='mid-chain-join'&&i.sector===s),odd);placeJoin(g.find(i=>i.role==='mid-petal-stitch-join'&&i.sector===s),odd);
   placeJoin(g.find(i=>i.role==='outer-chain-join'&&i.sector===s),mp[mp.length-1]);placeJoin(g.find(i=>i.role==='outer-petal-stitch-join'&&i.sector===s),mp[mp.length-1]);placeJoin(g.find(i=>i.role==='edge-join'&&i.sector===s),edge[0]);
 }
 const shift=normalizeToBoard(g,cx,cy),actualCx=center.gridCol,actualCy=center.gridRow;
 const result=validate(g,actualCx,actualCy);result.normalization=shift;
 const debug={renderer:`lace-flower-renderer-${VERSION}`,bodyCollisions:result.bodyCollisions,sectorBboxSizes:result.sectorBboxes.map(b=>b?`${b.width.toFixed(1)}x${b.height.toFixed(1)}`:'—'),symmetryError:+result.symmetryError.toFixed(2),clippedSymbols:result.clippedSymbols,validation:result.ok?'PASS':'FAIL'};
 window.__LACE_LAYOUT_SNAPSHOT={renderer:`lace-flower-renderer-${VERSION}`,cellPx:CELL,center:{gridCol:actualCx,gridRow:actualCy},validation:result,debug,nodes:g.map(i=>({id:i.id,type:i.type,role:i.role,sector:i.sector,gridCol:i.gridCol,gridRow:i.gridRow,rotation:i.rotation,workedInto:i.workedInto,visualWidth:i.visualWidth,visualHeight:i.visualHeight,footprint:i.footprint}))};window.__LACE_DEBUG_SUMMARY=debug;
 board.dataset.laceBodyCollisions=String(result.bodyCollisions);board.dataset.laceSymmetryError=String(debug.symmetryError);board.dataset.laceClippedSymbols=String(result.clippedSymbols);board.dataset.laceValidation=result.ok?'PASS':'FAIL';
 if(!options.silent)console.info('Lace Debug Summary',debug);return result;
}
function rejectionOverlay(result){let e=board.querySelector('.lace-layout-rejected');if(result.ok){e?.remove();return;}if(!e){e=document.createElement('div');e.className='lace-layout-rejected';e.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:20;padding:18px 22px;max-width:520px;background:#fff3f3;border:2px solid #c62828;border-radius:10px;color:#8b1111;font:600 14px/1.45 system-ui;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.15)';board.appendChild(e);}e.innerHTML=`<strong style="font-size:18px">LAYOUT REJECTED</strong><br>${result.errors.join('<br>')}`;}
function apply(result){
 const els=[...board.querySelectorAll('.placed')];items.forEach((i,k)=>{if(!i?.generatedPattern||i.patternKind!=='lace-flower')return;const e=els[k];if(!e)return;if(!result.ok){e.style.display='none';return;}if(i.visualJoin){e.style.display='none';return;}e.style.display='grid';e.style.left=`${i.gridCol*CELL}px`;e.style.top=`${i.gridRow*CELL}px`;e.style.width=`${i.visualWidth}px`;e.style.height=`${i.visualHeight}px`;e.style.transform=`translate(-50%,-50%) rotate(${i.rotation||0}deg)`;e.style.zIndex='3';e.dataset.renderer=VERSION;e.dataset.itemId=i.id||'';e.dataset.role=i.role||'';e.dataset.sector=String(i.sector??'');e.dataset.gridCol=String(i.gridCol);e.dataset.gridRow=String(i.gridRow);const svg=e.querySelector('svg');if(svg){svg.setAttribute('width',i.visualWidth);svg.setAttribute('height',i.visualHeight);svg.style.width=`${i.visualWidth}px`;svg.style.height=`${i.visualHeight}px`;}});rejectionOverlay(result);
}
function fitView(result){if(!result.ok||!result.wholeBBox||!boardWrap)return;const b=result.wholeBBox,marginCells=4,minX=(b.minX-marginCells)*CELL,maxX=(b.maxX+marginCells)*CELL,minY=(b.minY-marginCells)*CELL,maxY=(b.maxY+marginCells)*CELL,vw=boardWrap.clientWidth||800,vh=boardWrap.clientHeight||600,w=maxX-minX,h=maxY-minY;const z=Math.max(.5,Math.min(1.35,Math.min(vw/w,vh/h)));if(typeof applyZoom==='function')applyZoom(z);boardWrap.scrollLeft=Math.max(0,((minX+maxX)/2)*z-vw/2);boardWrap.scrollTop=Math.max(0,((minY+maxY)/2)*z-vh/2);}
const prev=render;render=function(...args){let result={ok:true,errors:[],bodyCollisions:0,sectorBboxes:[],symmetryError:0,clippedSymbols:0};if(Array.isArray(items)&&items.some(i=>i?.patternKind==='lace-flower'))result=layout(items,{silent:true});const out=prev(...args);apply(result);board.dataset.laceFlowerV6Valid=result.ok?'true':'false';if(result.ok&&items.some(i=>i?.patternKind==='lace-flower'))setTimeout(()=>fitView(result),0);return out;};
window.layoutLaceFlowerV6=layout;window.fitLaceFlowerV6=fitView;window.validateLaceFlowerV6=(list)=>layout(list,{silent:true});
})();