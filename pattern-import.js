const patternImportBtn=document.getElementById('patternImportBtn');
const mobilePatternImportBtn=document.getElementById('mobilePatternImportBtn');
const patternImportModal=document.getElementById('patternImportModal');
const patternText=document.getElementById('patternText');
const patternFile=document.getElementById('patternFile');
const patternParseBtn=document.getElementById('patternParseBtn');
const patternImportMessage=document.getElementById('patternImportMessage');
const patternClose=document.querySelector('[data-pattern-close]');

function openPatternImport(){patternImportModal.hidden=false;document.body.style.overflow='hidden';patternImportMessage.textContent=''}
function closePatternImport(){patternImportModal.hidden=true;document.body.style.overflow=''}
patternImportBtn?.addEventListener('click',openPatternImport);
mobilePatternImportBtn?.addEventListener('click',openPatternImport);
patternClose?.addEventListener('click',closePatternImport);
patternImportModal?.addEventListener('click',e=>{if(e.target===patternImportModal)closePatternImport()});

patternFile?.addEventListener('change',async()=>{
  const file=patternFile.files?.[0];if(!file)return;
  patternImportMessage.textContent='Reading file...';
  try{
    let text='';
    if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')) text=await extractPdfText(file);
    else text=await file.text();
    patternText.value=text.trim();
    patternImportMessage.textContent=text.trim()?'Pattern text loaded. Review it, then import.':'No readable text was found in this file.';
  }catch(err){patternImportMessage.textContent=err.message||'Could not read this file.'}
});

async function extractPdfText(file){
  const version='5.7.284';
  const pdfjs=await import(`https://unpkg.com/pdfjs-dist@${version}/build/pdf.min.mjs`);
  pdfjs.GlobalWorkerOptions.workerSrc=`https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  const data=new Uint8Array(await file.arrayBuffer());
  const doc=await pdfjs.getDocument({data,wasmUrl:`https://unpkg.com/pdfjs-dist@${version}/wasm/`}).promise;
  const pages=[];
  for(let p=1;p<=doc.numPages;p++){
    const page=await doc.getPage(p);
    const content=await page.getTextContent();
    pages.push(content.items.map(i=>i.str).join(' '));
  }
  return pages.join('\n');
}

const stitchMap={
  'sl st':'slip','slst':'slip','slip':'slip','ch':'chain','chain':'chain','sc':'single','single crochet':'single','hdc':'half','half double crochet':'half','dc':'double','double crochet':'double','tr':'treble','treble crochet':'treble','dtr':'dtr','double treble crochet':'dtr','puff':'puff','bobble':'puff','cluster':'cluster','shell':'shell','mr':'ring','magic ring':'ring'
};

function normalizeWritten(text){return text.replace(/[–—]/g,'-').replace(/\u00d7/g,'x').replace(/\s+/g,' ').trim()}
function expandToken(raw,defaultType='single'){
  let token=normalizeWritten(raw.toLowerCase()).replace(/[.]/g,'').trim();
  if(!token)return[];
  let mult=1;
  const tail=token.match(/(?:x|×|\*)\s*(\d+)$/);if(tail){mult=+tail[1];token=token.slice(0,tail.index).trim()}
  const head=token.match(/^(\d+)\s*(.*)$/);let count=1;if(head){count=+head[1];token=head[2].trim()||defaultType}
  if(token==='inc'||token==='increase')return Array(count*2*mult).fill(defaultType);
  if(token==='dec'||token==='decrease')return Array(count*mult).fill(defaultType);
  let type=null;
  for(const [k,v] of Object.entries(stitchMap)){if(token===k||token.startsWith(k+' ')){type=v;break}}
  if(!type){
    const compact=token.replace(/\s/g,'');
    for(const [k,v] of Object.entries(stitchMap)){if(compact===k.replace(/\s/g,'')){type=v;break}}
  }
  if(!type)return[];
  return Array(Math.max(1,count*mult)).fill(type);
}

function parseWrittenPattern(text){
  const raw=text.replace(/\r/g,'\n');
  let lines=raw.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  if(lines.length===1){
    const pieces=raw.split(/(?=(?:row|round|rnd|r)\s*\d+\s*[:.-])/ig).map(s=>s.trim()).filter(Boolean);
    if(pieces.length>1)lines=pieces;
  }
  const parsed=[];let inferredRound=false;
  for(const line of lines){
    const m=line.match(/^\s*(row|round|rnd|r)?\s*(\d+)?\s*[:.-]?\s*(.*)$/i);if(!m)continue;
    const label=(m[1]||'').toLowerCase();if(label==='round'||label==='rnd')inferredRound=true;
    const body=(m[3]||line).replace(/\([^)]*\)/g,s=>s); // preserve grouped text for rough parsing
    let parts=body.split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
    const stitches=[];
    for(const part of parts){
      const grp=part.match(/^\[(.*)\]\s*(?:x|\*)\s*(\d+)$/i)||part.match(/^\((.*)\)\s*(?:x|\*)\s*(\d+)$/i);
      if(grp){for(let n=0;n<+grp[2];n++)for(const inner of grp[1].split(/[,;]+/))stitches.push(...expandToken(inner,stitches.at(-1)||'single'));continue}
      stitches.push(...expandToken(part,stitches.at(-1)||'single'));
    }
    if(stitches.length)parsed.push(stitches);
  }
  if(!parsed.length)throw new Error('I could not recognize crochet rows/rounds. Try text like: R1: 6 sc or Row 1: ch 12, sc 11.');
  return{rows:parsed,isRound:inferredRound};
}

function buildWrittenDraft(parsed){
  const out=[],bw=Math.max(board.clientWidth||2200,1200),cx=bw/2,cy=1100;
  if(parsed.isRound){
    for(let rr=0;rr<parsed.rows.length;rr++){
      const row=parsed.rows[rr],radius=Math.max(52,58*(rr+1));
      for(let i=0;i<row.length;i++){
        const a=-Math.PI/2+(i/row.length)*Math.PI*2;
        out.push({id:makeId(),type:row[i],row:rr+1,round:rr+1,col:i,x:(cx+Math.cos(a)*radius)/bw*100,y:cy+Math.sin(a)*radius,rotation:row[i]==='single'?0:((a*180/Math.PI)+90+360)%360,direction:'e',writtenDraft:true});
      }
    }
  }else{
    const maxCols=Math.max(...parsed.rows.map(r=>r.length)),spacing=58,startX=cx-((maxCols-1)*spacing)/2,startY=cy-((parsed.rows.length-1)*spacing)/2;
    parsed.rows.forEach((row,rr)=>{const reverse=rr%2===1;row.forEach((type,cc)=>{const logical=reverse?row.length-1-cc:cc;out.push({id:makeId(),type,row:rr,col:cc,x:(startX+logical*spacing)/bw*100,y:startY+rr*spacing,rotation:0,direction:reverse?'w':'e',writtenDraft:true})})});
  }
  return out;
}

patternParseBtn?.addEventListener('click',()=>{
  try{
    const parsed=parseWrittenPattern(patternText.value);
    if(items.length&&!confirm('Replace the current board with this written pattern draft?'))return;
    snapshot();items=buildWrittenDraft(parsed);currentRow=0;currentCol=items.length;selected=null;placementRotation=0;render();applyZoom(.5);setTimeout(()=>window.centerCanvasOnItems?.(140),100);closePatternImport();
    rowStatus.textContent=`Written Pattern · ${parsed.rows.length} ${parsed.isRound?'rounds':'rows'} · ${items.length} stitches`;
    selectedStatus.textContent='Editable written-pattern draft';
  }catch(err){patternImportMessage.textContent=err.message||'Could not parse pattern.'}
});
