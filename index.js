"use strict";
const tabs = require("sdk/tabs");
const {areUrlsEqualByHost, blockAfterSuccess, expireAfter, log} = require("./utils");
const {addLocationListener, removeLocationListener} = require("./location");
const { setTimeout } = require("sdk/timers");

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

function handleTabOpen(newTab) {
	log("Tab " + newTab.id + " opened, url: " + newTab.url + ", state: " + newTab.readyState);
	var monitor = handleTabUrl.bind(null, newTab);
	// There is no need to monitor it after succesful detection of duplicate
	monitor = blockAfterSuccess(monitor);
	// As url of tab is not known right after is opening (its always about:blank at this point),
	// we have to wait for its update.
	// We don't use tab.on('ready', ...) because it won't fire until DOM is loaded.
	// play.google.com demostrates delay of 5165 ms between notification of tab opening and ready state
	// Meanwhile location is known almost immedialtely after tab opening.
	addLocationListener(newTab, monitor);
	// No handling should be done to old tabs, this may surprize user
	// This also prevents listener leaks
	setTimeout(() => removeLocationListener(newTab, monitor), 6000);
	monitor();
}

// Listen for tab openings.
tabs.on('open', handleTabOpen);

require("sdk/system/unload").when(function() {
	tabs.removeListener('open', handleTabOpen);
});
