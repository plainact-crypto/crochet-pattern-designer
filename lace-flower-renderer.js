// Lace Flower Renderer v2 — coherent sector-first layout on the 24px editor grid.
// Each petal is laid out as one continuous sector from center to tip, then repeated x5.
(() => {
  const CELL=24;
  if(typeof render!=='function'||typeof board==='undefined')return;
  globalThis.__LACE_FLOWER_RENDERER__=true;
  const ri=Math.round,TAU=Math.PI*2;
  const axisFor=s=>-Math.PI/2+(s-1)*TAU/5;
  function set(it,c,r,rot=0){
    it.gridCol=ri(c);it.gridRow=ri(r);it.gridX=it.gridCol;it.gridY=it.gridRow;
    it.gridCellPx=CELL;it.coordinateSystem='grid-index';it.xPx=it.gridCol*CELL;it.yPx=it.gridRow*CELL;
    it.x=it.xPx/Math.max(board.clientWidth||2200,1)*100;it.y=it.yPx;it.rotation=rot;
  }
  function local(cx,cy,axis,radial,tangent){
    const ux=Math.cos(axis),uy=Math.sin(axis),tx=-Math.sin(axis),ty=Math.cos(axis);
    return{c:cx+ux*radial+tx*tangent,r:cy+uy*radial+ty*tangent};
  }
  function orientRadial(it,cx,cy){const a=Math.atan2(it.gridRow-cy,it.gridCol-cx);it.rotation=a*180/Math.PI+90}
  function sorted(gen,role,sector){return gen.filter(i=>i.role===role&&(sector==null||i.sector===sector)).sort((a,b)=>(a.orderInPath??0)-(b.orderInPath??0))}

  function layout(list){
    const gen=list.filter(i=>i?.generatedPattern&&i.patternKind==='lace-flower');
    if(!gen.length)return{ok:true,errors:[]};
    const center=gen.find(i=>i.role==='start');if(!center)return{ok:false,errors:['Missing center']};
    const cx=46,cy=24;set(center,cx,cy,0);

    // R1 — true compact 10-sc center ring.
    const centerSc=gen.filter(i=>i.role==='center-sc').sort((a,b)=>(a.centerIndex??a.orderInPath??0)-(b.centerIndex??b.orderInPath??0));
    centerSc.forEach((it,i)=>{const a=-Math.PI/2+i*TAU/10,q=local(cx,cy,a,2,0);set(it,q.c,q.r,a*180/Math.PI+90)});
    const r1Join=gen.find(i=>i.role==='r1-join');if(r1Join&&centerSc[0])set(r1Join,centerSc[0].gridCol,centerSc[0].gridRow,centerSc[0].rotation||0);

    const nodeMap=new Map(gen.map(i=>[i.id,i]));

    // Every sector uses the SAME local geometry. This keeps each petal coherent instead of
    // spreading rounds into unrelated concentric rings.
    const innerChainT=[-2,-1,0,1,2], innerChainR=[4,5,6,5,4];
    const innerPetalT=[-3,-2,-1,-1,0,1,1,2,3], innerPetalR=[5,6,7,8,10,8,7,6,5];
    const outerChainT=[-4,-3,-2,-1,0,1,2,3,4], outerChainR=[8,9,10,11,12,11,10,9,8];
    const outerPetalT=[-5,-4,-3,-2,-1,-1,0,1,1,2,3,4,5], outerPetalR=[10,11,12,13,14,15,18,15,14,13,12,11,10];

    for(let s=1;s<=5;s++){
      const axis=axisFor(s);

      // R2 — ch-5 arch inside this sector.
      const innerChains=sorted(gen,'inner-chain',s);
      innerChains.forEach((it,k)=>{const q=local(cx,cy,axis,innerChainR[k]??5,innerChainT[k]??0);set(it,q.c,q.r);orientRadial(it,cx,cy)});
      const innerArchJoin=gen.find(i=>i.role==='inner-arch-join'&&i.sector===s);
      const evenTarget=centerSc[(s*2)%10];if(innerArchJoin&&evenTarget)set(innerArchJoin,evenTarget.gridCol,evenTarget.gridRow,evenTarget.rotation||0);

      // R3 — compact pointed inner petal within the SAME sector.
      const innerPetal=sorted(gen,'inner-petal-stitch',s);
      innerPetal.forEach((it,k)=>{const q=local(cx,cy,axis,innerPetalR[k]??7,innerPetalT[k]??0);set(it,q.c,q.r);orientRadial(it,cx,cy)});
      const innerJoin=gen.find(i=>i.role==='inner-petal-join'&&i.sector===s);if(innerJoin&&evenTarget)set(innerJoin,evenTarget.gridCol,evenTarget.gridRow,evenTarget.rotation||0);

      // R4 — broad back ch-9 arch framing the same petal sector.
      const outerChains=sorted(gen,'outer-chain',s);
      outerChains.forEach((it,k)=>{const q=local(cx,cy,axis,outerChainR[k]??10,outerChainT[k]??0);set(it,q.c,q.r);orientRadial(it,cx,cy)});
      const oddTarget=centerSc[((s*2+1)%10)];
      const outerArchJoin=gen.find(i=>i.role==='outer-arch-join'&&i.sector===s);if(outerArchJoin&&oddTarget)set(outerArchJoin,oddTarget.gridCol,oddTarget.gridRow,oddTarget.rotation||0);

      // R5 — pointed outer petal. Shoulder → rise → tip → mirrored shoulder.
      const outerPetal=sorted(gen,'outer-petal-stitch',s);
      outerPetal.forEach((it,k)=>{const q=local(cx,cy,axis,outerPetalR[k]??12,outerPetalT[k]??0);set(it,q.c,q.r);orientRadial(it,cx,cy)});
      const outerJoin=gen.find(i=>i.role==='outer-petal-join'&&i.sector===s);if(outerJoin&&oddTarget)set(outerJoin,oddTarget.gridCol,oddTarget.gridRow,oddTarget.rotation||0);

      // R6 — shaping edge follows the actual R5 parent, one grid step outward.
      const ux=Math.cos(axis),uy=Math.sin(axis),tx=-Math.sin(axis),ty=Math.cos(axis);
      const edge=sorted(gen,'edge-sc',s);
      edge.forEach(it=>{
        const base=nodeMap.get(it.workedInto);if(!base)return;
        let tang=0;
        if(it.edgeBaseOrder===6)tang=(it.edgeRepeat-1)*1.0; // three sc around the tip
        set(it,base.gridCol+ux*1.15+tx*tang,base.gridRow+uy*1.15+ty*tang);orientRadial(it,cx,cy);
      });
      const edgeJoin=gen.find(i=>i.role==='edge-join'&&i.sector===s);if(edgeJoin&&edge[0])set(edgeJoin,edge[0].gridCol,edge[0].gridRow,edge[0].rotation||0);
    }

    // Validation: every non-slip symbol must occupy an integer grid center. We do NOT move
    // collisions automatically because that silently destroys the designed sector geometry.
    const errors=[],occ=new Map();
    for(const it of gen){
      if(!Number.isInteger(it.gridCol)||!Number.isInteger(it.gridRow)){errors.push(`${it.id}: non integer grid`);continue}
      if(it.type==='slip')continue;
      const key=`${it.gridCol},${it.gridRow}`;const arr=occ.get(key)||[];arr.push(it);occ.set(key,arr);
    }
    for(const [k,arr] of occ){if(arr.length>1)errors.push(`Grid collision ${k}: ${arr.map(i=>i.role).join(',')}`)}
    return{ok:!errors.length,errors};
  }

  function apply(){
    const els=[...board.querySelectorAll('.placed')];
    items.forEach((it,i)=>{
      if(!it?.generatedPattern||it.patternKind!=='lace-flower')return;
      const el=els[i];if(!el)return;
      el.style.left=`${it.gridCol*CELL}px`;el.style.top=`${it.gridRow*CELL}px`;el.style.width=`${CELL}px`;el.style.height=`${CELL}px`;
      el.style.transform=`translate(-50%,-50%) rotate(${it.rotation||0}deg)`;el.style.zIndex='3';
      const svg=el.querySelector('svg');if(svg){const m=window.CROCHET_STITCH_METRICS?.[it.type];const size=m?.visualSizePx||22;svg.setAttribute('width',size);svg.setAttribute('height',size);svg.style.visibility='visible'}
    });
    board.querySelectorAll('.path-guide,.crochet-topology-overlay,.crochet-semantic-overlay,.flower-v3-overlay').forEach(n=>n.remove());
  }

  const prev=render;
  render=function(...args){
    if(Array.isArray(items)&&items.some(i=>i?.patternKind==='lace-flower')){
      const v=layout(items);board.dataset.laceFlowerValid=v.ok?'true':'false';if(!v.ok)console.error('Lace flower sector layout',v.errors);
    }
    const out=prev(...args);apply();return out;
  };
  window.layoutLaceFlower=layout;
})();