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

function spawn(generatorFunc) {
  function continuer(verb, arg) {
    var result;
    try {
      result = generator[verb](arg);
    } catch (err) {
      return Promise.reject(err);
    }
    if (result.done) {
      return result.value;
    } else {
      return Promise.resolve(result.value).then(onFulfilled, onRejected);
    }
  }
  var generator = generatorFunc();
  var onFulfilled = continuer.bind(continuer, "next");
  var onRejected = continuer.bind(continuer, "throw");
  return onFulfilled();
}

exports.testWaitUntilCompletion = function(runner) {
	var predicateValue = false;
	var predicateCallCount = 0;
	function predicate() {
		predicateCallCount++;
		log("Predicate called ", predicateCallCount,  predicateValue);
		return predicateValue;
	}
	var waiter = new Waiter(predicate);
	var promise = spawn(function*() {
		yield;
		runner.assertFunction(waiter.listener);
		runner.assertEqual(1, predicateCallCount);
		runner.assertEqual(null, waiter.result);
		runner.assertEqual(null, waiter.failure);
		waiter.listener();
		yield;
		runner.assertEqual(2, predicateCallCount);
		runner.assertEqual(null, waiter.result);
		runner.assertEqual(null, waiter.failure);
		predicateValue = "here  we are";
		waiter.listener();
		yield;
		runner.assertEqual(3, predicateCallCount);
		runner.assertEqual("here  we are", waiter.result);
		runner.assertEqual(null, waiter.failure);
		runner.assertEqual(null, waiter.listener);
		return "Test success";
	});
	assertPromise(runner, promise.then(r => runner.assertEqual("Test success", r)));
};

exports.testWaitUntilFailure = function(runner) {
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
	var promise = spawn(function*() {
		runner.assertEqual(2, predicateCallCount);
		runner.assertEqual(null, waiter.result);
		runner.assertEqual(null, waiter.failure);
		error = new Error("Legitimate failure");
		waiter.listener();
		yield;
		runner.assertEqual(error, waiter.failure);
		runner.assertEqual(null, waiter.result);
	});
	assertPromise(runner, promise);
};

function assertPromise(runner, promise) {
	runner.waitUntilDone(10000);
	function done(value) {
		log("Done invoked: ", value);
		runner.done();
	}
	function fail(e) {
		log("Fail invoked: ", e);
		runner.fail(e);
	}
	promise.then(done, fail);
}

exports["test openNonDuplicate"] = function(runner) {
	let promise = spawn(function*() {
		let openedTabs = yield Promise.all([
			openNew("about:blank", true),
			openNew("http://ya.ru/", false)
		]);
		yield waitForTabs();
		console.log("Tabs opened", openedTabs);
		runner.assertEqual(3, tabs.length, "Both new tabs should be opened");
		yield Promise.all([closeTab(openedTabs[0]), closeTab(openedTabs[1])]);
	});
	assertPromise(runner, promise);
};

exports["test openDuplicate"] = function(runner) {
	let promise = spawn(function*() {
		let openedTabs = yield Promise.all([
			openNew("http://ya.ru/", true),
			openNew("http://ya.ru/", false)
		]);
		yield waitForTabs();
		runner.assertEqual(2, tabs.length, "Only one tab should left");
		yield closeTab(openedTabs[0]);
	});
	assertPromise(runner, promise);
};

exports["test openPinnedDuplicate"] = function(runner) {
	let promise = spawn(function*() {
		let openedTabs = yield Promise.all([
			openNew("http://ya.ru/", true),
			openNew("http://ya.ru/", true)
		]);
		yield waitForTabs();
		runner.assertEqual(3, tabs.length, "Both tabs should left");
		yield Promise.all([closeTab(openedTabs[0]), closeTab(openedTabs[1])]);
	});
	assertPromise(runner, promise);
};
