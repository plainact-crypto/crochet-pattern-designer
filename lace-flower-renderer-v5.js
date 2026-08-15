// Lace Flower Renderer v5 — authoritative 24px-grid renderer with collision-aware snapping.
(()=>{
const CELL=24,TAU=Math.PI*2;
if(typeof render!=='function'||typeof board==='undefined'){console.error('lace-v5 bootstrap failed');return;}
const A=s=>-Math.PI/2+(s-1)*TAU/5;
window.__LACE_RENDERER_VERSION='v5.1';
board.dataset.laceRenderer='v5.1';

const JOIN_ROLE=/join$/;
let occupied=new Map();
const key=(c,r)=>`${c},${r}`;
function isBody(i){return !JOIN_ROLE.test(i?.role||'');}
function reserve(i,c,r){if(isBody(i))occupied.set(key(c,r),i.id);}
function nearestFree(rawC,rawR,maxRadius=3){
  const bc=Math.round(rawC),br=Math.round(rawR),cand=[];
  for(let dy=-maxRadius;dy<=maxRadius;dy++)for(let dx=-maxRadius;dx<=maxRadius;dx++){
    const c=bc+dx,r=br+dy;if(occupied.has(key(c,r)))continue;
    const d=(c-rawC)**2+(r-rawR)**2;
    cand.push({c,r,d,man:Math.abs(dx)+Math.abs(dy)});
  }
  cand.sort((a,b)=>a.d-b.d||a.man-b.man||a.r-b.r||a.c-b.c);
  return cand[0]||{c:bc,r:br};
}
function setExact(i,c,r,rot=0,reserveCell=true){
  i.gridCol=Math.round(c);i.gridRow=Math.round(r);i.gridX=i.gridCol;i.gridY=i.gridRow;
  i.xPx=i.gridCol*CELL;i.yPx=i.gridRow*CELL;i.x=i.xPx/Math.max(board.clientWidth||2200,1)*100;i.y=i.yPx;
  i.rotation=rot;i.gridCellPx=CELL;i.coordinateSystem='grid-index';if(reserveCell)reserve(i,i.gridCol,i.gridRow);
}
function setBody(i,c,r,rot=0){const p=nearestFree(c,r,3);setExact(i,p.c,p.r,rot,true);i.snapError=Math.hypot(p.c-c,p.r-r);}
function loc(cx,cy,a,rr,t){const ux=Math.cos(a),uy=Math.sin(a),tx=-Math.sin(a),ty=Math.cos(a);return[cx+ux*rr+tx*t,cy+uy*rr+ty*t]}
function ori(i,cx,cy){i.rotation=Math.atan2(i.gridRow-cy,i.gridCol-cx)*180/Math.PI+90}
function S(g,role,s){return g.filter(i=>i.role===role&&(s==null||i.sector===s)).sort((a,b)=>(a.orderInPath??0)-(b.orderInPath??0))}
function put(arr,tpl,cx,cy,a){arr.forEach((i,k)=>{const [t,r]=tpl[k];const [c,y]=loc(cx,cy,a,r,t);setBody(i,c,y);ori(i,cx,cy)})}
function placeJoin(i,target){if(!i||!target)return;setExact(i,target.gridCol,target.gridRow,target.rotation||0,false);i.visualJoin=true;}

// Sector-safe local geometry. Tangential width is intentionally bounded so adjacent 72° sectors do not overlap.
const T={
 innerC:[[-1,3],[0,4],[1,3]],
 innerP:[[-2,4],[-2,5],[-1,6],[0,7],[1,6],[2,5],[2,4]],
 midC:[[-2,5],[-2,6],[-1,7],[0,8],[1,7],[2,6],[2,5]],
 midP:[[-4,7],[-4,8],[-3,9],[-2,10],[-1,11],[0,12],[1,11],[2,10],[3,9],[4,8],[4,7]],
 outC:[[-4,9],[-4,10],[-3,11],[-2,12],[-1,13],[0,14],[1,13],[2,12],[3,11],[4,10],[4,9]],
 outP:[[-6,11],[-6,12],[-5,13],[-4,14],[-3,15],[-2,16],[-1,17],[-1,18],[0,20],[1,18],[1,17],[2,16],[3,15],[4,14],[5,13],[6,12],[6,11]]
};
function diagnostic(g,cx,cy,result){
 const nodes=g.map(i=>({id:i.id,type:i.type,role:i.role,round:i.round,sector:i.sector,order:i.orderInPath,workedInto:i.workedInto,gridCol:i.gridCol,gridRow:i.gridRow,rotation:i.rotation,snapError:i.snapError||0,visualJoin:!!i.visualJoin}));
 const counts={};for(const n of nodes)counts[n.role]=(counts[n.role]||0)+1;
 const bodyOcc=new Map(),collisions=[];
 for(const n of nodes.filter(isBody)){const k=key(n.gridCol,n.gridRow),a=bodyOcc.get(k)||[];a.push(n);bodyOcc.set(k,a)}
 for(const [k,a] of bodyOcc)if(a.length>1)collisions.push({grid:k,count:a.length,roles:a.map(x=>x.role),types:a.map(x=>x.type)});
 window.__LACE_LAYOUT_SNAPSHOT={renderer:'lace-flower-renderer-v5.1',createdAt:new Date().toISOString(),cellPx:CELL,center:{gridCol:cx,gridRow:cy},validation:result,nodeCount:nodes.length,nodes,roleCounts:counts,bodyCollisions:collisions,template:T};
 board.dataset.laceSnapshot=String(nodes.length);board.dataset.laceBodyCollisions=String(collisions.length);
}
function layout(list){
 const g=list.filter(i=>i?.generatedPattern&&i.patternKind==='lace-flower');
 if(!g.length){window.__LACE_LAYOUT_SNAPSHOT={renderer:'lace-flower-renderer-v5.1',createdAt:new Date().toISOString(),nodeCount:0,nodes:[],validation:{ok:true,errors:[]}};return{ok:true,errors:[]};}
 occupied=new Map();
 const center=g.find(i=>i.role==='start');if(!center)return{ok:false,errors:['Missing center']};
 const cx=46,cy=27;setBody(center,cx,cy);
 const csc=S(g,'center-sc',null).sort((a,b)=>(a.centerIndex??0)-(b.centerIndex??0));
 csc.forEach((i,k)=>{const a=-Math.PI/2+k*TAU/10,[c,r]=loc(cx,cy,a,2.5,0);setBody(i,c,r,a*180/Math.PI+90)});
 const rj=g.find(i=>i.role==='r1-join');placeJoin(rj,csc[0]);
 const map=new Map(g.map(i=>[i.id,i]));
 for(let s=1;s<=5;s++){
  const a=A(s),even=csc[(s*2)%10],odd=csc[(s*2+1)%10];
  put(S(g,'inner-chain',s),T.innerC,cx,cy,a);placeJoin(g.find(i=>i.role==='inner-chain-join'&&i.sector===s),even);
  put(S(g,'inner-petal-stitch',s),T.innerP,cx,cy,a);placeJoin(g.find(i=>i.role==='inner-petal-stitch-join'&&i.sector===s),even);
  put(S(g,'mid-chain',s),T.midC,cx,cy,a);placeJoin(g.find(i=>i.role==='mid-chain-join'&&i.sector===s),odd);
  put(S(g,'mid-petal-stitch',s),T.midP,cx,cy,a);placeJoin(g.find(i=>i.role==='mid-petal-stitch-join'&&i.sector===s),odd);
  put(S(g,'outer-chain',s),T.outC,cx,cy,a);const mp=S(g,'mid-petal-stitch',s);placeJoin(g.find(i=>i.role==='outer-chain-join'&&i.sector===s),mp[mp.length-1]);
  put(S(g,'outer-petal-stitch',s),T.outP,cx,cy,a);placeJoin(g.find(i=>i.role==='outer-petal-stitch-join'&&i.sector===s),mp[mp.length-1]);
  const ux=Math.cos(a),uy=Math.sin(a),tx=-Math.sin(a),ty=Math.cos(a),edge=S(g,'edge-sc',s);
  edge.forEach(i=>{const b=map.get(i.workedInto);if(!b)return;let tangent=0;if(i.edgeBaseOrder===8)tangent=(i.edgeRepeat-1);const rawC=b.gridCol+ux*1.35+tx*tangent,rawR=b.gridRow+uy*1.35+ty*tangent;setBody(i,rawC,rawR);ori(i,cx,cy)});
  placeJoin(g.find(i=>i.role==='edge-join'&&i.sector===s),edge[0]);
 }
 const errors=[];for(const i of g)if(!Number.isInteger(i.gridCol)||!Number.isInteger(i.gridRow))errors.push(`${i.id}:non-integer-grid`);
 const bodyOcc=new Map();for(const i of g.filter(isBody)){const k=key(i.gridCol,i.gridRow);bodyOcc.set(k,(bodyOcc.get(k)||0)+1)}
 const bodyCollisions=[...bodyOcc.values()].filter(n=>n>1).length;if(bodyCollisions)errors.push(`body-collisions:${bodyCollisions}`);
 const result={ok:!errors.length,errors,bodyCollisions};diagnostic(g,cx,cy,result);return result;
}
function apply(){
 const els=[...board.querySelectorAll('.placed')];
 items.forEach((i,k)=>{
   if(!i?.generatedPattern||i.patternKind!=='lace-flower')return;const e=els[k];if(!e)return;
   const m=window.CROCHET_STITCH_METRICS?.[i.type]||{visualWidthPx:22,visualHeightPx:22};
   if(i.visualJoin){e.style.display='none';return;} // join topology remains in graph but is not a second body symbol on the same anchor.
   e.style.display='block';e.style.left=`${i.gridCol*CELL}px`;e.style.top=`${i.gridRow*CELL}px`;e.style.width=`${m.visualWidthPx}px`;e.style.height=`${m.visualHeightPx}px`;e.style.transform=`translate(-50%,-50%) rotate(${i.rotation||0}deg)`;e.style.zIndex='3';
   e.dataset.itemId=i.id||'';e.dataset.renderer='v5.1';e.dataset.role=i.role||'';e.dataset.sector=String(i.sector??'');e.dataset.gridCol=String(i.gridCol??'');e.dataset.gridRow=String(i.gridRow??'');
   const svg=e.querySelector('svg');if(svg){svg.setAttribute('width',m.visualWidthPx);svg.setAttribute('height',m.visualHeightPx);svg.style.width=`${m.visualWidthPx}px`;svg.style.height=`${m.visualHeightPx}px`;}
 });
 board.querySelectorAll('.path-guide,.crochet-topology-overlay,.crochet-semantic-overlay,.flower-v3-overlay').forEach(n=>n.remove());
 board.dataset.laceDomPlaced=String(board.querySelectorAll('.placed[data-renderer="v5.1"]:not([style*="display: none"])').length);
}
const prev=render;
render=function(...a){let v={ok:true,errors:[]};if(Array.isArray(items)&&items.some(i=>i?.patternKind==='lace-flower'))v=layout(items);const out=prev(...a);apply();board.dataset.laceFlowerV5Valid=v.ok?'true':'false';return out};
window.layoutLaceFlowerV5=layout;
})();