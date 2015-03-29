const tabs = require("sdk/tabs");
const {getTabId, getTabURL, getTabForBrowser, getBrowserForTab, getTabForContentWindow} = require("sdk/tabs/utils");
const {areUrlsEqualByHost, blockAfterSuccess, expireAfter, log} = require("./utils");
const {Ci, Cu} = require("chrome");
const { viewFor } = require('sdk/view/core');
const { modelFor } = require('sdk/model/core');
Cu.import("resource://gre/modules/XPCOMUtils.jsm", this);

// Returns true if newTab should be squashed into pinnedTab
// Main business logic of this plugin
function isDuplicateTab(pinnedTab, newTab) {
	if (!pinnedTab.isPinned)
		return false;
	if (newTab.isPinned)
		return false;
	log("Matching tabs ", pinnedTab.id, " and ", newTab.id);
	return areUrlsEqualByHost(pinnedTab.url, newTab.url);
}

function open(tab, url, activate) {
	log("Navigating from ", tab.url, " to ", url, " in tab ", tab.id);
	tab.url = url;
	if (activate)
		tab.activate();
}

function closeAndReopen(newTab, pinnedTab, activate) {
	open(pinnedTab, newTab.url, activate);
	log("Closing tab " + newTab.id);
	newTab.close();
	return true;
}

/*
 Squashes a tab if needed
 Should be called when URL is known
 Returns truth if no further notifcations about this tab is required
*/
function handleTabUrl(newTab) {
	// When tabs are created, their URL is unknown
	// Another notification will be made when URL is known
	if (!newTab.url) 
		return false;
	if (newTab.isPinned) //Optimization. Another check is done in isDuplicateTab().
		return false;
	log("Handling ",  newTab.id);
	if (newTab.url == "about:newtab")
		return true;
	for (let tab of tabs) {
		if (newTab === tab) {
			continue;
		}
		if (!isDuplicateTab(tab, newTab))
			continue;
		if (closeAndReopen(newTab, tab, newTab == tabs.activeTab)) {
			return true;
		}
	}
	return false;
}

function handleTabReady(newTab) {
	if (!newTab.reuseMonitor)
		return;
	log("Tab " + newTab.id + " update, url: " + newTab.url + ", state: " + newTab.readyState);
	newTab.reuseMonitor.apply();
}

function handleTabOpen(newTab) {
	log("Tab " + newTab.id + " opened, url: " + newTab.url + ", state: " + newTab.readyState);
	var monitor = handleTabUrl.bind(null, newTab);
	// No handling should be done to old tabs, this may surprize user
	// play.google.com demostrates delay of 5165 ms between notification of tab opening and ready state
	// TODO: find a way to get new URL earlier to speed-up squashing and lower this timeout
	monitor = expireAfter(monitor, Date.now() + 6000); 
	// There is no need to monitor it after succesful detection of duplicate
	monitor = blockAfterSuccess(monitor);
	newTab.reuseMonitor = monitor;
	var lowLevel = viewFor(newTab);
	var browser = getBrowserForTab(lowLevel);
	browser.addProgressListener(progressListener);
}

// Listen for tab openings.
tabs.on('open', handleTabOpen);

const timeModulus = 100000;

var progressListener = {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebProgressListener, Ci.nsISupportsWeakReference]),
    onLocationChange: function(aProgress, aRequest, aURI) {
		log("onLocationChange ");
		var tab = getTabForContentWindow(aProgress.DOMWindow);
		handleTabReady(modelFor(tab));
    }
};

