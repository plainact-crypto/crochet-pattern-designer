// US crochet vocabulary + canonical grid metrics for generated charts.
(() => {
  const CELL = 24;
  const standard = {
    chain:{name:'Chain',abbr:'ch'}, slip:{name:'Slip Stitch',abbr:'sl st'}, single:{name:'Single Crochet',abbr:'sc'},
    half:{name:'Half Double Crochet',abbr:'hdc'}, double:{name:'Double Crochet',abbr:'dc'}, treble:{name:'Treble Crochet',abbr:'tr'},
    dtr:{name:'Double Treble Crochet',abbr:'dtr'}, picot:{name:'Picot',abbr:'picot'}, puff:{name:'Puff Stitch',abbr:'puff'},
    bobble:{name:'Bobble',abbr:'bo'}, cluster:{name:'Cluster',abbr:'cl'}, shell:{name:'Shell',abbr:'sh'}, ring:{name:'Magic Ring',abbr:'MR'}
  };

  // Generated charts are grid-native. The symbol CENTER stays on an integer grid point,
  // while the rendered symbol may span multiple cells according to stitch height.
  const metrics = {
    chain:{cellWidth:1,cellHeight:1,visualWidthPx:20,visualHeightPx:12,anchorOffsetY:0},
    slip:{cellWidth:1,cellHeight:1,visualWidthPx:10,visualHeightPx:10,anchorOffsetY:0},
    single:{cellWidth:1,cellHeight:1,visualWidthPx:18,visualHeightPx:18,anchorOffsetY:8},
    half:{cellWidth:1,cellHeight:1.5,visualWidthPx:18,visualHeightPx:30,anchorOffsetY:14},
    double:{cellWidth:1,cellHeight:2,visualWidthPx:18,visualHeightPx:42,anchorOffsetY:20},
    treble:{cellWidth:1,cellHeight:2.5,visualWidthPx:18,visualHeightPx:54,anchorOffsetY:26},
    dtr:{cellWidth:1,cellHeight:3,visualWidthPx:18,visualHeightPx:66,anchorOffsetY:32},
    picot:{cellWidth:1,cellHeight:1.5,visualWidthPx:20,visualHeightPx:30,anchorOffsetY:14},
    puff:{cellWidth:1.5,cellHeight:2,visualWidthPx:30,visualHeightPx:42,anchorOffsetY:20},
    bobble:{cellWidth:1.5,cellHeight:2,visualWidthPx:30,visualHeightPx:42,anchorOffsetY:20},
    cluster:{cellWidth:1.5,cellHeight:2,visualWidthPx:30,visualHeightPx:42,anchorOffsetY:20},
    shell:{cellWidth:2,cellHeight:2,visualWidthPx:42,visualHeightPx:42,anchorOffsetY:20},
    ring:{cellWidth:1.5,cellHeight:1.5,visualWidthPx:28,visualHeightPx:28,anchorOffsetY:0}
  };
  for (const [type,m] of Object.entries(metrics)) Object.assign(m,{type,centerX:.5,centerY:.5,gridCellPx:CELL,anchorOffsetX:0});

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
    it.gridX=it.gridCol;it.gridY=it.gridRow;it.gridCellPx=CELL;it.coordinateSystem='grid-index';
    it.xPx=it.gridCol*CELL;it.yPx=it.gridRow*CELL;
    it.x=(it.xPx/Math.max(board?.clientWidth||2200,1))*100;it.y=it.yPx;
    return it;
  }

  function validateGeneratedGrid(list){
    const errors=[];
    for(const it of list.filter(i=>i.generatedPattern)){
      normalizeGeneratedItem(it);
      if(!Number.isInteger(it.gridCol)||!Number.isInteger(it.gridRow)) errors.push(`${it.id}: non-integer grid coordinate`);
      if(!metrics[it.type]) errors.push(`${it.id}: missing stitch metrics for ${it.type}`);
      if(Math.abs(it.xPx-it.gridCol*CELL)>.001||Math.abs(it.yPx-it.gridRow*CELL)>.001) errors.push(`${it.id}: pixel position is not derived from grid`);
    }
    return {ok:!errors.length,errors};
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
      board.querySelectorAll('.path-guide,.crochet-topology-overlay,.crochet-semantic-overlay').forEach(n=>n.remove());
      const els=[...board.querySelectorAll('.placed')];
      items.forEach((it,index)=>{
        if(!it.generatedPattern)return;
        const el=els[index]; if(!el)return;
        const m=metrics[it.type]||metrics.single;
        el.style.left=(it.gridCol*CELL)+'px';el.style.top=(it.gridRow*CELL)+'px';
        el.style.width=m.visualWidthPx+'px';el.style.height=m.visualHeightPx+'px';el.style.zIndex='3';
        const svg=el.querySelector('svg');
        if(svg){svg.setAttribute('width',m.visualWidthPx);svg.setAttribute('height',m.visualHeightPx);svg.style.width=m.visualWidthPx+'px';svg.style.height=m.visualHeightPx+'px';svg.style.display='block';}
      });
      const check=validateGeneratedGrid(items);board.dataset.generatedGridValid=check.ok?'true':'false';
      if(!check.ok) console.error('Generated grid validation failed',check.errors);
    };
  }

  window.CROCHET_GRID={cellPx:CELL,coordinateSystem:'integer-grid-index'};
  window.CROCHET_STITCH_METRICS=metrics;
  window.CROCHET_US_STANDARD=standard;
  window.normalizeGeneratedCrochetItem=normalizeGeneratedItem;
  window.validateGeneratedCrochetGrid=validateGeneratedGrid;
})();