"use strict";
var urls = require("sdk/url");

function log() {
	console.debug.apply(console, Array.prototype.slice.call(arguments));
}

const logModulus = 100000;
/* Blocks after a specified time */
function expireAfter(callback, expirationTime) {
	return function() {
		var now = Date.now();
		log("Now: ", now % logModulus, ", expiration: ", expirationTime % logModulus);
		if (now > expirationTime)
			return true;
		return callback();
	};
}

/*
Blocks after a period of inactivity
Starts accounting from the first call.
*/
function expireAfterInactivity(callback, timeout) {
	var expirationTime = null;
	return function() {
		var now = Date.now();
		if (!expirationTime)
			expirationTime = now + timeout;
		log("Now: ", now % logModulus, ", expiration: ", expirationTime % logModulus, ", timeout: ", timeout);
		if (now > expirationTime)
			return true;
		expirationTime = now + timeout;
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

exports.expireAfter = expireAfter;
exports.blockAfterSuccess = blockAfterSuccess;
exports.log = log;
exports.areUrlsEqualByHost = areUrlsEqualByHost;
exports.expireAfterInactivity = expireAfterInactivity
