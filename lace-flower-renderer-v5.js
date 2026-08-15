// Lace Flower Renderer v5 — single authoritative renderer + hard diagnostic snapshot.
(()=>{
const CELL=24,TAU=Math.PI*2;
if(typeof render!=='function'||typeof board==='undefined'){console.error('lace-v5 bootstrap failed');return;}
const R=Math.round,A=s=>-Math.PI/2+(s-1)*TAU/5;
window.__LACE_RENDERER_VERSION='v5';
board.dataset.laceRenderer='v5';
function set(i,c,r,rot=0){i.gridCol=R(c);i.gridRow=R(r);i.gridX=i.gridCol;i.gridY=i.gridRow;i.xPx=i.gridCol*CELL;i.yPx=i.gridRow*CELL;i.x=i.xPx/Math.max(board.clientWidth||2200,1)*100;i.y=i.yPx;i.rotation=rot;i.gridCellPx=CELL;i.coordinateSystem='grid-index'}
function loc(cx,cy,a,rr,t){const ux=Math.cos(a),uy=Math.sin(a),tx=-Math.sin(a),ty=Math.cos(a);return[cx+ux*rr+tx*t,cy+uy*rr+ty*t]}
function ori(i,cx,cy){i.rotation=Math.atan2(i.gridRow-cy,i.gridCol-cx)*180/Math.PI+90}
function S(g,role,s){return g.filter(i=>i.role===role&&(s==null||i.sector===s)).sort((a,b)=>(a.orderInPath??0)-(b.orderInPath??0))}
function put(arr,tpl,cx,cy,a){arr.forEach((i,k)=>{const [t,r]=tpl[k];const [c,y]=loc(cx,cy,a,r,t);set(i,c,y);ori(i,cx,cy)})}
// Local sector geometry; exact length = engine stitch counts.
const T={
 innerC:[[-1,3],[0,4],[1,3]],
 innerP:[[-3,4],[-2,5],[-1,6],[0,7],[1,6],[2,5],[3,4]],
 midC:[[-3,5],[-2,6],[-1,7],[0,8],[1,7],[2,6],[3,5]],
 midP:[[-5,6],[-4,7],[-3,8],[-2,9],[-1,10],[0,11],[1,10],[2,9],[3,8],[4,7],[5,6]],
 outC:[[-5,8],[-4,9],[-3,10],[-2,11],[-1,12],[0,13],[1,12],[2,11],[3,10],[4,9],[5,8]],
 outP:[[-8,9],[-7,10],[-6,11],[-5,12],[-4,13],[-3,14],[-2,15],[-1,16],[0,18],[1,16],[2,15],[3,14],[4,13],[5,12],[6,11],[7,10],[8,9]]
};
function diagnostic(g,cx,cy,result){
 const nodes=g.map(i=>({id:i.id,type:i.type,role:i.role,round:i.round,sector:i.sector,order:i.orderInPath,workedInto:i.workedInto,gridCol:i.gridCol,gridRow:i.gridRow,rotation:i.rotation}));
 const counts={};for(const n of nodes)counts[n.role]=(counts[n.role]||0)+1;
 window.__LACE_LAYOUT_SNAPSHOT={renderer:'lace-flower-renderer-v5',createdAt:new Date().toISOString(),cellPx:CELL,center:{gridCol:cx,gridRow:cy},validation:result,nodeCount:nodes.length,nodes,roleCounts:counts,template:T};
 board.dataset.laceSnapshot=String(nodes.length);
}
function layout(list){
 const g=list.filter(i=>i?.generatedPattern&&i.patternKind==='lace-flower');
 if(!g.length){window.__LACE_LAYOUT_SNAPSHOT={renderer:'lace-flower-renderer-v5',createdAt:new Date().toISOString(),nodeCount:0,nodes:[],validation:{ok:true,errors:[]}};return{ok:true,errors:[]};}
 const center=g.find(i=>i.role==='start');if(!center)return{ok:false,errors:['Missing center']};
 const cx=46,cy=27;set(center,cx,cy);
 const csc=S(g,'center-sc',null).sort((a,b)=>(a.centerIndex??0)-(b.centerIndex??0));
 csc.forEach((i,k)=>{const a=-Math.PI/2+k*TAU/10,[c,r]=loc(cx,cy,a,2,0);set(i,c,r,a*180/Math.PI+90)});
 const rj=g.find(i=>i.role==='r1-join');if(rj&&csc[0])set(rj,csc[0].gridCol,csc[0].gridRow,csc[0].rotation||0);
 const map=new Map(g.map(i=>[i.id,i]));
 for(let s=1;s<=5;s++){
  const a=A(s),even=csc[(s*2)%10],odd=csc[(s*2+1)%10];
  put(S(g,'inner-chain',s),T.innerC,cx,cy,a);let j=g.find(i=>i.role==='inner-chain-join'&&i.sector===s);if(j&&even)set(j,even.gridCol,even.gridRow,even.rotation||0);
  put(S(g,'inner-petal-stitch',s),T.innerP,cx,cy,a);j=g.find(i=>i.role==='inner-petal-stitch-join'&&i.sector===s);if(j&&even)set(j,even.gridCol,even.gridRow,even.rotation||0);
  put(S(g,'mid-chain',s),T.midC,cx,cy,a);j=g.find(i=>i.role==='mid-chain-join'&&i.sector===s);if(j&&odd)set(j,odd.gridCol,odd.gridRow,odd.rotation||0);
  put(S(g,'mid-petal-stitch',s),T.midP,cx,cy,a);j=g.find(i=>i.role==='mid-petal-stitch-join'&&i.sector===s);if(j&&odd)set(j,odd.gridCol,odd.gridRow,odd.rotation||0);
  put(S(g,'outer-chain',s),T.outC,cx,cy,a);const mp=S(g,'mid-petal-stitch',s);j=g.find(i=>i.role==='outer-chain-join'&&i.sector===s);if(j&&mp.length)set(j,mp[mp.length-1].gridCol,mp[mp.length-1].gridRow,mp[mp.length-1].rotation||0);
  put(S(g,'outer-petal-stitch',s),T.outP,cx,cy,a);j=g.find(i=>i.role==='outer-petal-stitch-join'&&i.sector===s);if(j&&mp.length)set(j,mp[mp.length-1].gridCol,mp[mp.length-1].gridRow,mp[mp.length-1].rotation||0);
  const ux=Math.cos(a),uy=Math.sin(a),tx=-Math.sin(a),ty=Math.cos(a),edge=S(g,'edge-sc',s);
  edge.forEach(i=>{const b=map.get(i.workedInto);if(!b)return;let t=0;if(i.edgeBaseOrder===8)t=(i.edgeRepeat-1);set(i,b.gridCol+ux+tx*t,b.gridRow+uy+ty*t);ori(i,cx,cy)});
  j=g.find(i=>i.role==='edge-join'&&i.sector===s);if(j&&edge[0])set(j,edge[0].gridCol,edge[0].gridRow,edge[0].rotation||0);
 }
 const errors=[];for(const i of g)if(!Number.isInteger(i.gridCol)||!Number.isInteger(i.gridRow))errors.push(`${i.id}:non-integer-grid`);
 const result={ok:!errors.length,errors};diagnostic(g,cx,cy,result);return result;
}
function apply(){
 const els=[...board.querySelectorAll('.placed')];
 items.forEach((i,k)=>{if(!i?.generatedPattern||i.patternKind!=='lace-flower')return;const e=els[k];if(!e)return;const m=window.CROCHET_STITCH_METRICS?.[i.type]||{visualWidthPx:22,visualHeightPx:22};e.style.left=`${i.gridCol*CELL}px`;e.style.top=`${i.gridRow*CELL}px`;e.style.width=`${m.visualWidthPx}px`;e.style.height=`${m.visualHeightPx}px`;e.style.transform=`translate(-50%,-50%) rotate(${i.rotation||0}deg)`;e.style.zIndex='3';e.dataset.itemId=i.id||'';e.dataset.renderer='v5';e.dataset.role=i.role||'';e.dataset.sector=String(i.sector??'');e.dataset.gridCol=String(i.gridCol??'');e.dataset.gridRow=String(i.gridRow??'');const svg=e.querySelector('svg');if(svg){svg.setAttribute('width',m.visualWidthPx);svg.setAttribute('height',m.visualHeightPx);svg.style.width=`${m.visualWidthPx}px`;svg.style.height=`${m.visualHeightPx}px`;}});
 board.querySelectorAll('.path-guide,.crochet-topology-overlay,.crochet-semantic-overlay,.flower-v3-overlay').forEach(n=>n.remove());
 board.dataset.laceDomPlaced=String(board.querySelectorAll('.placed[data-renderer="v5"]').length);
}
const prev=render;
render=function(...a){let v={ok:true,errors:[]};if(Array.isArray(items)&&items.some(i=>i?.patternKind==='lace-flower'))v=layout(items);const out=prev(...a);apply();board.dataset.laceFlowerV5Valid=v.ok?'true':'false';return out};
window.layoutLaceFlowerV5=layout;
})();