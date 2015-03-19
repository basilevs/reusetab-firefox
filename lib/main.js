var tabs = require("sdk/tabs");
var urls = require("sdk/url");

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
	if (matchUrls(tab.url, url)) {
		log("Hosts " + url.host + " and " + tab.url.host + " are same");
		return true;
	}
	return false;
}

function open(tab, url, activate) {
	if (tab.url != url)
		tab.url = url;
	if (activate)
		matchingTab.activate();
}

function processMatch(newTab, matchingTab) {
	if (!match(matchingTab, newTab.url))
		return false;
	log("New tab: " + newTab.url + ", matched tab: ",  matchingTab.url);
	open(matchingTab, newTab.url, newTab === tabs.activeTab);
	newTab.close();
	return true;
} 

function handleTabOpening(newTab) {
	if (newTab.reuseChecked)
		return;
	log("Tab " + newTab.id + " - url: " + newTab.url + ", state: " + newTab.readyState);
	if (newTab.readyState == "interactive" || newTab.readyState == "complete") {
		newTab.reuseChecked = true;
		handleTabUrl(newTab);
	}
}

function handleTabUrl(newTab) {
	log("Opened tab",  newTab.url);
	for (let tab of tabs) {
		if (newTab === tab) {
			continue;
		}
		if (processMatch(newTab, tab)) {
			break;
		}
	}
}

// Listen for tab openings.
tabs.on('ready', handleTabOpening);