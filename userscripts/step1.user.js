// ==UserScript==
// @name         Step 1
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Replace content on target page with user-defined text
// @author       You
// @match        https://craxpro.io/forums/proxies-http-https-socks4-socks5/post-thread
// @match        https://craxpro.io/threads/*
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Load existing content from localStorage or use the default content
    var userContent = localStorage.getItem('userContent') || `No needed anymore`;

    if (!userContent.trim()) {
        var shouldContinue = confirm("User content is empty. Do you want to continue?");
        if (!shouldContinue) {
            return; // Exit the script early if user declines
        }
    }

    // Split the userContent into individual lines
    var lines = userContent.split('\n');

    // Determine how many lines to take (either 100 or all if fewer than 100)
    var linesToTake = Math.min(100, lines.length);

    // Take the determined number of lines
    var contentToReplace = lines.slice(0, linesToTake).join('\n');

    // Remove the used lines from the userContent variable
    userContent = lines.slice(linesToTake).join('\n');

    // Update the content in localStorage for future runs
    localStorage.setItem('userContent', userContent);

    // List of random titles
//   RESIDENTAL PAID VERY FAST Amazing proxies Enjoy
// UHQ PROXYLIST⭐BEST PROXIES FOR CRACKING⭐
// HTTP/s⚡UHQ PROXYLIST⭐BEST PROXIES FOR CRACKING⭐
// HQ HTTP/S PROXIES
// UHQ HTTP/S PROXIES
// [CHECKED] [PAID] [PRIVATE] [ULTRA FAST✅]
// [PAID] [PRIVATE✅] [ULTRAFAST✅]
// UHQ HTTP PROXIES | HQ QUALITY
// High Quality HTTP/S PROXIES
// High Quality✅ HTTP/S PROXIES✅
// UHQ✅ HTTP/S✅ PROXIES
// UHQ HTTP/S PROXIES✅
// UHQ✅ HTTP/S PROXIES
// UHQ✅ PROXYLIST⭐
// BEST PROXIES FOR CRACKING⭐ HTTP/s
// BEST PROXIES✅ HTTP/s✅
// Daily Proxies | Http/s
// https| UHQ ✅ Proxies
// HTTP/S⚡UHQ PROXYLIST|BEST PROXIES FOR CRACKING|
// HTTP/S✅UHQ PROXIES |BEST PROXIES FOR CRACKING
// HTTP/S⚡HQ PROXIES |PROXIES FOR CRACKING
// HTTP/S⚡HQ PROXIES |FOR CRACKING
// ⚡HQ PROXIES |PROXIES FOR CRACKING⚡
// High Quality🩻 HTTP/S PROXIES⚡
// CHECKED✅PAID🩻PRIVATE✅ULTRA FAST✅
// HTTP/s✅UHQ✅PRIVATE✅
// PRIVATE✅HQ✅ULTRA FAST✅
// FAST✅PAID✅PREM✅UHQ✅
// ✅HIGH SPEED HTTP/s Proxies✅
// ✅High Speed Proxylist✅
// ✅High Speed Proxies✅
// ⭐HIGH SPEED HTTP/s Proxies⭐
// Residential | Fast | UHQ | HTTP/s
// UHQ | Very Fast | Paid | http/s
// PREMUIM QUALITY | HTTP/s PROXYLIST
// NEW FRESH HTTP PROXYLIST CHECKED🩻
// [LATEST][HTTP/s][CHECKED🩻][PROXIES]
// [NEW PAID 🩻 PROXIES HTTP/s🩻]
// Paid HTTP/s Proxies🩻 WORKING 🩻
// 🩻HQ PROXIES |PROXIES FOR CRACKING🩻




  var ranTitle = `INSTANT ACCESS Residential Proxies POWERHOUSE
SUPERIOR PROXY PACK⭐CRACKING SOCKS5 MASTERS⭐
SOCKS5🔥ULTIMATE PROXY VAULT⭐CRACKING DOMINATOR⭐
ADVANCED SOCKS5 PROXIES
PREM SOCKS5 PROXIES
[TESTED] [PREM] [LOCKED] [INSTANT SPEED|]
[PREM] [LOCKED|] [RAPIDFIRE|]
PREM SOCKS5 PROXIES | SUPERIOR GRADE
ADVANCED SOCKS5 PROXIES
Advanced| SOCKS5 PROXIES|
PREM| SOCKS5| PROXIES
PREM SOCKS5 PROXIES|
PREM| SOCKS5 PROXIES
PREM| PROXY VAULT⭐
SUPERIOR PROXIES FOR CRACKING⭐ SOCKS5
SUPERIOR PROXIES| SOCKS5|
Hourly Updates | SOCKS5
SOCKS5| PREM | Proxies
SOCKS5🔥PREM VAULT|CRACKING MASTERS|
SOCKS5|PREM PROXIES |CRACKING DOMINATOR
SOCKS5🔥ADVANCED PROXIES |CRACKING TOOLS
SOCKS5🔥ADVANCED PROXIES |CRACKING READY
🔥ADVANCED PROXIES |CRACKING TOOLS🔥
Advanced SOCKS5 PROXIES🔥
TESTED|PREM LOCKED|INSTANT SPEED|
SOCKS5|PREM|LOCKED|
LOCKED|ADVANCED|RAPIDFIRE|
SPEEDY|PREM|ADVANCED|PREM|
|INSTANT SPEED SOCKS5 Proxies|
|Instant Vault|
|Instant Proxies|
⭐INSTANT SPEED SOCKS5 Proxies⭐
Residential | Rapidfire | Premium | SOCKS5
Premium | Instant | Premium | SOCKS5
SUPERIOR GRADE | SOCKS5 PROXY VAULT
HOTTEST FRESH SOCKS5 VAULT TESTED
[HOTTEST][SOCKS5][TESTED][PROXIES]
[NEW PREM PROXIES SOCKS5]
Premium SOCKS5 Proxies LIVE
ADVANCED PROXIES |CRACKING TOOLS
// [CHECKED] [PAID] [PRIVATE] [ULTRA FAST|]
// [PAID] [PRIVATE|] [ULTRAFAST|]
// UHQ HTTP PROXIES | HQ QUALITY
// High Quality HTTP/S PROXIES
// High Quality| HTTP/S PROXIES|
// UHQ| HTTP/S| PROXIES
// UHQ HTTP/S PROXIES|
// UHQ| HTTP/S PROXIES
// UHQ| PROXYLIST⭐
// BEST PROXIES FOR CRACKING⭐ HTTP/s
// BEST PROXIES| HTTP/s|
// Daily Proxies | Http/s
// https| UHQ | Proxies
// HTTP/S⚡UHQ PROXYLIST|BEST PROXIES FOR CRACKING|
// HTTP/S|UHQ PROXIES |BEST PROXIES FOR CRACKING
// HTTP/S⚡HQ PROXIES |PROXIES FOR CRACKING
// HTTP/S⚡HQ PROXIES |FOR CRACKING
// ⚡HQ PROXIES |PROXIES FOR CRACKING⚡
// High Quality🩻 HTTP/S PROXIES⚡
// CHECKED|PAID🩻PRIVATE|ULTRA FAST|
// HTTP/s|UHQ|PRIVATE|
// PRIVATE|HQ|ULTRA FAST|
// FAST|PAID|PREM|UHQ|
// |HIGH SPEED HTTP/s Proxies|

`;
    // Choose a random title from the list
    var titles = ranTitle.trim().split('\n');
    var title = titles[Math.floor(Math.random() * titles.length)];

    // Function to click an element by XPath
    function clickByXPath(xpath) {
        var element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (element) {
            element.click();
            console.log(`Clicked on element with XPath: ${xpath}`);
        } else {
            console.log(`Element with XPath: ${xpath} not found.`);
        }
    }

    // Function to replace content by XPath
    function replaceContentByXPath(xpath, newContent) {
        var element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (element) {
            if (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input') {
                element.value = newContent;
            } else {
                newContent = newContent.replace(/\n/g, '<br>');
                element.innerHTML = newContent;
            }
            console.log(`Replaced content in element with XPath: ${xpath}`);
        } else {
            console.log(`Element with XPath: ${xpath} not found.`);
        }
    }

    // If on the target URL, perform the click action and replace content
    if (window.location.href === "https://craxpro.io/forums/proxies-http-https-socks4-socks5/post-thread") {
        console.log("On target URL");

        // Wait for the page to load
        window.addEventListener('load', function() {
            // Click the element with the first specified XPath
            clickByXPath("/html/body/div[7]/div/div[1]/a");

            // Wait for a moment to ensure any subsequent elements are loaded
            setTimeout(function() {
                // Replace the content in the element with the specified XPath with the contentToReplace
                // replaceContentByXPath("/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/div/dl[1]/dd/div/div[2]/div/p[6]/strong/span", contentToReplace);

                // Replace the specified content
                var container = document.querySelector('.prefixContainer');
                if (container) {
                    var newContent = `<div class="prefixContainer">

<script type="text/template">
        {{#rich_prefix}}
            <span class="{{css_class}}"
               data-prefix-id="{{prefix_id}}"
               data-prefix-class="{{css_class}}"
               role="option">{{title}}</span>
        {{/rich_prefix}}
    </script>
<select name="prefix_id[]" multiple="" class="js-prefixSelect u-noJsOnly input select2-hidden-accessible" placeholder="Prefix" data-xf-init=" sv-multi-prefix-menu" data-min-tokens="1" data-max-tokens="0" id="js-SVMultiPrefixUniqueId1" data-sv-multiprefix-unique="1" data-select2-id="js-SVMultiPrefixUniqueId1" tabindex="-1" aria-hidden="true">
<optgroup label="Proxies" data-select2-id="15">
<option value="67" data-prefix-class="http" data-select2-id="2">HTTP/s</option>
<option value="68" data-prefix-class="socks4" data-select2-id="16">SOCKS 4</option>
<option value="69" selected="selected" data-prefix-class="socks5" data-select2-id="17">SOCKS 5</option>
</optgroup>
</select><span class="select2 select2-container select2-container--default select2-container--below select2-container--focus" dir="ltr" data-select2-id="1" style="width: 100%;"><span class="selection"><span class="select2-selection select2-selection--multiple input prefix--title" role="combobox" aria-haspopup="true" aria-expanded="false" tabindex="-1" aria-disabled="false"><ul class="select2-selection__rendered"><li class="select2-selection__choice" title="HTTP/s" data-select2-id="30"><span class="select2-selection__choice__remove" role="presentation">×</span><span class="http" data-prefix-id="67" data-prefix-class="http" role="option">HTTP/s</span></li><li class="select2-search select2-search--inline"><input class="select2-search__field" type="search" tabindex="0" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" role="searchbox" aria-autocomplete="list" placeholder="" style="width: 0.75em;"></li></ul></span></span><span class="dropdown-wrapper" aria-hidden="true"></span></span>
</div>`;
                    container.outerHTML = newContent;
                }

                // Paste the random title into the specified XPath
                replaceContentByXPath("/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/div/dl/dd/div[2]/textarea", title);

                // Click on the submit button
                clickByXPath("/html/body/div[1]/div[2]/div[2]/div[2]/div/div[3]/div[2]/div/form/div/dl/dd/div/div[2]/button");
            }, 2000); // Wait for 2 seconds initially
        });
    }

    if (window.location.href === "https://craxpro.io/forums/proxies-http-https-socks4-socks5/post-thread") {
        // Remove the first hundred lines from userContent
        userContent = lines.slice(100).join('\n');
        localStorage.setItem('userContent', userContent);
    }

})();
