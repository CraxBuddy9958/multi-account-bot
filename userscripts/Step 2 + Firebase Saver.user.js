// ==UserScript==
// @name         Step 2 + Firebase Saver
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Save thread link to Firebase and redirect after delay
// @author       You
// @match        https://craxpro.io/threads/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const currentLink = window.location.href;

    // Your Firebase DB URL
    const FIREBASE_URL = "https://craxlinks-bb690-default-rtdb.firebaseio.com/links.json";

    // Fetch current value → append → save back
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
            .then(() => console.log("Saved to Firebase:", link))
            .catch(err => console.error("Firebase Error:", err));
    }

    // Save link instantly
    saveLinkToFirebase(currentLink);

    // Redirect after 80 seconds
    setTimeout(() => {
        console.log("Redirecting...");
        window.location.href = "https://craxpro.io/forums/proxies-http-https-socks4-socks5/post-thread";
    }, 80000);

})();
