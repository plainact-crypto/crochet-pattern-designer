// v6.8 Visual Readability Pass — preserves v6.7 geometry/topology exactly.
(()=>{
  const VERSION='v6.8';
  const CELL=24;
  window.__LACE_VISUAL_VERSION=VERSION;
  document.title=`Crochet Pattern Designer · ${VERSION}`;

  function stampVersion(){
    const brand=document.querySelector('.brandcopy strong');
    if(brand) brand.textContent=`Crochet CAD  ${VERSION}`;
    const sub=document.querySelector('.brandcopy span');
    if(sub) sub.textContent='PATTERN DESIGNER';
    const h=document.querySelector('#photoModeModal .photo-card h2');
    if(h) h.textContent=`5-PETAL LAYERED LACE FLOWER · ${VERSION}`;
    if(window.__LACE_DEBUG_SUMMARY) window.__LACE_DEBUG_SUMMARY.renderer=`lace-flower-renderer-${VERSION}`;
    if(window.__LACE_LAYOUT_SNAPSHOT){
      window.__LACE_LAYOUT_SNAPSHOT.renderer=`lace-flower-renderer-${VERSION}`;
      if(window.__LACE_LAYOUT_SNAPSHOT.debug) window.__LACE_LAYOUT_SNAPSHOT.debug.renderer=`lace-flower-renderer-${VERSION}`;
    }
    if(window.board){
      board.dataset.laceRenderer=VERSION;
      board.dataset.laceVisual=VERSION;
    }
  }

  function injectVisualCss(){
    if(document.getElementById('laceVisualV68Style')) return;
    const s=document.createElement('style');
    s.id='laceVisualV68Style';
    s.textContent=`
      #board .placed[data-lace-visual="v6.8"]{opacity:1!important;}
      #board .placed[data-lace-visual="v6.8"] svg{opacity:1!important;filter:contrast(1.7) brightness(.72);overflow:visible;}
      #board .placed[data-lace-visual="v6.8"] svg path,
      #board .placed[data-lace-visual="v6.8"] svg line,
      #board .placed[data-lace-visual="v6.8"] svg polyline,
      #board .placed[data-lace-visual="v6.8"] svg ellipse,
      #board .placed[data-lace-visual="v6.8"] svg circle{vector-effect:non-scaling-stroke;stroke:#111!important;}
      #board[data-lace-visual="v6.8"]{background-color:#fff;}
    `;
    document.head.appendChild(s);
  }

  function strengthenSymbols(){
    if(!window.items||!window.board) return;
    const els=[...board.querySelectorAll('.placed')];
    items.forEach((it,k)=>{
      if(!it?.generatedPattern||it.patternKind!=='lace-flower'||it.visualJoin) return;
      const el=els[k];
      if(!el) return;
      el.dataset.laceVisual=VERSION;
      el.style.opacity='1';
      const svg=el.querySelector('svg');
      if(!svg) return;
      svg.style.opacity='1';
      svg.style.filter='contrast(1.7) brightness(.72)';
      svg.querySelectorAll('path,line,polyline,ellipse,circle').forEach(node=>{
        const sw=parseFloat(node.getAttribute('stroke-width')||'1');
        if(node.getAttribute('stroke')!=='none'){
          node.setAttribute('stroke','#111');
          node.setAttribute('stroke-width',String(Math.max(sw*1.45,1.35)));
          node.setAttribute('stroke-linecap','round');
          node.setAttribute('stroke-linejoin','round');
        }
      });
    });
  }

  function tightFit(){
    const v=window.__LACE_LAYOUT_SNAPSHOT?.validation;
    if(!v?.ok||!v.wholeBBox||!window.boardWrap) return;
    const b=v.wholeBBox;
    const margin=1.25;
    const minX=(b.minX-margin)*CELL,maxX=(b.maxX+margin)*CELL;
    const minY=(b.minY-margin)*CELL,maxY=(b.maxY+margin)*CELL;
    const vw=boardWrap.clientWidth||900,vh=boardWrap.clientHeight||650;
    const raw=Math.min(vw/(maxX-minX),vh/(maxY-minY));
    const z=Math.max(.52,Math.min(1.65,raw*1.13));
    if(typeof window.applyZoom==='function') window.applyZoom(z);
    boardWrap.scrollLeft=Math.max(0,((minX+maxX)/2)*z-vw/2);
    boardWrap.scrollTop=Math.max(0,((minY+maxY)/2)*z-vh/2);
  }

  function refreshVisuals(){
    stampVersion();
    injectVisualCss();
    strengthenSymbols();
    setTimeout(tightFit,0);
  }

  const previousRender=window.render;
  if(typeof previousRender==='function'){
    window.render=function(...args){
      const out=previousRender.apply(this,args);
      refreshVisuals();
      return out;
    };
  }

  // Make the exported chart use a tighter crop and stronger raster contrast without
  // changing geometry or written instructions.
  const previousCanvas=window.renderCrochetChartCanvas;
  if(typeof previousCanvas==='function'){
    window.renderCrochetChartCanvas=function(){
      const src=previousCanvas();
      if(!src) return src;
      const ctx=src.getContext('2d');
      try{
        const img=ctx.getImageData(0,0,src.width,src.height);
        const d=img.data;
        for(let i=0;i<d.length;i+=4){
          const a=d[i+3]; if(a===0) continue;
          const lum=(d[i]+d[i+1]+d[i+2])/3;
          if(lum<210){
            const v=Math.max(0,Math.min(255,(lum-128)*1.45+108));
            d[i]=d[i+1]=d[i+2]=v;
          }
        }
        ctx.putImageData(img,0,0);
      }catch{}
      return src;
    };
  }

  window.addEventListener('load',()=>setTimeout(refreshVisuals,0),{once:true});
  setTimeout(refreshVisuals,0);
})();
