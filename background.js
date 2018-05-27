"use strict";

function debug() {
  //console.debug.apply(console, arguments);
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

function logFunction(name, args) {
  debug(name, ...args);
}

debug("Reuse Tab starting");

function getHost(url) {
	if (!url)
		return null;
	return new URL(url).host;
}

/*
 Checks if hosts of urls are equal.
 Accepts urls in a string form.
 Returns boolean.
*/
function areUrlsEqualByHost(url1, url2) {
	debug("Matching urls " + url1 + " and " + url2);
	const host1 = getHost(url1);
	const host2 = getHost(url2);
	// On statrtup all tabs have about:blank or about:home urls for a short while.
	// These should not be considered equal and are not a subject for squash
	if (!host1 || !host2) {
		return false;
	}
	if (host1 == host2) {
		debug("Hosts are same: " + host1);
		return true;
	}
	return false;
}


// Returns true if newTab should be squashed into pinnedTab
// Main business logic of this plugin
function isDuplicateTab(pinnedTab, newTab) {
	if (!pinnedTab.pinned)
		return false;
  if (newTab.hidden)
    return false;
	if (newTab.pinned)
		return false;
  if (newTab.openerTabId === pinnedTab.id)
    return false;
	debug("Matching tabs ", pinnedTab.id, " and ", newTab.id);
	return areUrlsEqualByHost(pinnedTab.url, newTab.url);
}

const tabs = browser.tabs;

if (!tabs)
  throw new Error("Tabs are not available");

const removedTabs = [];
async function reopenIn(originTab, targetTab) {
    debug("Navigating from ", targetTab.url, " to ", originTab.url, " in tab ", targetTab.id);
    try {
      await tabs.update(targetTab.id, {
        active: originTab.active,
        url: originTab.url      
      });
    } catch(e) {
      handleError("Failed to perform navigation", e);
      return;
    }
    try {
      if (!removedTabs.includes(originTab.id)) {
        removedTabs.push(originTab.id);
        await tabs.remove(originTab.id);
      }
    } catch (e) {
      handleError("Failed to remove a tab: ", e);
    }
}

async function tryReuseTab(tab) {
  if (!tab.url)
    return;
  if (tab.status !== "loading")
    return; 
  debug("Tab detected: ", tab);
  const host = getHost(tab.url);
  if (!host)
    return;
  const tabQuery = {
      pinned: true,
      url: "*://"+host+"/*",
      status: "complete",
      windowType: "normal"
  };
  const pinnedTabs = await tabs.query(tabQuery);
  for (let pinnedTab of pinnedTabs) {
    if (tab === pinnedTab)
      continue;
    if (!isDuplicateTab(pinnedTab, tab))
      continue;  
    debug("reopening");
    await reopenIn(tab, pinnedTab);
    break;
  }
}

function handleUpdate(tabId, change, tab) {
  tryReuseTab(tab).catch(e => handleError(e));
}

tabs.onUpdated.addListener(handleUpdate);

debug("Reuse Tab startup complete");
