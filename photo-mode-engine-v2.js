// Legacy Photo Mode v2 disabled. Load the validated multi-region v3 engine only.
(() => {
  const s=document.createElement('script');
  s.src='photo-mode-engine-v3.js?v=20260815-0130';
  s.async=false;
  document.head.appendChild(s);
})();