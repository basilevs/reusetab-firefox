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

function closeTab(tab) {
	return new Promise(resolve => tab.close(resolve));
}

/*
Resolves to predicate result when it becomes truth
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
					uninstall(check);
					resolve(result);
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

/*Helps to test waitUntil*/
function Waiter(predicate) {
	this.listener = null;
	var waiter = this;
	function uninstall(arg) {
		if (arg != waiter.listener)
			throw new Error("Listeners do not match");
		waiter.listener = null;
	}
	this.promise = waitUntil(l => waiter.listener = l, uninstall, predicate);
	this.result = null;
	this.failure = null;
	function resolve(r) {
		console.log("Waiter resolved with", r);
		waiter.result = r;
	}
	function reject(r) {
		console.log("Waiter rejected with", r);
		waiter.failure = r;
	}
	this.promise.then(resolve, reject);
}

function setTimeout(ms) {
	return new Promise(function(resolve, reject) {
		timers.setTimeout(resolve, ms);
	});
}

exports.testWaitUntilCompletion = function*(assert) {
	var predicateValue = false;
	var predicateCallCount = 0;
	function predicate() {
		predicateCallCount++;
		log("Predicate called ", predicateCallCount,  predicateValue);
		return predicateValue;
	}
	var waiter = new Waiter(predicate);
	log("SPawned");
	yield;
	log("Yielded");
	assert.ok(waiter.listener.apply);
	assert.equal(1, predicateCallCount);
	assert.equal(null, waiter.result);
	assert.equal(null, waiter.failure);
	waiter.listener();
	yield;
	assert.equal(2, predicateCallCount);
	assert.equal(null, waiter.result);
	assert.equal(null, waiter.failure);
	predicateValue = "here  we are";
	waiter.listener();
	yield Promise.resolve();
	assert.equal(3, predicateCallCount);
	assert.equal("here  we are", waiter.result);
	assert.equal(null, waiter.failure);
	assert.equal(null, waiter.listener);
};

exports.testWaitUntilFailure = function*(assert) {
	var predicateValue = false;
	var predicateCallCount = 0;
	var error = null;
	function predicate() {
		predicateCallCount++;
		if (error)
			throw error;
		return predicateValue;
	}
	var waiter = new Waiter(predicate);
	waiter.listener();
	assert.equal(2, predicateCallCount);
	assert.equal(null, waiter.result);
	assert.equal(null, waiter.failure);
	error = new Error("Legitimate failure");
	waiter.listener();
	yield Promise.resolve();
	assert.equal(error, waiter.failure);
	assert.equal(null, waiter.result);
};

function assertPromise(assert, done, promise) {
	function doneW(value) {
		log("Done invoked: ", value);
		done();
	}
	function failW(e) {
		assert.fail(e);
		done();
	}
	promise.then(doneW, failW);
}

exports["test openNonDuplicate"] = function*(assert) {
	let openedTabs = yield Promise.all([
		openNew("about:blank", true),
		openNew("http://ya.ru/", false)
	]);
	yield waitForTabs();
	console.log("Tabs opened", openedTabs);
	assert.equal(3, tabs.length, "Both new tabs should be opened");
	yield Promise.all([closeTab(openedTabs[0]), closeTab(openedTabs[1])]);
};

exports["test openDuplicate"] = function*(assert) {
	let openedTabs = yield Promise.all([
		openNew("http://ya.ru/", true),
		openNew("http://ya.ru/", false)
	]);
	yield waitForTabs();
	assert.equal(2, tabs.length, "Only one tab should left");
	yield closeTab(openedTabs[0]);
};

exports["test openPinnedDuplicate"] = function*(assert) {
	let openedTabs = yield Promise.all([
		openNew("http://ya.ru/", true),
		openNew("http://ya.ru/", true)
	]);
	yield waitForTabs();
	assert.equal(3, tabs.length, "Both tabs should left");
	yield Promise.all([closeTab(openedTabs[0]), closeTab(openedTabs[1])]);
};

exports["test openRedirect"] = function*(assert) {
	let openedTabs = yield Promise.all([
		openNew("http://ya.ru/", true),
		openNew("http://goo.gl/VuKfnS", false)
	]);
	yield waitForTabs();
	assert.equal(2, tabs.length, "Only one tab should left");
	yield closeTab(openedTabs[0]);
};


require("sdk/test").run(exports);