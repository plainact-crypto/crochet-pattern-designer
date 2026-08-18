// Surface exact per-generation proof evidence so production screenshots verify the live renderer and family validator result.
(()=>{
const $=id=>document.getElementById(id),btn=$('laceGenerate'),family=$('patternFamily'),tv=$('technicalValidationText');
if(!btn||!family||!tv)return;
function fmt(n){return Number.isFinite(Number(n))?Number(n):'?'}
function familyConstructionPass(g,isCoaster){
  if(!g?.validation?.ok)return false;
  if(g.roundClosureValidation?.ok===false)return false;
  if(isCoaster)return g.kind==='round-coaster'&&g.validation.ok===true&&g.roundClosureValidation?.ok===true;
  return g.kind==='lace-flower'&&g.validation.ok===true&&window.__LACE_CONSTRUCTABILITY_AUDIT?.ok===true;
}
function afterGenerate(){
  const g=window.activeCrochetGraph;
  if(!g)return;
  const isCoaster=family.value==='round-coaster';
  const lv=isCoaster?window.__COASTER_LAYOUT_SNAPSHOT?.validation:window.__LACE_LAYOUT_SNAPSHOT?.validation;
  const written=typeof g.written==='string'&&g.written.trim().length>0;
  const layoutPass=!!lv&&lv.ok===true&&Number(lv.bodyCollisions||0)===0&&Number(lv.clippedSymbols||0)===0;
  const crochetPass=familyConstructionPass(g,isCoaster);
  const overall=layoutPass&&crochetPass&&written;
  const familyName=isCoaster?'SC Coaster':'5-Petal Lace';
  tv.textContent=`${overall?'PASS':'FAIL'} · ${familyName} · body collisions ${fmt(lv?.bodyCollisions)} · clipped symbols ${fmt(lv?.clippedSymbols)} · construction ${crochetPass?'PASS':'FAIL'} · written ${written?'PASS':'FAIL'}`;
  tv.dataset.generationProof=overall?'PASS':'FAIL';
  tv.dataset.bodyCollisions=String(lv?.bodyCollisions??'');
  tv.dataset.clippedSymbols=String(lv?.clippedSymbols??'');
  window.__LAST_GENERATION_PROOF={family:g.kind,ok:overall,layoutPass,bodyCollisions:Number(lv?.bodyCollisions),clippedSymbols:Number(lv?.clippedSymbols),constructionPass:crochetPass,writtenPass:written,roundClosurePass:g.roundClosureValidation?.ok===true,checkedAt:new Date().toISOString()};
}
btn.addEventListener('click',()=>setTimeout(afterGenerate,0));
})();
