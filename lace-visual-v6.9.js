// v6.9 Visual Readability Pass — preserves v6.7 geometry/topology exactly.
(()=>{
  const VERSION='v6.9';
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
    if(document.getElementById('laceVisualV69Style')) return;
    const s=document.createElement('style');
    s.id='laceVisualV69Style';
    s.textContent=`
      #board .placed[data-lace-visual="v6.9"]{opacity:1!important;}
      #board .placed[data-lace-visual="v6.9"] svg{
        opacity:1!important;
        filter:contrast(2.35) brightness(.58);
        overflow:visible;
        transform:scale(1.22);
        transform-origin:50% 50%;
      }
      #board .placed[data-lace-visual="v6.9"] svg path,
      #board .placed[data-lace-visual="v6.9"] svg line,
      #board .placed[data-lace-visual="v6.9"] svg polyline,
      #board .placed[data-lace-visual="v6.9"] svg ellipse,
      #board .placed[data-lace-visual="v6.9"] svg circle{
        vector-effect:non-scaling-stroke;
        stroke:#050505!important;
      }
      #board[data-lace-visual="v6.9"]{background:#fff!important;}
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
      svg.style.filter='contrast(2.35) brightness(.58)';
      svg.style.transform='scale(1.22)';
      svg.style.transformOrigin='50% 50%';
      svg.style.overflow='visible';
      svg.querySelectorAll('path,line,polyline,ellipse,circle').forEach(node=>{
        const sw=parseFloat(node.getAttribute('stroke-width')||'1');
        if(node.getAttribute('stroke')!=='none'){
          node.setAttribute('stroke','#050505');
          node.setAttribute('stroke-width',String(Math.max(sw*1.95,1.75)));
          node.setAttribute('stroke-linecap','round');
          node.setAttribute('stroke-linejoin','round');
        }
      });
    });
  }

  function readableFit(){
    const v=window.__LACE_LAYOUT_SNAPSHOT?.validation;
    if(!v?.ok||!v.wholeBBox||!window.boardWrap) return;
    const b=v.wholeBBox;
    const margin=.65;
    const minX=(b.minX-margin)*CELL,maxX=(b.maxX+margin)*CELL;
    const minY=(b.minY-margin)*CELL,maxY=(b.maxY+margin)*CELL;
    const vw=boardWrap.clientWidth||900,vh=boardWrap.clientHeight||650;
    const raw=Math.min(vw/(maxX-minX),vh/(maxY-minY));
    const z=Math.max(.72,Math.min(1.85,raw*1.28));
    if(typeof window.applyZoom==='function') window.applyZoom(z);
    boardWrap.scrollLeft=Math.max(0,((minX+maxX)/2)*z-vw/2);
    boardWrap.scrollTop=Math.max(0,((minY+maxY)/2)*z-vh/2);
  }

  function refreshVisuals(){
    stampVersion();
    injectVisualCss();
    strengthenSymbols();
    setTimeout(readableFit,0);
  }

  const previousRender=window.render;
  if(typeof previousRender==='function'){
    window.render=function(...args){
      const out=previousRender.apply(this,args);
      refreshVisuals();
      return out;
    };
  }

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
          if(d[i+3]===0) continue;
          const lum=(d[i]+d[i+1]+d[i+2])/3;
          if(lum<235){
            const v=lum<170?0:Math.max(0,Math.min(255,(lum-150)*1.15+42));
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
