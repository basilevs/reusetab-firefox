"use strict";

import {RegexMatcher} from "./matcher.mjs";


const tabs = browser.tabs;

if (!tabs)
    throw new Error("Tabs are not available");

const backgroundPage = browser.runtime.getBackgroundPage();

if (!backgroundPage)
    throw new Error("Background page is not found");

const defaultPatterns = RegexMatcher.defaultPatterns();
window.defaultPatterns = defaultPatterns;

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

function isEligibleForSquash(pinnedTab, newTab) {
    if (!pinnedTab.pinned)
        return false;
    if (pinnedTab.hidden)
        return false;
    if (newTab.hidden)
        return false;
    if (newTab.pinned)
        return false;
    return pinnedTab.id !== newTab.openerTabId;
}

// Returns true if newTab should be squashed into pinnedTab
// Main business logic of this plugin
// Actual work is done by returned delegate
async function shouldSquashPredicate() {
    const data = await browser.storage.sync.get("patterns");
    let patterns = data.patterns;
    if (!patterns) {
        patterns = defaultPatterns;
    }
    let matcher = new RegexMatcher(RegexMatcher.parsePatterns(patterns, (line, error) => debug(`Failed to parse line ${line}: ${error}`)),
        debug);
    return (pinnedTab, newTab)  => {
        if (!isEligibleForSquash(pinnedTab, newTab))
            return false;
        return matcher.match(pinnedTab, newTab);
    };
}

const watchedTabs = {};
async function reopenIn(originTab, targetTab) {
    logFunction("reopenIn", originTab, targetTab);
    try {
        await tabs.remove(originTab.id);
    } catch (e) {
        handleError("Failed to remove a tab: ", e);
        return;
    }
    const updateRequest = {
        active: originTab.active
    };
    if (targetTab.url !== originTab.url)
        updateRequest.url = originTab.url;
    try {
        await tabs.update(targetTab.id, updateRequest);
    } catch (e) {
        handleError("Failed to perform navigation", e);
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
    const shouldSquash = await shouldSquashPredicate();
    const tabQuery = {
        pinned: true,
        status: "complete",
        windowType: "normal"
    };
    logFunction("query", tabQuery);
    const pinnedTabs = await tabs.query(tabQuery);
    for (let pinnedTab of pinnedTabs) {
        if (tab === pinnedTab)
            continue;
        if (!shouldSquash(pinnedTab, tab))
            continue;
        debug("Matching pinned tab found:", tab, pinnedTab);
        return pinnedTab;
    }
    debug("No matching pinned tab", tab, pinnedTabs);
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
        .then((wasReused) => {
            if (wasReused) delete watchedTabs[tabId];
        })
        .catch(e => handleError(e))
});

debug("startup complete");
