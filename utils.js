"use strict";
var urls = require("sdk/url");

function debug() {
	//console.debug.apply(console, Array.prototype.slice.call(arguments));
}

/* Proxies notifications until callback returns truth */
function blockAfterSuccess(callback) {
	var success = false;
	return function() {
		if (success)
			return success;
		success = callback();
		debug("Result: " + success);
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
	debug("Matching urls " + url1 + " and " + url2);
	const host1 = getHost(url1);
	const host2 = getHost(url2);
	// On statrtup all tabs have about:blank or about:home urls for a short while.
	// These should not be considered equal and are not a subject for squash
	if (!host1 || !host2) {
		return false;
	}
	if (host1 == host2) {
		debug("Hosts are same: " + host1);
		return true;
	}
	return false;
}


exports.blockAfterSuccess = blockAfterSuccess;
exports.debug = debug;
exports.areUrlsEqualByHost = areUrlsEqualByHost;
