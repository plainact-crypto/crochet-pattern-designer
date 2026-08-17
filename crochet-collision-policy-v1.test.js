const assert=require('assert');
const p=require('./crochet-collision-policy-v1.js');

const base={type:'double',role:'outer-petal-stitch',sector:2,sourceRegion:'outer-petal-2',workedInto:'outer-space-2'};
const a={id:'a',...base,gridCol:10,gridRow:10,rotation:0};
const b={id:'b',...base,gridCol:10,gridRow:11,rotation:12};
assert.equal(p.intentionalSharedTarget(a,b),true,'same fan/increase target in same construction group must be recognized');
assert.deepEqual(p.classifyPair(a,b,true),{kind:'shared-target-contact',invalid:false});

const differentTarget={...b,id:'c',workedInto:'outer-space-3'};
assert.equal(p.intentionalSharedTarget(a,differentTarget),false,'different worked-into targets are not a fan contact');
assert.deepEqual(p.classifyPair(a,differentTarget,true),{kind:'invalid-body-overlap',invalid:true});

const differentRole={...b,id:'d',role:'edge-sc'};
assert.equal(p.intentionalSharedTarget(a,differentRole),false,'same target across different construction roles must not be silently excused');
assert.deepEqual(p.classifyPair(a,differentRole,true),{kind:'invalid-body-overlap',invalid:true});

const differentSector={...b,id:'e',sector:3};
assert.equal(p.intentionalSharedTarget(a,differentSector),false,'cross-sector overlap must remain invalid even with a repeated target id');

const separate={...differentTarget,id:'f'};
assert.deepEqual(p.classifyPair(a,separate,false),{kind:'separate',invalid:false},'non-overlapping glyphs are always separate');

const d=p.diagnostic(a,differentTarget,'invalid-body-overlap');
assert.equal(d.kind,'invalid-body-overlap');
assert.equal(d.a.id,'a');
assert.equal(d.b.id,'c');
assert.equal(d.a.workedInto,'outer-space-2');
assert.equal(d.b.workedInto,'outer-space-3');
assert.equal(d.a.gridCol,10);

console.log('crochet-collision-policy-v1.test.js PASS');
