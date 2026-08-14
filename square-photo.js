// Photo Mode Beta: readable square/rectangle row drafts.
const pmBuildRowDraftBase = pmBuildRowDraft;
pmBuildRowDraft = function(r){
  const out=[];
  const rows=Math.max(4,Math.min(18,r.rows||10));
  const cols=Math.max(4,Math.min(24,r.cols||10));
  const baseType=r.draftBase||(r.base==='Single Crochet'?'single':(r.base.includes('Half')?'half':'double'));
  const textureType=r.texture?.startsWith('Puff')?'puff':'cluster';
  const raisedSet=new Set((r.raised||[]).map(v=>`${v.row}:${v.col}`));
  const bw=Math.max(board.clientWidth||2200,1200);
  const spacing=58;
  const width=(cols-1)*spacing;
  const startPx=(bw-width)/2;
  const startY=1100-((rows-1)*spacing)/2;
  for(let rr=0;rr<rows;rr++){
    const reverse=rr%2===1;
    for(let cc=0;cc<cols;cc++){
      const logical=reverse?cols-1-cc:cc;
      const px=startPx+logical*spacing;
      const x=px/bw*100;
      const y=startY+rr*spacing;
      const type=raisedSet.has(`${rr}:${logical}`)?textureType:baseType;
      out.push({id:makeId(),type,row:rr,col:cc,x,y,rotation:0,direction:reverse?'w':'e',photoDraft:true,estimated:true,photoShape:r.shape||'Square'});
    }
  }
  return out;
};
