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
			log("Tab " + tab.id + " is " + tab.readyState + ", url: " + tab.url);
			return false;
		}
		log("Tab ", tab.id, " is ", tab.readyState, ", url: ", tab.url);
	}
	return true;
}

function openNew(url, pinned) {
	log("Opening ", url);
	return new Promise(resolve => tabs.open({url: url, isPinned: pinned, onOpen:resolve}));
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

/*
Resolves to predicate result when it is truth
Arguments:
	install - installs change listener
	uninstall - makes the opposite
*/
function waitUntil(install, uninstall, predicate) {
	if (!install.apply || !uninstall.apply || !predicate.apply)
		throw new Error("All arguments should be functions");
	return new Promise(function(resolve, reject) {
		function check() {
			try {
				let result = predicate();
				log("waitUntil ", result, predicate); 
				if (result) {
					resolve(result);
					uninstall(check);
				}
			} catch (e) {
				reject(e);
				uninstall(check);
			}
		}
		install(check);
		check();
	});
}

/*
Resolves to predicate value.
Tries to resolve on every tab ready event.
*/
function waitOnTabsUntil(predicate) {
	return waitUntil(
		tabs.on.bind(tabs, 'ready'),
		tabs.removeListener.bind(tabs, 'ready'),
		predicate
	);
}


// Resolves to truth when all tabs are complete or interactive
function waitForTabs() {
	return waitOnTabsUntil(areAllTabsComplete);
}

function composePromises(promiseFactories, input) {
	let promise = Promise.resolve(promiseFactories[0](input));
	for (let i = 1; i < promiseFactories.length; i++) {
		let step = promiseFactories[i];
		promise = promise.then(value => Promise.resolve(step(value)));
	}
	return promise;
}


function prependPromise(prefixPromiseFactory, actionPromiseFactory) {
	if (!prefixPromiseFactory.apply || !actionPromiseFactory.apply)
		throw new Error("Both arguments should be  set");
	return function(value) {
		log("prependPromise", value);
		prefixPromiseFactory().then(_ => actionPromiseFactory(value));
	};
}

function doTabManipulations(steps) {
	var waiting = [];
	for (let step of steps) {
		waiting.push(prependPromise(waitForTabs, step));
	}
	return composePromises(waiting);
}

function assertPromise(runner, promise) {
	runner.waitUntilDone(10000);
	let done = runner.done.bind(runner);
	promise.then(done, done);
}

exports["test openNonDuplicate"] = function(runner) {
	let promise = doTabManipulations(
		[
			leaveASingleTab,
			function() {
				return Promise.all([
					openNew("about:blank", true),
					openNew("http://ya.ru/", false)
				]);
			},
			function(openedTabs) {
				runner.assert(areAllTabsComplete(), "All tabs should be ready");
				runner.assertEqual(3, tabs.length, "Both new tabs should be opened");
				leaveASingleTab();
			}
		]
	);
	assertPromise(runner, promise);
};

exports1["test openDuplicate"] = function(runner) {
	let promise = doTabManipulations(
		[
			leaveASingleTab,
			function() {
				openNew("http://ya.ru/", true);
				openNew("http://ya.ru/", false);
			},
			function() {
				runner.assert(areAllTabsComplete(), "All tabs should be ready");
				runner.assertEqual(2, tabs.length, "Only one tab should left");
			},
			leaveASingleTab
		]
	);
	
	assertPromise(runner, promise);
};
