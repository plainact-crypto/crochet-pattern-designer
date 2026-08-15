// US crochet vocabulary + canonical grid metrics for generated charts.
(() => {
  const CELL = 24;
  const standard = {
    chain:{name:'Chain',abbr:'ch'}, slip:{name:'Slip Stitch',abbr:'sl st'}, single:{name:'Single Crochet',abbr:'sc'},
    half:{name:'Half Double Crochet',abbr:'hdc'}, double:{name:'Double Crochet',abbr:'dc'}, treble:{name:'Treble Crochet',abbr:'tr'},
    dtr:{name:'Double Treble Crochet',abbr:'dtr'}, picot:{name:'Picot',abbr:'picot'}, puff:{name:'Puff Stitch',abbr:'puff'},
    bobble:{name:'Bobble',abbr:'bo'}, cluster:{name:'Cluster',abbr:'cl'}, shell:{name:'Shell',abbr:'sh'}, ring:{name:'Magic Ring',abbr:'MR'}
  };

  // Every generated symbol center is locked to an integer grid point.
  // anchorOffsetY describes the symbol's crochet "foot" in its own unrotated local coordinates.
  const metrics = {};
  for (const type of Object.keys(standard)) {
    metrics[type] = {
      type,
      cellWidth:1,
      cellHeight:1,
      centerX:.5,
      centerY:.5,
      visualSizePx:22,
      gridCellPx:CELL,
      anchorOffsetX:0,
      anchorOffsetY:0
    };
  }
  metrics.ring.visualSizePx=24;
  metrics.slip.visualSizePx=14;
  metrics.chain.visualSizePx=20;
  metrics.single.anchorOffsetY=5.5;
  metrics.half.anchorOffsetY=9;
  metrics.double.anchorOffsetY=9.5;
  metrics.treble.anchorOffsetY=10;
  metrics.dtr.anchorOffsetY=10;
  metrics.picot.anchorOffsetY=8;
  metrics.puff.anchorOffsetY=9;
  metrics.cluster.anchorOffsetY=9;
  metrics.shell.anchorOffsetY=9;

  if(Array.isArray(defs)) for(const d of defs){const s=standard[d.id];if(s){d.name=s.name;d.abbr=s.abbr;}}
  stitchAbbr = function(type){return standard[type]?.abbr || type;};
  stitchName = function(type){return standard[type]?.name || defs.find(d=>d.id===type)?.name || type;};

  function normalizeGeneratedItem(it){
    if(!it?.generatedPattern) return it;
    if(!Number.isInteger(it.gridCol)){
      const px=Number.isFinite(it.gridX)?it.gridX:0;
      it.gridCol=Math.round(px/CELL);
    }
    if(!Number.isInteger(it.gridRow)){
      const py=Number.isFinite(it.gridY)?it.gridY:(Number.isFinite(it.y)?it.y:0);
      it.gridRow=Math.round(py/CELL);
    }
    it.gridX=it.gridCol;
    it.gridY=it.gridRow;
    it.gridCellPx=CELL;
    it.coordinateSystem='grid-index';
    it.xPx=it.gridCol*CELL;
    it.yPx=it.gridRow*CELL;
    it.x=(it.xPx/Math.max(board?.clientWidth||2200,1))*100;
    it.y=it.yPx;
    return it;
  }

  function validateGeneratedGrid(list){
    const errors=[];
    for(const it of list.filter(i=>i.generatedPattern)){
      normalizeGeneratedItem(it);
      if(!Number.isInteger(it.gridCol)||!Number.isInteger(it.gridRow)) errors.push(`${it.id}: non-integer grid coordinate`);
      const m=metrics[it.type];
      if(!m) errors.push(`${it.id}: missing stitch metrics for ${it.type}`);
      if(Math.abs(it.xPx-it.gridCol*CELL)>.001||Math.abs(it.yPx-it.gridRow*CELL)>.001) errors.push(`${it.id}: pixel position is not derived from grid`);
    }
    return {ok:!errors.length,errors};
  }

  function footPoint(it){
    const m=metrics[it.type]||metrics.single;
    const a=((it.rotation||0)*Math.PI)/180;
    const ox=m.anchorOffsetX||0, oy=m.anchorOffsetY||0;
    return {
      x:it.gridCol*CELL + ox*Math.cos(a)-oy*Math.sin(a),
      y:it.gridRow*CELL + ox*Math.sin(a)+oy*Math.cos(a)
    };
  }

  function centerPoint(it){return{x:it.gridCol*CELL,y:it.gridRow*CELL};}

  function drawSemanticConnections(){
    if(!Array.isArray(items)||!items.some(i=>i.generatedPattern)) return;
    board.querySelectorAll('.crochet-topology-overlay,.crochet-semantic-overlay').forEach(n=>n.remove());
    const generated=items.filter(i=>i.generatedPattern), byId=new Map(generated.map(i=>[i.id,i]));
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('class','crochet-semantic-overlay');
    svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1';

    const addLine=(a,b,opacity=.5,width=1)=>{
      const line=document.createElementNS(ns,'line');
      line.setAttribute('x1',a.x);line.setAttribute('y1',a.y);line.setAttribute('x2',b.x);line.setAttribute('y2',b.y);
      line.setAttribute('stroke','#a8b1bb');line.setAttribute('stroke-width',width);line.setAttribute('stroke-linecap','round');line.setAttribute('opacity',opacity);
      svg.appendChild(line);
    };

    for(const it of generated){
      if(!it.visualAnchor) continue;
      const target=byId.get(it.visualAnchor); if(!target) continue;
      const targetPoint=centerPoint(target);
      if(it.type==='chain'){
        addLine(centerPoint(it),targetPoint,.34,.9);
      }else if(it.type==='slip'){
        // sl st sits on the target anchor; no extra spoke is needed.
      }else{
        addLine(footPoint(it),targetPoint,it.role==='petal-stitch'?.72:.46,it.role==='petal-stitch'?1.25:1);
      }
    }
    board.insertBefore(svg,board.firstChild);
  }

  if(typeof buildEnglishWrittenPattern==='function'){
    const legacyWritten = buildEnglishWrittenPattern;
    buildEnglishWrittenPattern = function(){
      const g=window.activeCrochetGraph;
      if(g?.validation?.ok && typeof g.written==='string' && g.written.trim()) return g.written;
      return legacyWritten();
    };
    window.buildEnglishWrittenPattern=buildEnglishWrittenPattern;
  }

  if(typeof render==='function'){
    const legacyRender=render;
    render=function(){
      if(Array.isArray(items)) items.forEach(normalizeGeneratedItem);
      legacyRender();
      const generated=Array.isArray(items)?items.filter(i=>i.generatedPattern):[];
      if(!generated.length) return;
      board.querySelectorAll('.path-guide').forEach(n=>n.remove());
      const els=[...board.querySelectorAll('.placed')];
      items.forEach((it,index)=>{
        if(!it.generatedPattern)return;
        const el=els[index]; if(!el)return;
        const m=metrics[it.type]||metrics.single;
        el.style.left=(it.gridCol*CELL)+'px';
        el.style.top=(it.gridRow*CELL)+'px';
        el.style.width=CELL+'px';
        el.style.height=CELL+'px';
        el.style.zIndex='3';
        const svg=el.querySelector('svg');
        if(svg){svg.setAttribute('width',m.visualSizePx);svg.setAttribute('height',m.visualSizePx);svg.style.display='block';}
      });
      drawSemanticConnections();
      const check=validateGeneratedGrid(items);
      board.dataset.generatedGridValid=check.ok?'true':'false';
      if(!check.ok) console.error('Generated grid validation failed',check.errors);
    };
  }

  const lacy=document.querySelector('#genStyle option[value="lacy"]');
  if(lacy){lacy.disabled=true;lacy.textContent='Lacy — coming next';}

  window.CROCHET_GRID={cellPx:CELL,coordinateSystem:'integer-grid-index'};
  window.CROCHET_STITCH_METRICS=metrics;
  window.CROCHET_US_STANDARD=standard;
  window.normalizeGeneratedCrochetItem=normalizeGeneratedItem;
  window.validateGeneratedCrochetGrid=validateGeneratedGrid;
})();