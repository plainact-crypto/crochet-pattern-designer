// Final UI bridge for publication-quality output across import modes.
(function(){
  photoImportDraftBtn?.addEventListener('click',()=>setTimeout(()=>{
    if(items.some(i=>i.photoDraft)){
      items.forEach(i=>{if(i.photoDraft)i.publicationDraft=true;});
      render();
      selectedStatus.textContent='Photo Mode · geometric diagram imported';
    }
  },40));

  analyzeImportBtn?.addEventListener('click',()=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      const imported=items.filter(i=>Number.isFinite(i.importConfidence));
      if(imported.length){
        clearInterval(timer);imported.forEach(i=>i.publicationDraft=true);render();
        rowStatus.textContent=`Chart Import · ${imported.length} detected symbols · publication redraw`;
        selectedStatus.textContent='Clean diagram · editable';
      }else if(Date.now()-started>5000)clearInterval(timer);
    },180);
  });

  patternParseBtn?.addEventListener('click',()=>setTimeout(()=>{
    const written=items.filter(i=>i.writtenDraft);if(!written.length)return;written.forEach(i=>i.publicationDraft=true);render();
    selectedStatus.textContent='Written Pattern · publication diagram';
  },80));
})();
