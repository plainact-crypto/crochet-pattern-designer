// Geometry-mode symbol additions and vector refinements.
(() => {
if(!defs.some(d=>d.id==='bobble'))defs.splice(defs.findIndex(d=>d.id==='cluster')+1,0,{id:'bobble',name:'Bobble Stitch',abbr:'bobble'});
const stitchSelectEl=document.getElementById('stitchSelect');if(stitchSelectEl&&!stitchSelectEl.querySelector('option[value="bobble"]')){const o=document.createElement('option');o.value='bobble';o.textContent='Bobble Stitch';const cl=stitchSelectEl.querySelector('option[value="cluster"]');stitchSelectEl.insertBefore(o,cl);}
const baseSvgFor=svgFor;
svgFor=function(type,size,color='#171717'){
 if(type!=='bobble')return baseSvgFor(type,size,color);
 const s=size,sw=Math.max(1.7,size/20);const lobes=[.28,.39,.5,.61,.72].map(x=>`<path d="M ${s*.5} ${s*.84} Q ${s*x} ${s*.42} ${s*x} ${s*.20} Q ${s*x} ${s*.12} ${s*.5} ${s*.12}"/>`).join('');
 return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${lobes}</svg>`;
};
})();