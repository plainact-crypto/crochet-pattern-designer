const assert = require('assert');
const core = require('../pattern-core-v1.js');

function baseGraph() {
  return {
    meta: {
      terminology: 'US',
      supportStatus: 'BETA',
      gauge: { stitches: 10, width: 10, unit: 'cm' },
      yarn: { weightCategory: 4 },
      hook: { mm: 5 },
      finishedSize: 'user-defined'
    },
    written: 'Round 1...',
    nodes: [
      { id:'ring0', type:'ring', round:0 },
      { id:'r1a', type:'single', round:1, workedInto:'ring0' },
      { id:'r1b', type:'single', round:1, workedInto:'ring0' },
      { id:'r2a', type:'single', round:2, workedInto:'r1a' },
      { id:'r2b', type:'single', round:2, workedInto:'r1a' },
      { id:'r2c', type:'single', round:2, workedInto:'r1b' },
      { id:'r2d', type:'single', round:2, workedInto:'r1b' }
    ],
    coverageContracts: [{
      stepType:'round', step:2, baseStep:1,
      expectedBaseCount:2, expectedOutputCount:4, expectedDelta:2,
      expectedTargetMultiplicity:2
    }]
  };
}

let result = core.validatePatternGraph(baseGraph());
assert.equal(result.ok, true, JSON.stringify(result.errors));
assert.equal(result.version, '1.1.0');

const brokenIncrease = baseGraph();
brokenIncrease.nodes = brokenIncrease.nodes.filter(n => n.id !== 'r2d');
result = core.validatePatternGraph(brokenIncrease);
assert.equal(result.ok, false);
assert(result.errors.some(e => e.code === 'COVERAGE_OUTPUT_COUNT_FAIL'));
assert(result.errors.some(e => e.code === 'TARGET_MULTIPLICITY_FAIL'));

const uncoveredBase = baseGraph();
uncoveredBase.nodes = uncoveredBase.nodes.filter(n => !['r2c','r2d'].includes(n.id));
uncoveredBase.coverageContracts[0] = {
  stepType:'round', step:2, baseStep:1,
  expectedOutputCount:2,
  requireFullBaseCoverage:true
};
result = core.validatePatternGraph(uncoveredBase);
assert.equal(result.ok, false);
assert(result.errors.some(e => e.code === 'BASE_STITCH_UNCOVERED'));

const intentionalSkip = baseGraph();
intentionalSkip.nodes = intentionalSkip.nodes.filter(n => !['r2b','r2c','r2d'].includes(n.id));
intentionalSkip.coverageContracts[0] = {
  stepType:'round', step:2, baseStep:1,
  expectedOutputCount:1,
  requireFullBaseCoverage:true,
  allowedSkippedTargets:['r1b']
};
result = core.validatePatternGraph(intentionalSkip);
assert.equal(result.ok, true, JSON.stringify(result.errors));

const badSellableGauge = baseGraph();
badSellableGauge.meta.supportStatus = 'VERIFIED';
badSellableGauge.meta.gauge = '10 sc = 10 cm';
result = core.validatePatternGraph(badSellableGauge);
assert.equal(result.sellable, false);
assert(result.errors.some(e => e.code === 'GAUGE_NOT_STRUCTURED'));

console.log('pattern-core-v1 self-tests passed');
