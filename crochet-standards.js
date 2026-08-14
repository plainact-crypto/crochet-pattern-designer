// Craft Yarn Council-aligned US crochet naming/abbreviation layer.
(() => {
  const standard = {
    chain:{name:'Chain',abbr:'ch'}, slip:{name:'Slip Stitch',abbr:'sl st'}, single:{name:'Single Crochet',abbr:'sc'},
    half:{name:'Half Double Crochet',abbr:'hdc'}, double:{name:'Double Crochet',abbr:'dc'}, treble:{name:'Treble Crochet',abbr:'tr'},
    dtr:{name:'Double Treble Crochet',abbr:'dtr'}, picot:{name:'Picot',abbr:'picot'}, puff:{name:'Puff Stitch',abbr:'puff'},
    bobble:{name:'Bobble',abbr:'bo'}, cluster:{name:'Cluster',abbr:'cl'}, shell:{name:'Shell',abbr:'sh'}, ring:{name:'Magic Ring',abbr:'MR'}
  };
  if(Array.isArray(defs)) for(const d of defs){const s=standard[d.id];if(s){d.name=s.name;d.abbr=s.abbr;}}
  // export.js resolves this function at export time, so keep every chart/PDF legend on the same vocabulary.
  stitchAbbr = function(type){return standard[type]?.abbr || type;};
  stitchName = function(type){return standard[type]?.name || defs.find(d=>d.id===type)?.name || type;};
  window.CROCHET_US_STANDARD = standard;
})();
