"use strict";

import {RegexMatcher} from "./matcher.mjs";


function debug() {
    console.debug.apply(console, arguments);
}

function handleError() {
    const message = [];
    message.push(...arguments);
    if (arguments.length > 0) {
        if (arguments[0].stack) {
            message.push(arguments[0].stack);
        }
    }
    console.error.apply(console, message);
}

function logFunction(name, ...args) {
    debug(name, ...args);
}

debug("starting");

let matcher = new RegexMatcher(RegexMatcher.parsePatterns(
    RegexMatcher.defaultPatterns(), (line, error) => debug(`Failed to parse line ${line}: ${error}`)),
    debug);

function getOrigin(url) {
    if (!url)
        return null;
    return new URL(url).origin;
}

function getComparisonKey(url) {
    return getOrigin(url);
}

/*
 Checks if hosts of urls are equal.
 Accepts urls in a string form.
 Returns boolean.
*/
function areUrlsEqualByHost(url1, url2) {
    logFunction("areUrlsEqualByHost", url1, url2);
    const host1 = getComparisonKey(url1);
    const host2 = getComparisonKey(url2);
    // On statrtup all tabs have about:blank or about:home urls for a short while.
    // These should not be considered equal and are not a subject for squash
    if (!host1 || !host2) {
        return false;
    }
    if (host1 == host2) {
        return true;
    }
    return false;
}


// Returns true if newTab should be squashed into pinnedTab
// Main business logic of this plugin
function isDuplicateTab(pinnedTab, newTab) {
    if (!pinnedTab.pinned)
        return false;
    if (pinnedTab.hidden)
        return false;
    if (newTab.hidden)
        return false;
    if (newTab.pinned)
        return false;
    if (pinnedTab.id === newTab.openerTabId)
        return false;
    return matcher.match(pinnedTab, newTab);
}


const watchedTabs = {};
const tabs = browser.tabs;

if (!tabs)
    throw new Error("Tabs are not available");

async function reopenIn(originTab, targetTab) {
    logFunction("reopenIn", originTab, targetTab);
    try {
        await tabs.remove(originTab.id);
    } catch (e) {
        handleError("Failed to remove a tab: ", e);
        return;
    }
    try {
        await tabs.update(targetTab.id, {
            active: originTab.active,
            url: originTab.url
        });
    } catch (e) {
        handleError("Failed to perform navigation", e);
        return;
    }
}

async function findDuplicate(tab) {
    logFunction("findDuplicate", tab);
    if (!tab)
        return null;
    if (!tab.url)
        return null;
    if (tab.pinned)
        return null;
    const origin = getOrigin(tab.url);
    if (!origin)
        return null;
    const tabQuery = {
        pinned: true,
        url: origin + "/*",
        status: "complete",
        windowType: "normal"
    };
    logFunction("query", tabQuery);
    const pinnedTabs = await tabs.query(tabQuery);
    for (let pinnedTab of pinnedTabs) {
        if (tab === pinnedTab)
            continue;
        if (!isDuplicateTab(pinnedTab, tab))
            continue;
        debug("Matching pinned tab found:", tab, pinnedTab);
        return pinnedTab;
    }
    debug("No matching pinned tab", tab);
}

async function tryReuseTab(tab) {
    logFunction("tryReuseTab", tab);
    const duplicate = await findDuplicate(tab);
    if (duplicate) {
        await reopenIn(tab, duplicate);
        return true;
    }
    return false;
}

tabs.onCreated.addListener(tab => {
    logFunction("onCreated", tab);
    const tabId = tab.id;
    watchedTabs[tabId] = {
        active: tab.active,
        created: tab.lastAccessed
    };
    setTimeout(() => delete watchedTabs[tabId], 10000);
});

tabs.onUpdated.addListener((tabId, change, tab) => {
    if (!change.url)
        return;
    const watched = watchedTabs[tabId];
    if (!watched) {
        debug("Tab " + tabId + " is not watched");
        return;
    }
    logFunction("onUpdated", tabId, change, tab);
    tryReuseTab(tab)
        .then(reused => delete watchedTabs[tabId])
        .catch(e => handleError(e));
});

debug("startup complete");
