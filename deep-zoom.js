// Infinite canvas zoom override: allow users to zoom much farther out than the legacy 50% floor.
applyZoom=function(nextZoom){
  zoom=Math.max(.2,Math.min(3,nextZoom));
  board.style.zoom=zoom;
  zoomResetBtn.textContent=Math.round(zoom*100)+'%';
};

function centerInfiniteCanvas(){
  if(!boardWrap||!board)return;
  const targetX=(board.scrollWidth||2200)/2;
  const targetY=(board.scrollHeight||2200)/2;
  boardWrap.scrollLeft=Math.max(0,targetX*zoom-boardWrap.clientWidth/2);
  boardWrap.scrollTop=Math.max(0,targetY*zoom-boardWrap.clientHeight/2);
}
window.centerInfiniteCanvas=centerInfiniteCanvas;
setTimeout(centerInfiniteCanvas,80);
