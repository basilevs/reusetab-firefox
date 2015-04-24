"use strict";
var urls = require("sdk/url");

function log() {
	console.debug.apply(console, Array.prototype.slice.call(arguments));
}

const logModulus = 100000;
/* Blocks after a specified moment in time
	callback - a function to be called
	expirationTime - a time in milliseconds since epoch
	now - Date.now function
*/
function expireAfter(callback, expirationTime, now) {
	if (!now)
		now = Date.now;
	return function() {
		if (!callback)
			return true;
		var time = now();
		log("Now: ", time % logModulus, ", expiration: ", expirationTime % logModulus);
		if (time > expirationTime) {
			callback = null;
			return true;
		}
		return callback();
	};
}

/*
Blocks after a period of inactivity
Starts accounting from the first call.
*/
function expireAfterInactivity(callback, timeout, now) {
	if (!now)
		now = Date.now;
	var expirationTime = null;
	return function() {
		var time = now();
		if (!expirationTime)
			expirationTime = time + timeout;
		log("Now: ", time % logModulus, ", expiration: ", expirationTime % logModulus, ", timeout: ", timeout);
		if (time > expirationTime)
			return true;
		expirationTime = time + timeout;
		return callback();
	};
}

/* Proxies notifications until callback returns truth */
function blockAfterSuccess(callback) {
	var success = false;
	return function() {
		if (success)
			return success;
		success = callback();
		log("Result: " + success);
		if (success)
			callback = null;
		return success;
	};
}

function getHost(url) {
	if (!url)
		return null;
	return urls.URL(url).host;
}

/*
 Checks if hosts of urls are equal.
 Accepts urls in a string form.
 Returns boolean.
*/
function areUrlsEqualByHost(url1, url2) {
	log("Matching urls " + url1 + " and " + url2);
	const host1 = getHost(url1);
	const host2 = getHost(url2);
	// On statrtup all tabs have about:blank or about:home urls for a short while.
	// These should not be considered equal and are not a subject for squash
	if (!host1 || !host2) {
		return false;
	}
	if (host1 == host2) {
		log("Hosts are same: " + host1);
		return true;
	}
	return false;
}

/*
	Manages a map of lists
	Functionality is delegated to contructor argument.
	It should have get(key), set(key, value) and delete(key) methods
*/
function MultiMap(map) {
	if (!map.get.apply || !map.set.apply)
		throw new Error("Atgument should have get and set methods");
	this.map = map;
}

function remove(array, value) {
	var index;
	while ((index = array.indexOf(value)) != -1) {
		array.splice(index, 1);
	}
}

MultiMap.prototype = {
	onFirstValueAdded: function(key) {},
	onLastValueRemoved: function(key) {},
	add: function (key, value) {
		let current = this.map.get(key);
		if (current) {
			if (current.length <= 0)
				throw new Error("There should be no empty arrays in map");
		} else {
			this.map.set(key, current = []);
			this.onFirstValueAdded(key);
		}
		current.push(value);
	},
	remove: function(key, value) {
		let current = this.map.get(key);
		if (current) {
			if (current.length <= 0)
				throw new Error("There should be no empty arrays in map");
			remove(current, value);
			if (current.length <= 0) {
				this.onLastValueRemoved(key);
				this.map.delete(key);
			}
		}
	},
	get: function(key) {
		let current = this.map.get(key);
		if (!current)
			return [];
		if (current.length <= 0)
			throw new Error("There should be no empty arrays in map");
		return current.slice();
	}
};

exports.expireAfter = expireAfter;
exports.blockAfterSuccess = blockAfterSuccess;
exports.log = log;
exports.areUrlsEqualByHost = areUrlsEqualByHost;
exports.expireAfterInactivity = expireAfterInactivity;
exports.MultiMap = MultiMap;
