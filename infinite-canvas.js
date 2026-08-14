function centerCanvasOnItems(padding=80){
  if(!items?.length||!boardWrap||!board)return;
  const bw=board.clientWidth;
  const xs=items.map(i=>(Number(i.x)||50)/100*bw);
  const ys=items.map(i=>Number(i.y)||0);
  const minX=Math.min(...xs)-padding,maxX=Math.max(...xs)+padding;
  const minY=Math.min(...ys)-padding,maxY=Math.max(...ys)+padding;
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  const vw=boardWrap.clientWidth,vh=boardWrap.clientHeight;
  boardWrap.scrollLeft=Math.max(0,cx*zoom-vw/2);
  boardWrap.scrollTop=Math.max(0,cy*zoom-vh/2);
}
window.centerCanvasOnItems=centerCanvasOnItems;
const photoImportCenterBtn=document.getElementById('photoImportDraftBtn');
photoImportCenterBtn?.addEventListener('click',()=>setTimeout(()=>centerCanvasOnItems(120),120));
const chartImportCenterBtn=document.getElementById('analyzeImportBtn');
chartImportCenterBtn?.addEventListener('click',()=>setTimeout(()=>{if(items?.length)centerCanvasOnItems(120)},1000));
