// Lace Flower Renderer v6.2 — canonical sector + constrained radial-monotonic grid snapping.
(()=>{
const CELL=24,TAU=Math.PI*2,SECTORS=5,STEP=TAU/SECTORS,VERSION='v6.2';
if(typeof render!=='function'||typeof board==='undefined'){console.error('lace-v6.2 bootstrap failed');return;}
window.__LACE_RENDERER_VERSION=VERSION;board.dataset.laceRenderer=VERSION;
const BODY_TYPES=new Set(['chain','single','half','double','treble','dtr','picot','puff','bobble','cluster','shell']);
const JOIN_ROLE=/join$/;
const ROLE_ORDER=['inner-chain','inner-petal-stitch','mid-chain','mid-petal-stitch','outer-chain','outer-petal-stitch','edge-sc'];
const EXPECTED={'inner-chain':3,'inner-petal-stitch':7,'mid-chain':7,'mid-petal-stitch':11,'outer-chain':11,'outer-petal-stitch':17,'edge-sc':19};
// Deliberate radial bands. Adjacent layers have >=2-cell canonical separation before quantization.
const ARC_SPEC={
 'inner-chain':{edge:5.0,center:6.0,angle:24},
 'inner-petal-stitch':{edge:7.0,center:10.0,angle:30},
 'mid-chain':{edge:13.0,center:14.0,angle:29},
 'mid-petal-stitch':{edge:15.0,center:19.0,angle:32},
 'outer-chain':{edge:22.0,center:23.0,angle:29},
 'outer-petal-stitch':{edge:25.0,center:31.0,angle:30},
 'edge-sc':{edge:34.0,center:37.0,angle:30.5}
};
const LAYERS=[
 {name:'inner',roles:['inner-chain','inner-petal-stitch']},
 {name:'middle',roles:['mid-chain','mid-petal-stitch']},
 {name:'outer',roles:['outer-chain','outer-petal-stitch']},
 {name:'edge',roles:['edge-sc']}
];
const MET=()=>window.CROCHET_STITCH_METRICS||{},q=Math.round;
function arcPoints(n,s){const out=[];for(let k=0;k<n;k++){const u=n===1?0:-1+2*k/(n-1),r=s.edge+(s.center-s.edge)*(1-u*u),th=s.angle*Math.PI/180*u;out.push({t:r*Math.sin(th),r:r*Math.cos(th),thetaDeg:s.angle*u});}return out;}
const CANONICAL={};for(const role of ROLE_ORDER)CANONICAL[role]=arcPoints(EXPECTED[role],ARC_SPEC[role]);
function roleItems(g,role,sector){return g.filter(i=>i.role===role&&(sector==null||i.sector===sector)).sort((a,b)=>(a.orderInPath??0)-(b.orderInPath??0));}
function isBody(i){return BODY_TYPES.has(i?.type)&&!JOIN_ROLE.test(i?.role||'');}
function metric(i){const m=MET()[i.type]||{visualWidthPx:18,visualHeightPx:18};return{w:m.visualWidthPx||18,h:m.visualHeightPx||18};}
function setNode(i,c,r,rotation=0){i.gridCol=c;i.gridRow=r;i.gridX=c;i.gridY=r;i.xPx=c*CELL;i.yPx=r*CELL;i.x=(i.xPx/Math.max(board.clientWidth||2400,1))*100;i.y=i.yPx;i.rotation=rotation;i.gridCellPx=CELL;i.coordinateSystem='grid-index';const m=metric(i);i.visualWidth=m.w;i.visualHeight=m.h;i.footprint={widthPx:m.w,heightPx:m.h,rotationDeg:rotation,body:isBody(i)};if(!Object.prototype.hasOwnProperty.call(i,'workedInto'))i.workedInto=null;}
function worldPoint(p,a,cx,cy){const ux=Math.cos(a),uy=Math.sin(a),tx=-uy,ty=ux;return{x:cx+ux*p.r+tx*p.t,y:cy+uy*p.r+ty*p.t};}
function sectorRaw(sector,cx,cy){const a=-Math.PI/2+(sector-1)*STEP,roles={};for(const role of ROLE_ORDER)roles[role]=CANONICAL[role].map(p=>worldPoint(p,a,cx,cy));return{a,roles};}
function localRadial(pt,a,cx,cy){return(pt.x-cx)*Math.cos(a)+(pt.y-cy)*Math.sin(a);}
function snappedLayerBands(snapped,a,cx,cy){return LAYERS.map(L=>{const vals=[];for(const role of L.roles)for(const p of snapped[role]||[])vals.push(localRadial(p,a,cx,cy));return{name:L.name,min:Math.min(...vals),max:Math.max(...vals)};});}
function radialMonotonic(snapped,a,cx,cy){const bands=snappedLayerBands(snapped,a,cx,cy);for(let i=1;i<bands.length;i++)if(bands[i].min<=bands[i-1].max+0.55)return false;return true;}
function snapSector(sector,cx,cy){
 const raw=sectorRaw(sector,cx,cy),phases=[-.48,-.36,-.24,-.12,0,.12,.24,.36,.48];let best=null;
 for(const px of phases)for(const py of phases){const snapped={},seen=new Set();let score=0,dupes=0;
   for(const role of ROLE_ORDER){const pts=raw.roles[role];snapped[role]=pts.map(p=>({x:q(p.x+px),y:q(p.y+py)}));for(let k=0;k<pts.length;k++){const sp=snapped[role][k],rp=pts[k];score+=(sp.x-rp.x)**2+(sp.y-rp.y)**2;const kk=`${sp.x},${sp.y}`;if(seen.has(kk))dupes++;seen.add(kk);}for(let k=1;k<pts.length;k++){const rd=Math.hypot(pts[k].x-pts[k-1].x,pts[k].y-pts[k-1].y),sd=Math.hypot(snapped[role][k].x-snapped[role][k-1].x,snapped[role][k].y-snapped[role][k-1].y);score+=(sd-rd)**2*.7;}}
   if(dupes||!radialMonotonic(snapped,raw.a,cx,cy))continue;
   if(!best||score<best.score)best={score,snapped,phase:{x:px,y:py}};
 }
 if(!best)throw new Error(`sector ${sector}: no constrained snap satisfies radial monotonicity`);
 return{a:raw.a,snapped:best.snapped,phase:best.phase};
}
function orientedCorners(i){const m=metric(i),hw=m.w/2+1.5,hh=m.h/2+1.5,a=(i.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=i.gridCol*CELL,cy=i.gridRow*CELL;return[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([x,y])=>({x:cx+x*c-y*s,y:cy+x*s+y*c}));}
function project(poly,axis){let min=Infinity,max=-Infinity;for(const p of poly){const v=p.x*axis.x+p.y*axis.y;min=Math.min(min,v);max=Math.max(max,v)}return{min,max};}
function overlapSAT(a,b){const pa=orientedCorners(a),pb=orientedCorners(b),axes=[];for(const p of [pa,pb])for(let k=0;k<2;k++){const p1=p[k],p2=p[(k+1)%4],dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.hypot(dx,dy)||1;axes.push({x:-dy/len,y:dx/len});}for(const ax of axes){const A=project(pa,ax),B=project(pb,ax);if(A.max<=B.min+.25||B.max<=A.min+.25)return false;}return true;}
function bodyCollisions(g){const b=g.filter(isBody),out=[];for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++){if(Math.abs(b[i].gridCol-b[j].gridCol)>4||Math.abs(b[i].gridRow-b[j].gridRow)>4)continue;if(overlapSAT(b[i],b[j]))out.push({a:b[i],b:b[j]});}return out;}
function bbox(nodes){if(!nodes.length)return null;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const i of nodes)for(const p of orientedCorners(i)){minX=Math.min(minX,p.x/CELL);maxX=Math.max(maxX,p.x/CELL);minY=Math.min(minY,p.y/CELL);maxY=Math.max(maxY,p.y/CELL);}return{minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};}
function sectorLocalBBox(nodes,cx,cy,sector){if(!nodes.length)return null;const a=-Math.PI/2+(sector-1)*STEP,ux={x:Math.cos(a),y:Math.sin(a)},tx={x:-Math.sin(a),y:Math.cos(a)};let minT=Infinity,maxT=-Infinity,minR=Infinity,maxR=-Infinity;for(const i of nodes)for(const p of orientedCorners(i)){const dx=p.x/CELL-cx,dy=p.y/CELL-cy,t=dx*tx.x+dy*tx.y,r=dx*ux.x+dy*ux.y;minT=Math.min(minT,t);maxT=Math.max(maxT,t);minR=Math.min(minR,r);maxR=Math.max(maxR,r);}return{minX:minT,maxX:maxT,minY:minR,maxY:maxR,width:maxT-minT,height:maxR-minR};}
function symmetryError(g,cx,cy){let max=0;const base={};for(const role of ROLE_ORDER)base[role]=roleItems(g,role,1);for(let s=2;s<=SECTORS;s++){const ang=-(s-1)*STEP,c=Math.cos(ang),si=Math.sin(ang);for(const role of ROLE_ORDER){const a=base[role],b=roleItems(g,role,s);for(let k=0;k<Math.min(a.length,b.length);k++){const x=b[k].gridCol-cx,y=b[k].gridRow-cy,rx=x*c-y*si,ry=x*si+y*c;max=Math.max(max,Math.hypot(rx-(a[k].gridCol-cx),ry-(a[k].gridRow-cy)));}}}return max;}
function validate(g,cx,cy){
 const errors=[];const sectors=[1,2,3,4,5].filter(s=>g.some(i=>i.sector===s));if(sectors.length!==5)errors.push(`expected 5 sectors, found ${sectors.length}`);
 const counts=[];for(let s=1;s<=5;s++)counts.push(g.filter(i=>i.sector===s&&!JOIN_ROLE.test(i.role||'')).length);if(new Set(counts).size>1)errors.push(`sector stitch counts differ: ${counts.join('/')}`);
 for(const role of ROLE_ORDER)for(let s=1;s<=5;s++){const n=roleItems(g,role,s).length;if(n!==EXPECTED[role])errors.push(`sector ${s} ${role} count ${n}/${EXPECTED[role]}`);}
 const missing=g.filter(i=>!Number.isInteger(i.gridCol)||!Number.isInteger(i.gridRow));if(missing.length)errors.push(`missing/non-integer grid coordinates: ${missing.length}`);
 const collisions=bodyCollisions(g);if(collisions.length)errors.push(`body collisions: ${collisions.length}`);
 const boxes=[];for(let s=1;s<=5;s++)boxes.push(sectorLocalBBox(g.filter(i=>i.sector===s&&!JOIN_ROLE.test(i.role||'')),cx,cy,s));
 if(boxes.every(Boolean)){const ws=boxes.map(b=>b.width),hs=boxes.map(b=>b.height);if(Math.max(...ws)-Math.min(...ws)>1.05||Math.max(...hs)-Math.min(...hs)>1.05)errors.push('sector bbox consistency exceeded 1 grid cell');}
 for(let s=1;s<=5;s++){const a=-Math.PI/2+(s-1)*STEP;const snapped={};for(const role of ROLE_ORDER)snapped[role]=roleItems(g,role,s).map(i=>({x:i.gridCol,y:i.gridRow}));const bands=snappedLayerBands(snapped,a,cx,cy);for(let i=1;i<bands.length;i++)if(bands[i].min<=bands[i-1].max+0.55)errors.push(`sector ${s} ${bands[i].name} layer is not nested outside previous layer`);}
 const sym=symmetryError(g,cx,cy);if(sym>1.75)errors.push(`rotational symmetry error ${sym.toFixed(2)} cells exceeds tolerance`);
 const whole=bbox(g.filter(i=>!JOIN_ROLE.test(i.role||''))),boardCols=110,boardRows=110;let clipped=0;if(whole){for(const i of g.filter(i=>!JOIN_ROLE.test(i.role||''))){const b=bbox([i]);if(b.minX<0||b.minY<0||b.maxX>boardCols||b.maxY>boardRows)clipped++;}if(clipped)errors.push(`clipped symbols: ${clipped}`);}
 return{ok:!errors.length,errors:[...new Set(errors)],bodyCollisions:collisions.length,collisions,sectorBboxes:boxes,symmetryError:sym,clippedSymbols:clipped,wholeBBox:whole,counts};
}
function placeJoin(i,target){if(!i||!target)return;setNode(i,target.gridCol,target.gridRow,target.rotation||0);i.visualJoin=true;i.footprint.body=false;}
function normalize(g,targetCx,targetCy){const b=bbox(g.filter(i=>!JOIN_ROLE.test(i.role||'')));if(!b)return{dx:0,dy:0};const dx=q(targetCx-(b.minX+b.maxX)/2),dy=q(targetCy-(b.minY+b.maxY)/2);if(dx||dy)for(const i of g){i.gridCol+=dx;i.gridRow+=dy;i.gridX=i.gridCol;i.gridY=i.gridRow;i.xPx=i.gridCol*CELL;i.yPx=i.gridRow*CELL;i.x=(i.xPx/Math.max(board.clientWidth||2640,1))*100;i.y=i.yPx;}return{dx,dy};}
function layout(list,options={}){
 const g=list.filter(i=>i?.generatedPattern&&i.patternKind==='lace-flower');if(!g.length)return{ok:true,errors:[],bodyCollisions:0,sectorBboxes:[],symmetryError:0,clippedSymbols:0};
 const side=110;if(board.style){board.style.width=side*CELL+'px';board.style.height=side*CELL+'px';board.style.minWidth=side*CELL+'px';board.style.minHeight=side*CELL+'px';}
 const cx=55,cy=55,center=g.find(i=>i.role==='start');if(!center)return{ok:false,errors:['Missing center'],bodyCollisions:0,sectorBboxes:[],symmetryError:Infinity,clippedSymbols:0};
 setNode(center,cx,cy,0);center.footprint.body=false;
 const centerPts=[[0,-4],[2,-3],[4,-1],[4,1],[2,3],[0,4],[-2,3],[-4,1],[-4,-1],[-2,-3]],csc=roleItems(g,'center-sc',null).sort((a,b)=>(a.centerIndex??0)-(b.centerIndex??0));csc.forEach((i,k)=>{const p=centerPts[k];setNode(i,cx+p[0],cy+p[1],k*36)});placeJoin(g.find(i=>i.role==='r1-join'),csc[0]);
 try{for(let s=1;s<=5;s++){const sec=snapSector(s,cx,cy),sectorDeg=(s-1)*72;for(const role of ROLE_ORDER){const arr=roleItems(g,role,s),pts=sec.snapped[role],canon=CANONICAL[role];if(arr.length!==pts.length)continue;arr.forEach((i,k)=>{setNode(i,pts[k].x,pts[k].y,sectorDeg+canon[k].thetaDeg);i.canonicalLocal={t:canon[k].t,r:canon[k].r};i.sectorAngleDeg=sectorDeg;});}const even=csc[(s*2)%10],odd=csc[(s*2+1)%10],mp=roleItems(g,'mid-petal-stitch',s),edge=roleItems(g,'edge-sc',s);placeJoin(g.find(i=>i.role==='inner-chain-join'&&i.sector===s),even);placeJoin(g.find(i=>i.role==='inner-petal-stitch-join'&&i.sector===s),even);placeJoin(g.find(i=>i.role==='mid-chain-join'&&i.sector===s),odd);placeJoin(g.find(i=>i.role==='mid-petal-stitch-join'&&i.sector===s),odd);placeJoin(g.find(i=>i.role==='outer-chain-join'&&i.sector===s),mp[mp.length-1]);placeJoin(g.find(i=>i.role==='outer-petal-stitch-join'&&i.sector===s),mp[mp.length-1]);placeJoin(g.find(i=>i.role==='edge-join'&&i.sector===s),edge[0]);}}catch(err){const fail={ok:false,errors:[String(err.message||err)],bodyCollisions:0,sectorBboxes:[],symmetryError:Infinity,clippedSymbols:0};window.__LACE_LAYOUT_SNAPSHOT={renderer:`lace-flower-renderer-${VERSION}`,cellPx:CELL,validation:fail,nodes:[]};return fail;}
 const shift=normalize(g,cx,cy),actualCx=center.gridCol,actualCy=center.gridRow,result=validate(g,actualCx,actualCy);result.normalization=shift;
 const debug={renderer:`lace-flower-renderer-${VERSION}`,bodyCollisions:result.bodyCollisions,sectorBboxSizes:result.sectorBboxes.map(b=>b?`${b.width.toFixed(1)}x${b.height.toFixed(1)}`:'—'),symmetryError:+result.symmetryError.toFixed(2),clippedSymbols:result.clippedSymbols,validation:result.ok?'PASS':'FAIL'};
 window.__LACE_LAYOUT_SNAPSHOT={renderer:`lace-flower-renderer-${VERSION}`,createdAt:new Date().toISOString(),cellPx:CELL,center:{gridCol:actualCx,gridRow:actualCy},validation:result,debug,nodes:g.map(i=>({id:i.id,type:i.type,role:i.role,round:i.round,sector:i.sector,order:i.orderInPath,gridCol:i.gridCol,gridRow:i.gridRow,rotation:i.rotation,workedInto:i.workedInto,visualWidth:i.visualWidth,visualHeight:i.visualHeight,footprint:i.footprint,visualJoin:!!i.visualJoin}))};window.__LACE_DEBUG_SUMMARY=debug;
 board.dataset.laceBodyCollisions=String(result.bodyCollisions);board.dataset.laceSymmetryError=String(debug.symmetryError);board.dataset.laceClippedSymbols=String(result.clippedSymbols);board.dataset.laceValidation=result.ok?'PASS':'FAIL';if(!options.silent)console.info('Lace Debug Summary',debug);return result;
}
function rejection(result){let e=board.querySelector('.lace-layout-rejected');if(result.ok){e?.remove();return;}if(!e){e=document.createElement('div');e.className='lace-layout-rejected';e.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:20;padding:18px 22px;max-width:540px;background:#fff3f3;border:2px solid #c62828;border-radius:10px;color:#8b1111;font:600 14px/1.45 system-ui;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.15)';board.appendChild(e);}e.innerHTML=`<strong style="font-size:18px">LAYOUT REJECTED</strong><br>${result.errors.join('<br>')}`;}
function apply(result){const els=[...board.querySelectorAll('.placed')];items.forEach((i,k)=>{if(!i?.generatedPattern||i.patternKind!=='lace-flower')return;const e=els[k];if(!e)return;if(!result.ok||i.visualJoin){e.style.display='none';return;}e.style.display='grid';e.style.left=i.gridCol*CELL+'px';e.style.top=i.gridRow*CELL+'px';e.style.width=i.visualWidth+'px';e.style.height=i.visualHeight+'px';e.style.transform=`translate(-50%,-50%) rotate(${i.rotation||0}deg)`;e.style.zIndex='3';e.dataset.renderer=VERSION;e.dataset.gridCol=String(i.gridCol);e.dataset.gridRow=String(i.gridRow);const svg=e.querySelector('svg');if(svg){svg.setAttribute('width',i.visualWidth);svg.setAttribute('height',i.visualHeight);svg.style.width=i.visualWidth+'px';svg.style.height=i.visualHeight+'px';}});rejection(result);}
function fitView(result){if(!result.ok||!result.wholeBBox||!boardWrap)return;const b=result.wholeBBox,margin=3,minX=(b.minX-margin)*CELL,maxX=(b.maxX+margin)*CELL,minY=(b.minY-margin)*CELL,maxY=(b.maxY+margin)*CELL,vw=boardWrap.clientWidth||800,vh=boardWrap.clientHeight||600,w=maxX-minX,h=maxY-minY,z=Math.max(.32,Math.min(1.15,Math.min(vw/w,vh/h)));if(typeof applyZoom==='function')applyZoom(z);boardWrap.scrollLeft=Math.max(0,((minX+maxX)/2)*z-vw/2);boardWrap.scrollTop=Math.max(0,((minY+maxY)/2)*z-vh/2);}
const prev=render;render=function(...args){let v={ok:true,errors:[],bodyCollisions:0,sectorBboxes:[],symmetryError:0,clippedSymbols:0};if(Array.isArray(items)&&items.some(i=>i?.patternKind==='lace-flower'))v=layout(items,{silent:true});const out=prev(...args);apply(v);board.dataset.laceFlowerV62Valid=v.ok?'true':'false';if(v.ok&&items.some(i=>i?.patternKind==='lace-flower'))setTimeout(()=>fitView(v),0);return out;};
window.layoutLaceFlowerV62=layout;window.validateLaceFlowerV62=(list)=>layout(list,{silent:true});window.fitLaceFlowerV62=fitView;
})();