// Photo Mode v4 retired. Load the clean structural v5 engine exclusively.
(() => {
  const s=document.createElement('script');
  s.src='photo-mode-engine-v5.js?v=20260815-0135';
  s.dataset.photoEngine='v5';
  document.head.appendChild(s);
})();
