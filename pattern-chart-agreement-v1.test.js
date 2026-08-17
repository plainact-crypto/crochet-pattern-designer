const assert=require('assert');
const agreement=require('./pattern-chart-agreement-v1.js');
function graph(){return {kind:'lace-flower',params:{petals:5},validation:{ok:true},spaces:[],nodes:[
{id:'r1a',type:'single',role:'center-sc',round:1},{id:'r1b',type:'single',role:'center-sc',round:1},
{id:'r2',type:'chain',round:2,workedInto:'r1a'},{id:'r3',type:'double',round:3,workedInto:'r1a'},
{id:'r4',type:'chain',round:4,workedInto:'r3'},{id:'r5',type:'double',round:5,workedInto:'r3'},
{id:'r6',type:'chain',round:6,workedInto:'r5'},{id:'r7',type:'double',round:7,workedInto:'r5'},
{id:'r8a',type:'single',role:'edge-sc',round:8,workedInto:'r7'},{id:'r8b',type:'single',role:'edge-sc',round:8,workedInto:'r7'}]};}
const facts={facts:{petals:5,r1Count:2,r8Count:2}};
assert.equal(agreement.validate(graph(),facts).ok,true);
let g=graph();g.nodes.find(x=>x.id==='r3').workedInto='missing';assert.equal(agreement.validate(g,facts).ok,false,'invalid workedInto must fail');
g=graph();g.nodes=g.nodes.filter(x=>x.round!==6);assert.equal(agreement.validate(g,facts).ok,false,'missing round must fail');
assert.equal(agreement.validate(graph(),{facts:{petals:4,r1Count:2,r8Count:2}}).ok,false,'written petal mismatch must fail');
assert.equal(agreement.validate(graph(),{facts:{petals:5,r1Count:3,r8Count:2}}).ok,false,'written R1 mismatch must fail');
assert.equal(agreement.validate(graph(),{facts:{petals:5,r1Count:2,r8Count:3}}).ok,false,'written R8 mismatch must fail');
console.log('pattern-chart-agreement-v1 tests passed');
