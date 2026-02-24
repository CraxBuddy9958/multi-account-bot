// userscripts/step2.injectable.js
(function() {
  'use strict';

  const currentLink = window.location.href;
  const FIREBASE_URL = "https://craxlinks-bb690-default-rtdb.firebaseio.com/links.json";

  function saveLinkToFirebase(link) {
    fetch(FIREBASE_URL)
      .then(res => res.text())
      .then(existing => {
        let finalText = "";

        if (existing && existing !== "null") {
          try {
            existing = JSON.parse(existing);
            finalText = existing + "\n" + link;
          } catch (e) {
            finalText = link;
          }
        } else {
          finalText = link;
        }

        return fetch(FIREBASE_URL, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalText)
        });
      })
      .then(() => console.log("[step2] Saved to Firebase:", link))
      .catch(err => console.error("[step2] Firebase Error:", err));
  }

  // Save link instantly
  try { saveLinkToFirebase(currentLink); } catch (e) { console.error(e); }

  // Redirect after 80 seconds
  setTimeout(() => {
    console.log("[step2] Redirecting...");
    window.location.href = "https://craxpro.io/forums/proxies-http-https-socks4-socks5/post-thread";
  }, 80000);

})();
