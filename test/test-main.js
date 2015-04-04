"use strict";

const tabs = require("sdk/tabs");
const timers = require('sdk/timers');
require("../index");
const exports1=[];

function log() {
	console.log.apply(console, Array.prototype.slice.call(arguments));
}

function areAllTabsComplete() {
	for (let tab of tabs) {
		if (tab.readyState != "complete" && tab.readyState != "interactive") {
			log("Tab ", tab.id, " is ", tab.readyState, ", url: ", tab.url);
			return false;
		}
		log("Tab ", tab.id, " is ", tab.readyState, ", url: ", tab.url);
	}
	return true;
}

function openNew(url, pinned) {
	log("Opening ", url);
	tabs.open({url: url, isPinned: pinned});
}

var originalTab = null;
function leaveASingleTab() {
	if (!originalTab)
		originalTab = tabs[0];
	if (originalTab.url != "about:blank")
		throw new Error("Invalid start url: " + originalTab.url);
	for (let tab of tabs) {
		if (originalTab === tab)
			continue;
		tab.close();
	}
}

function iterateSteps(steps, canProceed, done) {
	var i = 0;
	var timerHandle = -1;
	function makeStep() {
		try{
			if (i >= steps.length)
				return true;
			log("Step: " + i + "/" + steps.length);
			steps[i]();
		} finally {
			i++;
			if (i >= steps.length) {
				return false;
			}
		}
		return true;
	}
	
	function tryStep() {
		log("Trying step");
		try {
			while (true) {
				if (!canProceed())
					return;
				if (!makeStep()) {
					uninstall();
					return;
				}
			} 
		} catch (e) {
			uninstall();
			throw e;
		}
	}
	function uninstall() {
		log("Completed iteration");
		tabs.removeListener('*', tryStep);
		timers.clearTimeout(timerHandle);
		done();
	}
	tabs.on('ready', tryStep);
	tryStep();
}

function executeAll() {
	var args = Array.prototype.slice.call(arguments);
	return function() {
		for (let f of args) {
			f();
		}
	};
}

exports1["test openNonDuplicate"] = function(assert, done) {
	iterateSteps(
		[
			leaveASingleTab,
			function() {
				openNew("about:blank", true);
				openNew("http://ya.ru/", false);
			},
			function() {
				assert.equal(3, tabs.length, "Both new tabs should be opened");
			},
			leaveASingleTab
		],
		areAllTabsComplete,
		done
	);
};

exports1["test openDuplicate"] = function(assert, done) {
	iterateSteps(
		[
			leaveASingleTab,
			function() {
				openNew("http://ya.ru/", true);
				openNew("http://ya.ru/", false);
			},
			function() {
				assert.equal(2, tabs.length, "Only one tab should left");
			},
			leaveASingleTab
		],
		areAllTabsComplete,
		done
	);
};
