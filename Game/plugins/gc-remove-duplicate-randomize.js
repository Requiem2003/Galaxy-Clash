// === GC Remove Duplicate Randomize Buttons ===

// GC_RemoveDuplicateRandomize.js — remove the old/unwanted randomize button
(function(){
  function killByText(){
    const killers = [
      'randomize current players team',
      "randomize current player's team",
      'randomize current player’s team', // curly apostrophe
    ];
    const btns = Array.from(document.querySelectorAll('button, .btn, [role="button"]'));
    btns.forEach(b=>{
      const txt = (b.textContent || '').trim().toLowerCase();
      if(!txt) return;
      if(killers.some(k => txt.includes(k))){
        // Keep the correct global button if it exists (id=btnRandomizeTeam)
        if(b.id && b.id === 'btnRandomizeTeam') return;
        b.remove();
      }
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', killByText);
  } else {
    killByText();
  }
  // Also clean up after dynamic UI updates
  const obs = new MutationObserver(()=>killByText());
  obs.observe(document.documentElement, { childList: true, subtree: true });
  console.log('[GC_RemoveDuplicateRandomize] active: old button removed if present');
})();
