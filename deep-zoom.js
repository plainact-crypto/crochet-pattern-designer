// Infinite canvas zoom override.
// Use transform scaling instead of CSS zoom so the 2200x2200 layout remains scrollable
// even when the drawing is visually zoomed far out.
applyZoom=function(nextZoom){
  zoom=Math.max(.2,Math.min(3,nextZoom));
  board.style.zoom='';
  board.style.transform=`scale(${zoom})`;
  board.style.transformOrigin='0 0';
  zoomResetBtn.textContent=Math.round(zoom*100)+'%';
};

function centerInfiniteCanvas(){
  if(!boardWrap||!board)return;
  const targetX=(board.clientWidth||2200)/2;
  const targetY=(board.clientHeight||2200)/2;
  boardWrap.scrollLeft=Math.max(0,targetX-boardWrap.clientWidth/2);
  boardWrap.scrollTop=Math.max(0,targetY-boardWrap.clientHeight/2);
}
window.centerInfiniteCanvas=centerInfiniteCanvas;
setTimeout(centerInfiniteCanvas,80);
