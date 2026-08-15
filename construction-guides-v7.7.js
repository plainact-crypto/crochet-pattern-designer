// v7.7 — non-topological construction guides for round transitions.
(()=>{
  const CELL=24, KEY='crochetCad.showConstructionGuidesV77';
  let enabled=localStorage.getItem(KEY)!=='false';
  const NS='http://www.w3.org/2000/svg';

  function snap(){return window.__LACE_LAYOUT_SNAPSHOT;}
  function node(role,sector){return snap()?.nodes?.find(n=>n.role===role&&(sector==null||n.sector===sector));}
  function nodes(role,sector){return (snap()?.nodes||[]).filter(n=>n.role===role&&(sector==null||n.sector===sector));}
  function pt(n){return n?{x:n.gridCol*CELL,y:n.gridRow*CELL}:null;}
  function mid(a,b){return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};}

  function svgEl(tag,attrs={}){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;}
  function addLabel(svg,p,text,dx=10,dy=-10,fill='#26343c'){
    const t=svgEl('text',{x:p.x+dx,y:p.y+dy,fill,'font-size':14,'font-weight':800,'font-family':'system-ui,Segoe UI,sans-serif','paint-order':'stroke','stroke':'white','stroke-width':4,'stroke-linejoin':'round'});t.textContent=text;svg.appendChild(t);
  }
  function addDot(svg,p,color){svg.appendChild(svgEl('circle',{cx:p.x,cy:p.y,r:7,fill:color,stroke:'#fff','stroke-width':3}));}
  function addArrow(svg,a,b,label){
    const l=svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#59666f','stroke-width':2.5,'stroke-dasharray':'8 7','marker-end':'url(#cgArrow)'});svg.appendChild(l);
    if(label)addLabel(svg,mid(a,b),label,8,-8,'#4b5962');
  }

  function draw(){
    const board=document.getElementById('board');if(!board)return;
    board.querySelector('#constructionGuidesV77')?.remove();
    const s=snap();if(!enabled||!s?.validation?.ok)return;
    const all=s.nodes||[], centerSc=all.filter(n=>n.role==='center-sc');
    const r3End=pt(node('inner-petal-stitch-join',5)),r4Start=pt(centerSc[1]);
    const r5End=pt(node('mid-petal-stitch-join',5)),r6Target=pt(node('mid-petal-stitch-join',1));
    const firstR6Arch=nodes('outer-chain',5),r7Space=firstR6Arch.length?pt(firstR6Arch[Math.floor(firstR6Arch.length/2)]):null;
    if(!r3End||!r4Start||!r5End||!r6Target||!r7Space)return;

    const svg=svgEl('svg',{id:'constructionGuidesV77',width:board.scrollWidth||3600,height:board.scrollHeight||3600,viewBox:`0 0 ${board.scrollWidth||3600} ${board.scrollHeight||3600}`});
    svg.style.cssText='position:absolute;inset:0;z-index:60;pointer-events:none;overflow:visible';
    const defs=svgEl('defs'),marker=svgEl('marker',{id:'cgArrow',markerWidth:9,markerHeight:9,refX:8,refY:4.5,orient:'auto',markerUnits:'strokeWidth'});marker.appendChild(svgEl('path',{d:'M0,0 L9,4.5 L0,9 z',fill:'#59666f'}));defs.appendChild(marker);svg.appendChild(defs);

    addDot(svg,r3End,'#d64545'); addLabel(svg,r3End,'R3 end',10,-12,'#a92626');
    addDot(svg,r4Start,'#1f9d55'); addLabel(svg,r4Start,'R4 start',10,20,'#147a40');
    addArrow(svg,r3End,r4Start,'sl st to next unused R1 sc behind petal');

    addDot(svg,r5End,'#d64545'); addDot(svg,{x:r5End.x+2,y:r5End.y+2},'#1f9d55');
    addLabel(svg,r5End,'R5 end / R6 start',12,-14,'#26343c');
    addArrow(svg,r5End,r6Target,'ch 11 behind work → next R5 petal join');

    addDot(svg,r7Space,'#1f9d55'); addLabel(svg,r7Space,'R7 first ch-11 space',12,20,'#147a40');
    addArrow(svg,r5End,r7Space,'after R6: work directly into first ch-11 space');
    board.appendChild(svg);
  }

  function installToggle(){
    const panel=document.getElementById('sizingToolsV71');if(!panel||document.getElementById('constructionToggleV77'))return;
    const row=document.createElement('label');row.id='constructionToggleV77';row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding-top:9px;border-top:1px solid #33414a;color:#dbe5ea;font-weight:700';
    row.innerHTML=`<span>Show construction guides</span><input type="checkbox" ${enabled?'checked':''} style="width:18px;height:18px">`;
    row.querySelector('input').onchange=e=>{enabled=e.target.checked;localStorage.setItem(KEY,String(enabled));draw();};panel.appendChild(row);
  }
  function refresh(){installToggle();draw();}

  window.__CROCHET_CONSTRUCTION_GUIDES_ENABLED=()=>enabled;
  window.__CROCHET_DRAW_CONSTRUCTION_GUIDES=draw;
  document.addEventListener('click',e=>{if(['laceImport','laceGenerate','photoModeBtn','mobilePhotoModeBtn'].includes(e.target?.id))setTimeout(refresh,60)},true);
  setTimeout(refresh,120);
})();
