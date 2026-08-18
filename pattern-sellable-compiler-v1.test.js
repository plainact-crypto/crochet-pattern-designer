const assert=require('assert');
const core=require('./pattern-core-v1.js');
const space=require('./pattern-space-coverage-v1.js');
const instructions=require('./pattern-instruction-compiler-v1.js');
const roundClosure=require('./pattern-round-closure-v1.js');
global.validateCrochetPatternGraph=core.validatePatternGraph;
global.validateCrochetSpaceCoverageContracts=space.validateSpaceCoverageContracts;
global.CrochetInstructionCompiler=instructions;
global.CrochetRoundClosure=roundClosure;
const sellable=require('./pattern-sellable-compiler-v1.js');

const minimal={kind:'lace-flower',nodes:[{id:'ring',type:'ring',round:0},{id:'a',type:'single',round:1}],spaces:[],validation:{ok:true},meta:{supportStatus:'BETA'}};
let out=sellable.compile(minimal);
assert.equal(out.ok,false);
assert(out.errors.some(e=>e.code==='EMPIRICAL_SIZE_EVIDENCE_MISSING'));
assert(out.errors.some(e=>e.code==='ROUND_CLOSURE_PROOF_FAILED'));
assert.equal(minimal.sellableCompilation.ok,false);

const valid={empirical:true,method:'physical_sample',finishedWidth:20,unit:'cm',yarn:'DK sample',hook:'3.5 mm',blocking:'blocked dry',sampleId:'lace-dk-001',measuredAt:'2026-08-17T18:30:00+03:00'};
const evidence=sellable.empiricalSizeEvidence({meta:{measurementEvidence:valid}});
assert.equal(evidence.ok,true);
assert.equal(evidence.evidence.finishedWidth,20);
assert.equal(sellable.empiricalSizeEvidence({meta:{measurementEvidence:{...valid,empirical:false}}}).ok,false);
assert.equal(sellable.empiricalSizeEvidence({meta:{measurementEvidence:{...valid,unit:'px'}}}).ok,false);
assert.equal(sellable.empiricalSizeEvidence({meta:{measurementEvidence:{...valid,method:'renderer_estimate'}}}).ok,false);
assert.equal(sellable.empiricalSizeEvidence({meta:{measurementEvidence:{...valid,sampleId:''}}}).ok,false);
assert.equal(sellable.empiricalSizeEvidence({meta:{measurementEvidence:{...valid,measuredAt:'not-a-date'}}}).ok,false);

const closed={kind:'lace-flower',roundPolicy:{1:'joined'},nodes:[{id:'a',type:'single',round:1},{id:'b',type:'single',round:1},{id:'j',type:'slip',round:1,anchor:'b',workedInto:'a',closesRound:true}],spaces:[],validation:{ok:true},constructability:{ok:true},layoutValidation:{ok:true},meta:{measurementEvidence:valid}};
const badClosure={...closed,nodes:closed.nodes.map(n=>({...n,closesRound:false}))};
assert.equal(roundClosure.validateRoundClosure(closed,{requirePolicy:true}).ok,true);
assert.equal(roundClosure.validateRoundClosure(badClosure,{requirePolicy:true}).ok,false);
const badOut=sellable.compile(badClosure);
assert.equal(badOut.ok,false);
assert(badOut.errors.some(e=>e.code==='ROUND_CLOSURE_PROOF_FAILED'));

console.log('sellable compiler fail-closed + physical sample + round closure tests passed');
