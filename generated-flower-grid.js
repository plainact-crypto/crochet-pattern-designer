// Flower Chart Renderer v3 — crochet-chart-native, grid-locked flower rendering.
// Source of truth: integer gridCol/gridRow on the board's 24px grid.
(() => {
  const CELL = 24;
  if (typeof render !== 'function' || typeof board === 'undefined') return;
  if (globalThis.__FLOWER_CHART_RENDERER_V3__) return;
  globalThis.__FLOWER_CHART_RENDERER_V3__ = true;

  const ri=v=>Math.round(v);
  const angle=(i,n)=>-Math.PI/2+i*Math.PI*2/n;
  const polar=(cx,cy,r,a)=>({col:ri(cx+Math.cos(a)*r),row:ri(cy+Math.sin(a)*r)});

  function setGrid(it,col,row){
    it.gridCol=ri(col);it.gridRow=ri(row);it.gridX=it.gridCol;it.gridY=it.gridRow;
    it.gridCellPx=CELL;it.coordinateSystem='grid-index';it.xPx=it.gridCol*CELL;it.yPx=it.gridRow*CELL;
    it.x=(it.xPx/Math.max(board.clientWidth||2200,1))*100;it.y=it.yPx;
  }

  // Compact fan: centres stay close to the common ch-space; symbol height is NOT derived from this distance.
  function petalTemplate(len){
    if(len===5)return[{t:-2,r:1},{t:-1,r:1},{t:0,r:2},{t:1,r:1},{t:2,r:1}];
    if(len===8)return[{t:-3,r:1},{t:-2,r:1},{t:-1,r:2},{t:0,r:2},{t:1,r:2},{t:2,r:2},{t:3,r:1},{t:4,r:1}];
    return[{t:-2,r:1},{t:-1,r:1},{t:0,r:2},{t:1,r:2},{t:2,r:1},{t:3,r:1}];
  }

  function layout(list){
    const gen=list.filter(i=>i?.generatedPattern&&i.patternKind==='flower');
    if(!gen.length)return{ok:true,errors:[]};
    const center=gen.find(i=>i.role==='start'&&i.type==='ring');if(!center)return{ok:false,errors:['Missing Magic Ring.']};
    const cx=Number.isInteger(center.gridCol)?center.gridCol:ri((board.clientWidth||2200)/CELL/2),cy=Number.isInteger(center.gridRow)?center.gridRow:21;
    setGrid(center,cx,cy);
    const P=window.activeCrochetGraph?.params?.petals||Math.max(1,...gen.map(i=>Number(i.petal)||0));
    const anchors=new Map(),spaces=new Map();

    for(let p=1;p<=P;p++){
      const sc=gen.find(i=>i.role==='petal-anchor'&&i.petal===p);if(!sc)continue;
      const a=angle(p-1,P),q=polar(cx,cy,2,a);setGrid(sc,q.col,q.row);sc.rotation=a*180/Math.PI+90;anchors.set(p,sc);
    }

    for(let p=1;p<=P;p++){
      const a0=angle(p-1,P),a1=angle(p%P,P);let d=a1-a0;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;
      const chains=gen.filter(i=>i.type==='chain'&&i.sourceRegion===`space-${p}`).sort((a,b)=>(a.orderInPath??a.col??0)-(b.orderInPath??b.col??0));
      chains.forEach((ch,k)=>{const t=(k+1)/(chains.length+1),aa=a0+d*t,q=polar(cx,cy,4,aa);setGrid(ch,q.col,q.row);ch.rotation=aa*180/Math.PI+90});
      const mid=chains[Math.floor(chains.length/2)]||chains[0];if(mid)spaces.set(p,mid);
    }

    const r1Join=gen.find(i=>i.round===1&&i.role==='join'&&i.type==='slip');if(r1Join&&anchors.get(1))setGrid(r1Join,anchors.get(1).gridCol,anchors.get(1).gridRow);

    for(let p=1;p<=P;p++){
      const sp=spaces.get(p);if(!sp)continue;
      const a0=angle(p-1,P),a1=angle(p%P,P);let d=a1-a0;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;
      const axis=a0+d/2,ux=Math.cos(axis),uy=Math.sin(axis),tx=-Math.sin(axis),ty=Math.cos(axis);
      const petal=gen.filter(i=>i.role==='petal-stitch'&&i.petal===p).sort((a,b)=>(a.orderInPath??a.col??0)-(b.orderInPath??b.col??0));
      const tpl=petalTemplate(petal.length);
      petal.forEach((st,k)=>{const z=tpl[k]||tpl[tpl.length-1];setGrid(st,sp.gridCol+tx*z.t+ux*z.r,sp.gridRow+ty*z.t+uy*z.r);st.rotation=Math.atan2(sp.gridRow-st.gridRow,sp.gridCol-st.gridCol)*180/Math.PI-90;st.v3FanAnchorId=sp.id});
      const sep=gen.find(i=>i.petal===p&&(i.role==='petal-separator'||i.role==='finish')),na=anchors.get((p%P)+1);if(sep&&na)setGrid(sep,na.gridCol,na.gridRow);
    }

    const errors=[];
    for(const it of gen){if(!Number.isInteger(it.gridCol)||!Number.isInteger(it.gridRow))errors.push(`${it.id}: non-integer grid`);if(it.xPx!==it.gridCol*CELL||it.yPx!==it.gridRow*CELL)errors.push(`${it.id}: grid/pixel mismatch`)}
    return{ok:!errors.length,errors};
  }

  function svgEl(name,attrs={}){const e=document.createElementNS('http://www.w3.org/2000/svg',name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e}
  const FIXED_LENGTH={half:24,double:32,treble:40,dtr:46};

  function drawFixedPost(svg,it,anchor,type){
    const cx=it.gridCol*CELL,cy=it.gridRow*CELL,ax=anchor.gridCol*CELL,ay=anchor.gridRow*CELL;
    let vx=cx-ax,vy=cy-ay,L=Math.hypot(vx,vy)||1;vx/=L;vy/=L;
    const len=FIXED_LENGTH[type]||28,half=len/2;
    const bx=cx-vx*half,by=cy-vy*half,tx=cx+vx*half,ty=cy+vy*half,nx=-vy,ny=vx;
    const g=svgEl('g',{stroke:'#171717','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round',fill:'none'});
    // Small neutral construction bridge only when the canonical symbol foot does not touch the shared ch-space.
    const bridge=Math.hypot(bx-ax,by-ay);
    if(bridge>3)g.appendChild(svgEl('line',{x1:ax,y1:ay,x2:bx,y2:by,'stroke-width':1.15,opacity:.65}));
    g.appendChild(svgEl('line',{x1:bx,y1:by,x2:tx,y2:ty}));
    const cross=(f,w)=>{const x=bx+(tx-bx)*f,y=by+(ty-by)*f;g.appendChild(svgEl('line',{x1:x-nx*w,y1:y-ny*w,x2:x+nx*w,y2:y+ny*w}))};
    if(type==='half')cross(.42,4.5);
    if(type==='double'){cross(.34,4.5);const x=bx+(tx-bx)*.60,y=by+(ty-by)*.60;g.appendChild(svgEl('line',{x1:x-nx*4-vx*2.5,y1:y-ny*4-vy*2.5,x2:x+nx*4+vx*2.5,y2:y+ny*4+vy*2.5}))}
    if(type==='treble'||type==='dtr'){cross(.28,4.5);const fs=type==='dtr'?[.48,.64,.78]:[.52,.70];for(const f of fs){const x=bx+(tx-bx)*f,y=by+(ty-by)*f;g.appendChild(svgEl('line',{x1:x-nx*4-vx*2.5,y1:y-ny*4-vy*2.5,x2:x+nx*4+vx*2.5,y2:y+ny*4+vy*2.5}))}}
    svg.appendChild(g);
  }

  function drawSingle(svg,it,anchor){
    const x=it.gridCol*CELL,y=it.gridRow*CELL,s=5.5,g=svgEl('g',{stroke:'#171717','stroke-width':1.7,'stroke-linecap':'round'});
    g.appendChild(svgEl('line',{x1:x-s,y1:y-s,x2:x+s,y2:y+s}));g.appendChild(svgEl('line',{x1:x+s,y1:y-s,x2:x-s,y2:y+s}));
    if(anchor){const ax=anchor.gridCol*CELL,ay=anchor.gridRow*CELL,dx=x-ax,dy=y-ay,L=Math.hypot(dx,dy)||1,fx=x-dx/L*8,fy=y-dy/L*8;if(Math.hypot(fx-ax,fy-ay)>3)g.appendChild(svgEl('line',{x1:ax,y1:ay,x2:fx,y2:fy,'stroke-width':1.1,opacity:.65}))}
    svg.appendChild(g);
  }

  function drawV3Overlay(){
    board.querySelectorAll('.flower-v3-overlay,.crochet-topology-overlay,.crochet-semantic-overlay').forEach(n=>n.remove());
    const gen=items.filter(i=>i?.generatedPattern&&i.patternKind==='flower');if(!gen.length)return;
    const byId=new Map(gen.map(i=>[i.id,i])),svg=svgEl('svg',{class:'flower-v3-overlay',width:board.scrollWidth,height:board.scrollHeight});
    svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:4';
    for(const it of gen.filter(i=>i.role==='petal-stitch')){const a=byId.get(it.v3FanAnchorId);if(!a)continue;if(it.type==='single')drawSingle(svg,it,a);else if(['half','double','treble','dtr'].includes(it.type))drawFixedPost(svg,it,a,it.type)}
    board.appendChild(svg);
  }

  function applyDom(){
    const els=[...board.querySelectorAll('.placed')];
    items.forEach((it,index)=>{if(!it?.generatedPattern||it.patternKind!=='flower'||!Number.isInteger(it.gridCol)||!Number.isInteger(it.gridRow))return;const el=els[index];if(!el)return;el.style.left=`${it.gridCol*CELL}px`;el.style.top=`${it.gridRow*CELL}px`;el.style.width=`${CELL}px`;el.style.height=`${CELL}px`;el.style.zIndex='5';const s=el.querySelector('svg');if(s)s.style.visibility=it.role==='petal-stitch'?'hidden':'visible'});
    board.querySelectorAll('.path-guide,.crochet-topology-overlay,.crochet-semantic-overlay').forEach(n=>n.remove());drawV3Overlay();
  }

  const previousRender=render;
  render=function(...args){if(Array.isArray(items)&&items.some(i=>i?.generatedPattern&&i.patternKind==='flower')){const check=layout(items);board.dataset.flowerV3Valid=check.ok?'true':'false';if(!check.ok)console.error('Flower Renderer v3 validation failed',check.errors)}const out=previousRender(...args);applyDom();return out};
  window.layoutFlowerChartV3=layout;
})();