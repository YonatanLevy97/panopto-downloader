chrome.webRequest.onCompleted.addListener(
    (details) => {
        if (details.url.includes("fragmented.mp4") && details.tabId !== -1) {
            // Use the tabId from the request details
            const tabId = details.tabId;

            chrome.storage.local.get("tabFragmentLinks", (data) => {
                const tabFragmentLinks = data.tabFragmentLinks || {};
                const currentTabLinks = tabFragmentLinks[tabId] || [];

                // Avoid duplicates
                if (!currentTabLinks.includes(details.url)) {
                    currentTabLinks.push(details.url);
                    tabFragmentLinks[tabId] = currentTabLinks;

                    chrome.storage.local.set({tabFragmentLinks});
                }
            });
        }
    },
    {
        urls: [
            "https://*.cloud.panopto.eu/*",
            "https://*.cloudfront.net/*"
        ]
    }
);

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.get("tabFragmentLinks", (data) => {
        const tabFragmentLinks = data.tabFragmentLinks || {};

        if (tabFragmentLinks[tabId]) {
            console.log(`Removing data for tabId: ${tabId}`);
            delete tabFragmentLinks[tabId];
            chrome.storage.local.set({tabFragmentLinks}, () => {
                console.log(`Data for tabId ${tabId} has been cleared.`);
            });
        } else {
            console.log(`No data found for tabId: ${tabId}`);
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "loading") {
        chrome.storage.local.get("tabFragmentLinks", (data) => {
            const tabFragmentLinks = data.tabFragmentLinks || {};

            if (tabFragmentLinks[tabId]) {
                console.log(`Tab ${tabId} refreshed. Clearing its stored data.`);
                delete tabFragmentLinks[tabId];
                chrome.storage.local.set({tabFragmentLinks});
            }
        });
    }
});
