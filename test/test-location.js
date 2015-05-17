"use strict";
const utils = require("../utils");
const location = require("../location");
const {addLocationListener, removeLocationListener} = location;
const tabs = require("sdk/tabs");

function log() {
	console.log.apply(console, Array.prototype.slice.call(arguments));
}

function getFirstTab() {
	for (let tab of tabs)
		return tab;
	return null;
}

function openNew(url, pinned) {
	log("Opening ", url);
	return new Promise(resolve => tabs.open({url: url, isPinned: pinned, onOpen:resolve}));
}

exports.testAddRemove = function(assert) {
	const tab = getFirstTab();
	var i = 0;
	var tabInEvent = null;
	const listener = (tab) => {
		tabInEvent = tab;
		i++;
	};
	addLocationListener(tab, listener);
	removeLocationListener(tab, listener);
	assert.pass("No failures");
};

exports.testAddCloseRemove = function*(assert) {
	const tab = yield openNew("http://yastatic.net/morda-logo/i/logo.svg", false);
	assert.ok(tab);
	var i = 0;
	var tabInEvent = null;
	const listener = (tab) => {
		tabInEvent = tab;
		i++;
	};
	addLocationListener(tab, listener);
	yield;
	tab.close();
	yield;
	removeLocationListener(tab, listener);
	yield;
	assert.pass("No failures");
};


require("sdk/test").run(exports);
