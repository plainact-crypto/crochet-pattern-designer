const assert=require('assert');
require('./pattern-round-closure-v1.js');
const V=global.CrochetRoundClosure;
function n(id,type,round,o={}){return{id,type,round,...o}}
const joined={roundPolicy:{1:'joined'},nodes:[n('a','single',1),n('b','single',1),n('j','slip',1,{role:'round-join',closesRound:true,anchor:'b',workedInto:'a'})]};
assert.equal(V.validateRoundClosure(joined).ok,true);
const noJoin={roundPolicy:{1:'joined'},nodes:[n('a','single',1),n('b','single',1)]};
assert.equal(V.validateRoundClosure(noJoin).ok,false);
const doubleJoin={roundPolicy:{1:'joined'},nodes:[n('a','single',1),n('b','single',1),n('j1','slip',1,{role:'round-join',anchor:'b',workedInto:'a'}),n('j2','slip',1,{role:'edge-join',anchor:'b',workedInto:'a'})]};
assert.equal(V.validateRoundClosure(doubleJoin).ok,false);
const spiral={roundPolicy:{1:'spiral'},nodes:[n('a','single',1),n('b','single',1)]};
assert.equal(V.validateRoundClosure(spiral).ok,true);
const badSpiral={roundPolicy:{1:'continuous'},nodes:[n('a','single',1),n('j','slip',1,{role:'round-join',anchor:'a',workedInto:'a'})]};
assert.equal(V.validateRoundClosure(badSpiral).ok,false);
const cross={roundPolicy:{2:'joined'},nodes:[n('a','single',1),n('b','single',2),n('j','slip',2,{role:'round-join',anchor:'b',workedInto:'a'})]};
assert.equal(V.validateRoundClosure(cross).ok,false);
console.log('pattern-round-closure-v1 tests PASS');
