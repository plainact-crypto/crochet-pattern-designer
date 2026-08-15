// Lace Flower Renderer — lays the validated topology onto the 24px editor grid.
(() => {
  const CELL=24;
  if(typeof render!=='function'||typeof board==='undefined')return;
  if(globalThis.__LACE_FLOWER_RENDERER__)return;globalThis.__LACE_FLOWER_RENDERER__=true;
  const ri=Math.round,TAU=Math.PI*2;
  const aFor=(i,n)=>-Math.PI/2+i*TAU/n;
  function set(it,c,r,rot=0){it.gridCol=ri(c);it.gridRow=ri(r);it.gridX=it.gridCol;it.gridY=it.gridRow;it.gridCellPx=CELL;it.coordinateSystem='grid-index';it.xPx=it.gridCol*CELL;it.yPx=it.gridRow*CELL;it.x=it.xPx/Math.max(board.clientWidth||2200,1)*100;it.y=it.yPx;it.rotation=rot}
  function polar(cx,cy,r,a){return{c:cx+Math.cos(a)*r,r:cy+Math.sin(a)*r}}
  function orient(it,cx,cy){const a=Math.atan2(it.gridRow-cy,it.gridCol-cx);it.rotation=a*180/Math.PI+90}
  function byRole(gen,role){return gen.filter(i=>i.role===role)}
  function layout(list){
    const gen=list.filter(i=>i?.generatedPattern&&i.patternKind==='lace-flower');if(!gen.length)return{ok:true,errors:[]};
    const center=gen.find(i=>i.role==='start');if(!center)return{ok:false,errors:['Missing center']};
    const cx=46,cy=24;set(center,cx,cy,0);
    const centerSc=byRole(gen,'center-sc').sort((a,b)=>(a.orderInPath??a.col??0)-(b.orderInPath??b.col??0));
    centerSc.forEach((it,i)=>{const a=aFor(i,10),q=polar(cx,cy,2.4,a);set(it,q.c,q.r,a*180/Math.PI+90)});
    const nodeMap=new Map(gen.map(i=>[i.id,i]));
    const sectorAxis=s=>aFor(s-1,5);
    // R2: ch-5 arches curve outward between alternating center anchors.
    for(let s=1;s<=5;s++){
      const chains=gen.filter(i=>i.role==='inner-chain'&&i.sector===s).sort((a,b)=>a.orderInPath-b.orderInPath);
      const axis=sectorAxis(s),span=.62;
      chains.forEach((ch,k)=>{const t=(k+1)/(chains.length+1),u=(t-.5)*2,a=axis+u*span,r=4.0+Math.cos(u*Math.PI/2)*1.2,q=polar(cx,cy,r,a);set(ch,q.c,q.r,a*180/Math.PI+90)});
    }
    // R3: inner petal stitches make a compact pointed sector.
    for(let s=1;s<=5;s++){
      const pet=gen.filter(i=>i.role==='inner-petal-stitch'&&i.sector===s).sort((a,b)=>a.orderInPath-b.orderInPath),axis=sectorAxis(s);
      pet.forEach((it,k)=>{const u=pet.length===1?0:(k/(pet.length-1)-.5)*2,a=axis+u*.43,r=5.8+(1-Math.abs(u))*2.8,q=polar(cx,cy,r,a);set(it,q.c,q.r);orient(it,cx,cy)});
      const j=gen.find(i=>i.role==='inner-petal-join'&&i.sector===s);if(j){const q=polar(cx,cy,4.2,axis+.56);set(j,q.c,q.r,0)}
    }
    // R4: broad ch-9 arches sit behind the inner petals.
    for(let s=1;s<=5;s++){
      const chains=gen.filter(i=>i.role==='outer-chain'&&i.sector===s).sort((a,b)=>a.orderInPath-b.orderInPath),axis=sectorAxis(s);
      chains.forEach((ch,k)=>{const t=(k+1)/(chains.length+1),u=(t-.5)*2,a=axis+u*.56,r=9.1+Math.cos(u*Math.PI/2)*1.8,q=polar(cx,cy,r,a);set(ch,q.c,q.r,a*180/Math.PI+90)});
      const j=gen.find(i=>i.role==='outer-arch-join'&&i.sector===s);if(j){const q=polar(cx,cy,8.2,axis+.62);set(j,q.c,q.r,0)}
    }
    // R5: large pointed petals. Short stitches stay on the shoulders, tr stitches form the tip.
    for(let s=1;s<=5;s++){
      const pet=gen.filter(i=>i.role==='outer-petal-stitch'&&i.sector===s).sort((a,b)=>a.orderInPath-b.orderInPath),axis=sectorAxis(s);
      pet.forEach((it,k)=>{const u=pet.length===1?0:(k/(pet.length-1)-.5)*2,a=axis+u*.47;let rise=(1-Math.abs(u));rise=1-Math.pow(1-rise,1.35);const r=10.2+rise*5.1,q=polar(cx,cy,r,a);set(it,q.c,q.r);orient(it,cx,cy)});
      const j=gen.find(i=>i.role==='outer-petal-join'&&i.sector===s);if(j){const q=polar(cx,cy,9.1,axis+.58);set(j,q.c,q.r,0)}
    }
    // R6: edge stitches follow their exact R5 parent stitch, one cell outward. The center tip gets 3 sc spread tangentially.
    for(let s=1;s<=5;s++){
      const edge=gen.filter(i=>i.role==='edge-sc'&&i.sector===s).sort((a,b)=>a.orderInPath-b.orderInPath),axis=sectorAxis(s),tx=-Math.sin(axis),ty=Math.cos(axis);
      edge.forEach(it=>{const base=nodeMap.get(it.workedInto);if(!base)return;const dx=base.gridCol-cx,dy=base.gridRow-cy,L=Math.hypot(dx,dy)||1,ox=dx/L,oy=dy/L;let tang=0;if(it.edgeBaseOrder===6)tang=(it.edgeRepeat-1)*.85;set(it,base.gridCol+ox*1.15+tx*tang,base.gridRow+oy*1.15+ty*tang);orient(it,cx,cy)});
      const j=gen.find(i=>i.role==='edge-join'&&i.sector===s);if(j){const first=edge[0];if(first)set(j,first.gridCol,first.gridRow,first.rotation||0)}
    }
    // Resolve accidental snap collisions locally without leaving the integer grid.
    const occupied=new Map(),errors=[];
    for(const it of gen){
      if(!Number.isInteger(it.gridCol)||!Number.isInteger(it.gridRow)){errors.push(`${it.id}: non integer`);continue}
      if(it.type==='slip')continue;
      let key=`${it.gridCol},${it.gridRow}`;
      if(occupied.has(key)){
        const a=Math.atan2(it.gridRow-cy,it.gridCol-cx),tx=-Math.sin(a),ty=Math.cos(a);let moved=false;
        for(const d of [1,-1,2,-2]){const c=ri(it.gridCol+tx*d),r=ri(it.gridRow+ty*d),k=`${c},${r}`;if(!occupied.has(k)){set(it,c,r,it.rotation||0);key=k;moved=true;break}}
        if(!moved)errors.push(`Collision ${key}`);
      }
      occupied.set(key,it.id);
    }
    return{ok:!errors.length,errors};
  }
  function apply(){
    const els=[...board.querySelectorAll('.placed')];items.forEach((it,i)=>{if(!it?.generatedPattern||it.patternKind!=='lace-flower')return;const el=els[i];if(!el)return;el.style.left=`${it.gridCol*CELL}px`;el.style.top=`${it.gridRow*CELL}px`;el.style.width=`${CELL}px`;el.style.height=`${CELL}px`;el.style.transform=`translate(-50%,-50%) rotate(${it.rotation||0}deg)`;el.style.zIndex='3';const svg=el.querySelector('svg');if(svg){const m=window.CROCHET_STITCH_METRICS?.[it.type];const size=m?.visualSizePx||22;svg.setAttribute('width',size);svg.setAttribute('height',size);svg.style.visibility='visible'}});board.querySelectorAll('.path-guide,.crochet-topology-overlay,.crochet-semantic-overlay,.flower-v3-overlay').forEach(n=>n.remove())
  }
  const prev=render;render=function(...args){if(Array.isArray(items)&&items.some(i=>i?.patternKind==='lace-flower')){const v=layout(items);board.dataset.laceFlowerValid=v.ok?'true':'false';if(!v.ok)console.error('Lace flower layout',v.errors)}const out=prev(...args);apply();return out};
  window.layoutLaceFlower=layout;
})();