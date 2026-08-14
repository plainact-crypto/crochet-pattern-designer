// Retire the old bounded contour-band analyzer. Remove its inherited listeners,
// then load the single region-based Photo Mode pipeline.
(() => {
  const replace=id=>{const old=document.getElementById(id);if(!old)return null;const fresh=old.cloneNode(true);old.replaceWith(fresh);return fresh;};
  replace('photoModeFile');
  replace('photoAnalyzeBtn');
  replace('photoImportDraftBtn');
  const s=document.createElement('script');
  s.src='photo-mode-regions.js?v=20260815-0044';
  s.defer=false;
  document.head.appendChild(s);
})();