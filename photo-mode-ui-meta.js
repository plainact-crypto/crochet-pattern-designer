// Keeps Photo Mode result metadata aligned with the product vocabulary.
(() => {
const results=document.getElementById('photoResults'),shape=document.getElementById('photoShape'),quality=document.getElementById('photoBorder'),symmetry=document.getElementById('photoBase'),explain=document.getElementById('photoExplain'),complexity=document.getElementById('photoComplexity');
if(!results)return;
const sync=()=>{const rejected=shape?.textContent==='Not accepted';if(quality)quality.textContent=rejected?'Rejected':'Accepted';if(!rejected&&symmetry&&explain?.textContent){const first=explain.textContent.split('.')[0]?.trim();if(first)symmetry.textContent=first;}if(complexity&&!complexity.textContent.trim().replace('—',''))complexity.textContent='Medium';};
new MutationObserver(sync).observe(results,{subtree:true,childList:true,characterData:true});
document.addEventListener('click',e=>{const b=e.target.closest?.('.photo-variant');if(!b||!complexity)return;const t=b.querySelector('small')?.textContent||'';complexity.textContent=t.split('·')[0].trim()||'Medium';});
})();