var utils = require("../utils");
var timers = require("sdk/timers");

exports.blockAfterSuccess = function(assert) {
	var i = 0;
	var delegate = function() {
		i++;
		return i == 2;
	};
	var wrapped = utils.blockAfterSuccess(delegate);
	assert.assertEqual(0, i, "Delegate is not called during wrapping");
	wrapped();
	assert.assertEqual(1, i, "Delegate is called first time");
	wrapped();
	assert.assertEqual(2, i, "Delegate is called after fail");
	wrapped();
	assert.assertEqual(2, i, "Delegate is not called after success");
	i = 3;
	wrapped();
	assert.assertEqual(3, i, "Delegate is never called after success");
	delegate = function() {
		throw new Error("Legitimate error");
	};
	wrapped = utils.blockAfterSuccess(delegate);
	assert.assertRaises(wrapped, "Legitimate error", "Exception propagates fine");
};

exports.expireAfter = function(assert) {
	var i = 0;
	function delegate() {
		return i++;
	}
	var now = 1000;
	function getNow() {
		return now;
	}
	var wrapped = utils.expireAfter(delegate, 1100, getNow);
	assert.assertEqual(0, i, "Delegate is not called during wrapping");
	wrapped();
	assert.assertEqual(1, i, "Delegate is called immediately after creation");
	now = 1050;
	wrapped();
	assert.assertEqual(2, i, "Delegate is called before timeout 50 ms delay");
	now = 1120;
	assert.assertEqual(2, i, "Previous timer executed");
	wrapped();
	assert.assertEqual(2, i, "Delegate is not called after last call + timeout ");
};

exports.expireAfterInactivity = function(assert) {
	var i = 0;
	var now = 0;
	function delegate() {
		return i++;
	}
	function getNow() {
		return now;
	}
	var wrapped = utils.expireAfterInactivity(delegate, 200, getNow);
	assert.assertEqual(0, i, "Delegate is not called during wrapping");
	wrapped();
	assert.assertEqual(1, i, "Delegate is called immediately after creation");
	now = 100;
	assert.assertEqual(1, i, "State is unchanged");
	wrapped();
	assert.assertEqual(2, i, "Delegate is called before timeout");
	now = 250;
	assert.assertEqual(2, i, "State is unchanged");
	wrapped();
	assert.assertEqual(3, i, "Delegate is called after timeout but before last call + timeout");
	now = 500;
	assert.assertEqual(3, i, "State is unchanged");
	wrapped();
	assert.assertEqual(3, i, "Delegate is not called after last call + timeout ");
};

exports.expireAfterInactivity2 = function(assert) {
	var i = 0;
	function delegate() {
		return i++;
	}
	var now = 0;
	function getNow() {
		return now;
	}
	var wrapped = utils.expireAfterInactivity(delegate, 100, getNow);
	now = 120;
	assert.assertEqual(0, i, "Delegate is not called during creation");
	wrapped();
	assert.assertEqual(1, i, "Delegate is called after creation + timeout");
};



exports["test areUrlsEqualByHost"] = function(assert) {
	var areEqual = utils.areUrlsEqualByHost;
	function assertEqual(url1, url2) {
		assert.assert(areEqual(url1, url2), url1 + " == " + url2);
	}
	function assertNotEqual(url1, url2) {
		assert.assert(!areEqual(url1, url2), url1 + " != " + url2);
	}
	assertEqual("https://git.eclipse.org/r/#/q/is:watched+status:open", "https://git.eclipse.org/r/44335");
	assertNotEqual("about:blank", "about:home");
};

