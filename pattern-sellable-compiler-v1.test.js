const assert=require('assert');
const core=require('./pattern-core-v1.js');
const space=require('./pattern-space-coverage-v1.js');
const instructions=require('./pattern-instruction-compiler-v1.js');
global.validateCrochetPatternGraph=core.validatePatternGraph;
global.validateCrochetSpaceCoverageContracts=space.validateSpaceCoverageContracts;
global.CrochetInstructionCompiler=instructions;
const sellable=require('./pattern-sellable-compiler-v1.js');

const minimal={kind:'lace-flower',nodes:[{id:'ring',type:'ring',round:0}],spaces:[],validation:{ok:true},meta:{supportStatus:'BETA'}};
let out=sellable.compile(minimal);
assert.equal(out.ok,false);
assert(out.errors.some(e=>e.code==='EMPIRICAL_SIZE_EVIDENCE_MISSING'));
assert.equal(minimal.sellableCompilation.ok,false);

const evidence=sellable.empiricalSizeEvidence({meta:{measurementEvidence:{empirical:true,finishedWidth:20,unit:'cm',yarn:'DK sample',hook:'3.5 mm',blocking:'blocked dry'}}});
assert.equal(evidence.ok,true);
assert.equal(evidence.evidence.finishedWidth,20);
assert.equal(sellable.empiricalSizeEvidence({meta:{measurementEvidence:{empirical:false,finishedWidth:20,unit:'cm',yarn:'x',hook:'x',blocking:'x'}}}).ok,false);
assert.equal(sellable.empiricalSizeEvidence({meta:{measurementEvidence:{empirical:true,finishedWidth:20,unit:'px',yarn:'x',hook:'x',blocking:'x'}}}).ok,false);

console.log('sellable compiler fail-closed + empirical measurement gate tests passed');
