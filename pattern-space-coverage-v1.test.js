const assert = require('assert');
const { validateSpaceCoverageContracts } = require('./pattern-space-coverage-v1.js');

function graph(overrides={}) {
  const spaces=[1,2,3,4,5].map(i=>({id:`sp${i}`,round:2}));
  const nodes=[];
  for(let i=1;i<=5;i++) for(let j=1;j<=3;j++) nodes.push({id:`r3-${i}-${j}`,type:'double',round:3,workedInto:`sp${i}`,consumes:[`sp${i}`],produces:1,countsAsStitch:true});
  return {nodes,spaces,spaceCoverageContracts:[{stepType:'round',step:3,baseStep:2,expectedSpaceCount:5,expectedRepeatCount:5,expectedBodyPerSpace:3,expectedOutputCount:15,requireEverySpaceConsumed:true,forbidOutsideBaseSpaces:true}],...overrides};
}

let r=validateSpaceCoverageContracts(graph());
assert.equal(r.ok,true,'valid five-space repeat must pass');

const missing=graph();
missing.nodes=missing.nodes.filter(n=>n.id!=='r3-5-3');
r=validateSpaceCoverageContracts(missing);
assert.equal(r.ok,false,'missing repeat-body stitch must fail');
assert(r.errors.some(e=>e.code==='SPACE_OUTPUT_COUNT_FAIL'));
assert(r.errors.some(e=>e.code==='SPACE_BODY_COUNT_FAIL'));

const uncovered=graph();
uncovered.nodes=uncovered.nodes.filter(n=>!n.id.startsWith('r3-5-'));
r=validateSpaceCoverageContracts(uncovered);
assert.equal(r.ok,false,'unconsumed base chain-space must fail');
assert(r.errors.some(e=>e.code==='SPACE_UNCOVERED'));
assert(r.errors.some(e=>e.code==='SPACE_REPEAT_COUNT_FAIL'));

const outside=graph();
outside.spaces.push({id:'old-space',round:1});
outside.nodes[0]={...outside.nodes[0],workedInto:'old-space',consumes:['old-space']};
r=validateSpaceCoverageContracts(outside);
assert.equal(r.ok,false,'consuming a space outside the declared base round must fail');
assert(r.errors.some(e=>e.code==='OUTSIDE_BASE_SPACE'));

console.log('pattern-space-coverage-v1 tests passed');
