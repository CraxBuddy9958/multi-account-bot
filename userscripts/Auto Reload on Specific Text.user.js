// ==UserScript==
// @name         Auto Reload on Specific Text
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Reload the tab if a specific text is detected on example.com/*
// @author       Your Name
// @match        https://craxpro.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to check for the specific text and reload the page
    function checkAndReload() {
        // Check if the text exists on the page
        if (document.body.innerText.includes("Oops! We ran into some problems. Try again!")) {
            console.log("Text detected! Reloading...");
            location.reload();
        }
    }

    // Check every 5 seconds
    setInterval(checkAndReload, 5000);
})();
