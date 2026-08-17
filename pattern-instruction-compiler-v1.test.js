const assert=require('assert');
const compiler=require('./pattern-instruction-compiler-v1.js');

const mk=(innerDc=3,middleChain=7,outerChain=11)=>{
  const nodes=[]; const spaces=[]; const P=5;
  const add=(id,type,round,role,extra={})=>{const n={id,type,round,role,...extra};nodes.push(n);return n};
  add('ring','ring',0,'start');
  for(let i=0;i<10;i++) add(`r1-${i}`,'single',1,'center-sc',{order:i,workedInto:'ring'});
  const space=(round,prefix,count)=>{for(let s=1;s<=P;s++){const chainIds=[];for(let c=0;c<count;c++){const id=`${prefix}-${s}-ch-${c}`;add(id,'chain',round,`${prefix}-chain`,{sector:s,order:c});chainIds.push(id)}spaces.push({id:`${prefix}-space-${s}`,round,sector:s,chainIds,startAnchor:'r1-0',endAnchor:'r1-1',joinId:`${prefix}-join-${s}`});add(`${prefix}-join-${s}`,'slip',round,`${prefix}-chain-join`,{sector:s});}};
  space(2,'inner',3); space(4,'mid',middleChain); space(6,'outer',outerChain);
  const petal=(round,role,spacePrefix,seq)=>{for(let s=1;s<=P;s++)seq.forEach((type,order)=>add(`${role}-${s}-${order}`,type,round,role,{sector:s,order,workedInto:`${spacePrefix}-space-${s}`}));};
  petal(3,'inner-petal-stitch','inner',['single','half',...Array(innerDc).fill('double'),'half','single']);
  petal(5,'mid-petal-stitch','mid',['single','half','double','double','treble','treble','treble','double','double','half','single']);
  petal(7,'outer-petal-stitch','outer',['single','half','double','double','treble','treble','treble','dtr','dtr','dtr','treble','treble','treble','double','double','half','single']);
  for(let s=1;s<=P;s++)for(let j=0;j<17;j++){const reps=j===8?3:1;for(let k=0;k<reps;k++)add(`edge-${s}-${j}-${k}`,'single',8,'edge-sc',{sector:s,workedInto:`outer-petal-stitch-${s}-${j}`})}
  return {kind:'lace-flower',params:{petals:P,innerDc,middleChain,outerChain},nodes,spaces,validation:{ok:true}};
};

assert.throws(()=>compiler.compile({...mk(),validation:{ok:false}}),/REQUIRES_VALIDATED/);
assert.throws(()=>compiler.compile({kind:'unknown',nodes:[{id:'x',type:'single'}],validation:{ok:true}}),/UNSUPPORTED_KIND/);
const base=compiler.compile(mk());
assert.equal(base.facts.r1Count,10); assert.equal(base.facts.r8Count,95); assert.equal(base.facts.maxEdgeMultiplicity,3);
assert(base.text.includes('3 dc')); assert(base.text.includes('ch 7')); assert(base.text.includes('ch 11')); assert(base.text.includes('[95 sc]'));
assert(!base.text.includes('scs'));
const changed=compiler.compile(mk(5,5,15));
assert(changed.text.includes('5 dc')); assert(changed.text.includes('ch 5')); assert(changed.text.includes('ch 15'));
assert.notEqual(changed.text,base.text);
console.log('pattern-instruction-compiler-v1 agreement tests passed');
