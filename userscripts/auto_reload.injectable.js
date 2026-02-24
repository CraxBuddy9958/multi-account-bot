// userscripts/auto_reload.injectable.js
(function(){
  'use strict';

  function checkAndReload() {
    try {
      const text = document.body && document.body.innerText;
      if (text && text.includes("Oops! We ran into some problems. Try again!")) {
        console.log("[auto_reload] Error text detected — reloading.");
        location.reload();
      }
    } catch (e) {
      console.error("[auto_reload] err", e);
    }
  }

  setInterval(checkAndReload, 5000);
})();
