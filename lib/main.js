var tabs = require("sdk/tabs");
var urls = require("sdk/url");
var utils = require("./utils.js");

function log() {
	//console.info.apply(console, Array.prototype.slice.call(arguments));
}

function listTabs() {
	for (let tab of tabs)
		log(tab.title);
}

function matchUrls(pattern, target) {
	pattern = urls.URL(pattern);
	target = urls.URL(target);
	if (pattern.host == target.host) {
		log("Hosts are same: " + pattern.host + " " + target.host);
		return true;
	}
	return false;
}

//Returns true if tab should capture url
function match(tab, url) {
	if (!tab.isPinned)
		return false;
	log("Matching urls " + tab.url + " and " + url + " ");
	if (matchUrls(tab.url, url)) {
		return true;
	}
	return false;
}

function open(tab, url, activate) {
	if (tab.url != url)
		tab.url = url;
	if (activate)
		tab.activate();
}

function processMatch(newTab, matchingTab) {
	if (!match(matchingTab, newTab.url))
		return false;
	log("New tab: " + newTab.url + ", matched tab: ",  matchingTab.url);
	open(matchingTab, newTab.url, newTab === tabs.activeTab);
	newTab.close();
	return true;
}

function handleTabUrl(newTab) {
	log("Opened tab",  newTab.url);
	for (let tab of tabs) {
		if (newTab === tab) {
			continue;
		}
		if (processMatch(newTab, tab)) {
			return true;
		}
	}
	return false;
}

function handleTabOpening(newTab) {
	if (!newTab.url)
		return;
	log("Tab " + newTab.id + " ready, url: " + newTab.url + ", state: " + newTab.readyState);
	if (!newTab.reuseMonitor) {
		newTab.reuseMonitor = utils.blockAfterSuccess(utils.expireAfter(handleTabUrl.bind(null, newTab), 5000));
	}
	newTab.reuseMonitor.apply();
}


// Listen for tab openings.
tabs.on('ready', handleTabOpening);