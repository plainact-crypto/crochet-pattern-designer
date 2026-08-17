const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync(require.resolve('./lace-flower-engine.js'),'utf8');
assert(!/function\s+writtenFor\s*\(/.test(src),'Generator must not define hand-authored writtenFor() instructions');
assert(!/\bgraph\.written\b/.test(src),'Generator UI must not render graph.written before sellable proof');
assert(!/\bwritten\s*:\s*writtenFor\s*\(/.test(src),'Pattern IR must not carry parallel hand-authored written instructions');
assert(/Written instructions remain locked until all proof layers pass/.test(src),'Generator must communicate fail-closed written-output state');
console.log('PASS lace generator uses Pattern IR as the only written-instruction source');
