var tabs = require("sdk/tabs");
var urls = require("sdk/url");
require("sdk/ui/button/action").ActionButton({
  id: "list-tabs",
  label: "List Tabs",
  icon: "./icon-48.png",
  onClick: listTabs
});

function listTabs() {
	for (let tab of tabs)
		console.log(tab.title);
}

function matchUrls(pattern, target) {
	pattern = urls.URL(pattern);
	target = urls.URL(target);
	if (pattern.host == target.host) {
		console.log("Hosts are same: " + pattern.host + " " + target.host);
		return true;
	}
	return false;
}

//Returns true if tab should capture url
function match(tab, url) {
	if (!tab.isPinned)
		return false;
	if (matchUrls(tab.url, url)) {
		console.log("Hosts " + url.host + " and " + tab.url.host + " are same");
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
	console.log("New tab: " + newTab.url + ", matched tab: ",  matchingTab.url);
	open(matchingTab, newTab.url, newTab === tabs.activeTab);
	newTab.close();
	return true;
} 

function handleTabOpening(newTab) {
	console.log("Opened tab",  newTab.url);
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
tabs.on('open', function onOpen(tab) {
		handleTabOpening(tab);
});