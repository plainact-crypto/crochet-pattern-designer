const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const generator = fs.readFileSync(path.join(root, 'lace-flower-engine.js'), 'utf8');
const audit = fs.readFileSync(path.join(root, 'constructability-v7.8.js'), 'utf8');

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

// Sellable crochet evidence must originate in the generator's construction logic,
// not be manufactured later by a validator/auditor.
assert(/coverageContracts/.test(generator), 'Generator must emit coverageContracts natively.');
assert(/spaceCoverageContracts/.test(generator), 'Generator must emit spaceCoverageContracts natively.');
assert(/proofModel/.test(generator), 'Generator must emit proofModel natively.');
assert(/consumes/.test(generator), 'Generated stitches must declare consumes relationships.');
assert(/produces/.test(generator), 'Generated stitches must declare produces counts.');
assert(/countsAsStitch/.test(generator), 'Generated stitches must declare countsAsStitch semantics.');

// Constructability is a verifier. It must not remain the owner of proof creation.
assert(!/function\s+attachProofContracts\s*\(/.test(audit), 'Constructability audit must verify proof contracts, not attach them.');
assert(!/attachProofContracts\s*\(g\)/.test(audit), 'Constructability audit must not mutate a graph by attaching proof contracts.');

console.log('generator-native-proof-ownership: PASS');
