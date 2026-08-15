// v7.4 compatibility loader. v7.5 owns stitch size/line-weight UI and PDF sync.
(()=>{
  function load(src,attr){if(document.querySelector(`script[${attr}]`))return;const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');document.head.appendChild(s)}
  load('stitch-style-v7.5.js?v=20260815-1655v75','data-stitch-style-v75');
  load('export-style-v7.5.js?v=20260815-1655v75','data-export-style-v75');
})();
