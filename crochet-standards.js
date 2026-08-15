// Craft Yarn Council-aligned US crochet naming/abbreviation layer.
(() => {
  const standard = {
    chain:{name:'Chain',abbr:'ch'}, slip:{name:'Slip Stitch',abbr:'sl st'}, single:{name:'Single Crochet',abbr:'sc'},
    half:{name:'Half Double Crochet',abbr:'hdc'}, double:{name:'Double Crochet',abbr:'dc'}, treble:{name:'Treble Crochet',abbr:'tr'},
    dtr:{name:'Double Treble Crochet',abbr:'dtr'}, picot:{name:'Picot',abbr:'picot'}, puff:{name:'Puff Stitch',abbr:'puff'},
    bobble:{name:'Bobble',abbr:'bo'}, cluster:{name:'Cluster',abbr:'cl'}, shell:{name:'Shell',abbr:'sh'}, ring:{name:'Magic Ring',abbr:'MR'}
  };
  if(Array.isArray(defs)) for(const d of defs){const s=standard[d.id];if(s){d.name=s.name;d.abbr=s.abbr;}}
  stitchAbbr = function(type){return standard[type]?.abbr || type;};
  stitchName = function(type){return standard[type]?.name || defs.find(d=>d.id===type)?.name || type;};

  // A generated crochet graph is the source of truth for its written pattern.
  if(typeof buildEnglishWrittenPattern==='function'){
    const legacyWritten = buildEnglishWrittenPattern;
    buildEnglishWrittenPattern = function(){
      const g=window.activeCrochetGraph;
      if(g?.validation?.ok && typeof g.written==='string' && g.written.trim()) return g.written;
      return legacyWritten();
    };
    window.buildEnglishWrittenPattern=buildEnglishWrittenPattern;
  }

  // The editor's horizontal path guides are useful for manual placement, but not for radial generated charts.
  if(typeof render==='function'){
    const legacyRender=render;
    render=function(){
      legacyRender();
      if(Array.isArray(items)&&items.some(i=>i.generatedPattern)) board.querySelectorAll('.path-guide').forEach(n=>n.remove());
    };
  }

  // Lacy flower sequencing needs its own chain-from graph semantics. Keep it unavailable until that validator is shipped.
  const lacy=document.querySelector('#genStyle option[value="lacy"]');
  if(lacy){lacy.disabled=true;lacy.textContent='Lacy — coming next';}

  window.CROCHET_US_STANDARD = standard;
})();
