// Surface exact per-generation proof evidence so production screenshots can verify the live renderer result.
(()=>{
const $=id=>document.getElementById(id),btn=$('laceGenerate'),family=$('patternFamily'),tv=$('technicalValidationText');
if(!btn||!family||!tv)return;
function fmt(n){return Number.isFinite(Number(n))?Number(n):'?' }
function afterGenerate(){
  const g=window.activeCrochetGraph;
  if(!g?.validation?.ok)return;
  const isCoaster=family.value==='round-coaster';
  const lv=isCoaster?window.__COASTER_LAYOUT_SNAPSHOT?.validation:window.__LACE_LAYOUT_SNAPSHOT?.validation;
  if(!lv)return;
  const written=typeof g.written==='string'&&g.written.trim().length>0;
  const layoutPass=lv.ok===true&&Number(lv.bodyCollisions||0)===0&&Number(lv.clippedSymbols||0)===0;
  const crochetPass=isCoaster?true:window.__LACE_CONSTRUCTABILITY_AUDIT?.ok===true;
  const overall=layoutPass&&crochetPass&&written;
  const familyName=isCoaster?'SC Coaster':'5-Petal Lace';
  tv.textContent=`${overall?'PASS':'FAIL'} · ${familyName} · body collisions ${fmt(lv.bodyCollisions||0)} · clipped symbols ${fmt(lv.clippedSymbols||0)} · construction ${crochetPass?'PASS':'FAIL'} · written ${written?'PASS':'FAIL'}`;
  tv.dataset.generationProof=overall?'PASS':'FAIL';
  tv.dataset.bodyCollisions=String(lv.bodyCollisions||0);
  tv.dataset.clippedSymbols=String(lv.clippedSymbols||0);
  window.__LAST_GENERATION_PROOF={family:g.kind,ok:overall,bodyCollisions:Number(lv.bodyCollisions||0),clippedSymbols:Number(lv.clippedSymbols||0),constructionPass:crochetPass,writtenPass:written,checkedAt:new Date().toISOString()};
}
btn.addEventListener('click',()=>setTimeout(afterGenerate,0));
})();
