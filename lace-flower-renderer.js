// Lace Flower Renderer v3 — compact local-grid sector layout.
// Build ONE coherent petal in local (radial,tangent) grid coordinates, then rotate x5.
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
  function orient(it,cx,cy){const a=Math.atan2(it.gridRow-cy,it.gridCol-cx);it.rotation=a*180/Math.PI+90}
  function sorted(gen,role,sector){return gen.filter(i=>i.role===role&&(sector==null||i.sector===sector)).sort((a,b)=>(a.orderInPath??0)-(b.orderInPath??0))}

  // Dense local template. Values are GRID CELLS, not pixels.
  const tpl={
    innerChain:[[-2,3],[-1,4],[0,4],[1,4],[2,3]],
    innerPetal:[[-3,4],[-2,5],[-1,5],[-1,6],[0,7],[1,6],[1,5],[2,5],[3,4]],
    outerChain:[[-4,6],[-3,6],[-2,7],[-1,7],[0,8],[1,7],[2,7],[3,6],[4,6]],
    outerPetal:[[-5,7],[-4,8],[-3,8],[-2,9],[-1,9],[-1,10],[0,12],[1,10],[1,9],[2,9],[3,8],[4,8],[5,7]]
  };

  function putTemplate(items,template,cx,cy,axis){
    items.forEach((it,k)=>{
      const [t,r]=template[k]||template[template.length-1];
      const q=local(cx,cy,axis,r,t);set(it,q.c,q.r);orient(it,cx,cy);
    });
  }

  function layout(list){
    const gen=list.filter(i=>i?.generatedPattern&&i.patternKind==='lace-flower');
    if(!gen.length)return{ok:true,errors:[]};
    const center=gen.find(i=>i.role==='start');if(!center)return{ok:false,errors:['Missing center']};
    const cx=46,cy=24;set(center,cx,cy,0);

    // R1 compact 10-sc center.
    const centerSc=gen.filter(i=>i.role==='center-sc').sort((a,b)=>(a.centerIndex??a.orderInPath??0)-(b.centerIndex??b.orderInPath??0));
    centerSc.forEach((it,i)=>{const a=-Math.PI/2+i*TAU/10,q=local(cx,cy,a,2,0);set(it,q.c,q.r,a*180/Math.PI+90)});
    const r1Join=gen.find(i=>i.role==='r1-join');if(r1Join&&centerSc[0])set(r1Join,centerSc[0].gridCol,centerSc[0].gridRow,centerSc[0].rotation||0);

    const nodeMap=new Map(gen.map(i=>[i.id,i]));
    for(let s=1;s<=5;s++){
      const axis=axisFor(s);
      const evenTarget=centerSc[(s*2)%10];
      const oddTarget=centerSc[(s*2+1)%10];

      // R2/R3 live close together as one inner lobe.
      putTemplate(sorted(gen,'inner-chain',s),tpl.innerChain,cx,cy,axis);
      const innerArchJoin=gen.find(i=>i.role==='inner-arch-join'&&i.sector===s);if(innerArchJoin&&evenTarget)set(innerArchJoin,evenTarget.gridCol,evenTarget.gridRow,evenTarget.rotation||0);
      putTemplate(sorted(gen,'inner-petal-stitch',s),tpl.innerPetal,cx,cy,axis);
      const innerJoin=gen.find(i=>i.role==='inner-petal-join'&&i.sector===s);if(innerJoin&&evenTarget)set(innerJoin,evenTarget.gridCol,evenTarget.gridRow,evenTarget.rotation||0);

      // R4/R5 wrap immediately outside R3, forming the same physical petal.
      putTemplate(sorted(gen,'outer-chain',s),tpl.outerChain,cx,cy,axis);
      const outerArchJoin=gen.find(i=>i.role==='outer-arch-join'&&i.sector===s);if(outerArchJoin&&oddTarget)set(outerArchJoin,oddTarget.gridCol,oddTarget.gridRow,oddTarget.rotation||0);
      putTemplate(sorted(gen,'outer-petal-stitch',s),tpl.outerPetal,cx,cy,axis);
      const outerJoin=gen.find(i=>i.role==='outer-petal-join'&&i.sector===s);if(outerJoin&&oddTarget)set(outerJoin,oddTarget.gridCol,oddTarget.gridRow,oddTarget.rotation||0);

      // R6 hugs R5 exactly one grid step outward. Tip has three sc spread tangentially.
      const ux=Math.cos(axis),uy=Math.sin(axis),tx=-Math.sin(axis),ty=Math.cos(axis);
      const edge=sorted(gen,'edge-sc',s);
      edge.forEach(it=>{
        const base=nodeMap.get(it.workedInto);if(!base)return;
        let tang=0;if(it.edgeBaseOrder===6)tang=(it.edgeRepeat-1);
        set(it,base.gridCol+ux+tx*tang,base.gridRow+uy+ty*tang);orient(it,cx,cy);
      });
      const edgeJoin=gen.find(i=>i.role==='edge-join'&&i.sector===s);if(edgeJoin&&edge[0])set(edgeJoin,edge[0].gridCol,edge[0].gridRow,edge[0].rotation||0);
    }

    // Hard validation: integer grid only; never auto-move geometry.
    const errors=[],occ=new Map();
    for(const it of gen){
      if(!Number.isInteger(it.gridCol)||!Number.isInteger(it.gridRow)){errors.push(`${it.id}: non integer grid`);continue}
      if(it.type==='slip')continue;
      const key=`${it.gridCol},${it.gridRow}`;const arr=occ.get(key)||[];arr.push(it);occ.set(key,arr);
    }
    for(const [k,arr] of occ){
      // Edge sc may intentionally share a parent-adjacent grid center at the pointed tip; all other collisions are invalid.
      const nonEdge=arr.filter(i=>i.role!=='edge-sc');
      if(nonEdge.length>1)errors.push(`Grid collision ${k}: ${nonEdge.map(i=>i.role).join(',')}`);
    }
    return{ok:!errors.length,errors};
  }

  function apply(){
    const els=[...board.querySelectorAll('.placed')];
    items.forEach((it,i)=>{
      if(!it?.generatedPattern||it.patternKind!=='lace-flower')return;
      const el=els[i];if(!el)return;
      el.style.left=`${it.gridCol*CELL}px`;el.style.top=`${it.gridRow*CELL}px`;
      el.style.width=`${CELL}px`;el.style.height=`${CELL}px`;
      el.style.transform=`translate(-50%,-50%) rotate(${it.rotation||0}deg)`;el.style.zIndex='3';
      const svg=el.querySelector('svg');if(svg){
        const m=window.CROCHET_STITCH_METRICS?.[it.type];const size=m?.visualSizePx||22;
        svg.setAttribute('width',size);svg.setAttribute('height',size);svg.style.visibility='visible';
      }
    });
    board.querySelectorAll('.path-guide,.crochet-topology-overlay,.crochet-semantic-overlay,.flower-v3-overlay').forEach(n=>n.remove());
  }

  const prev=render;
  render=function(...args){
    if(Array.isArray(items)&&items.some(i=>i?.patternKind==='lace-flower')){
      const v=layout(items);board.dataset.laceFlowerValid=v.ok?'true':'false';if(!v.ok)console.error('Lace flower v3 layout',v.errors);
    }
    const out=prev(...args);apply();return out;
  };
  window.layoutLaceFlower=layout;
})();