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
	assert.waitUntilDone(200);
	let done = assert.done.bind(assert);
	var i = 0;
	function delegate() {
		return i++;
	}
	var wrapped = utils.expireAfter(delegate, Date.now()+100);
	assert.assertEqual(0, i, "Delegate is not called during wrapping");
	wrapped();
	assert.assertEqual(1, i, "Delegate is called immediately after creation");
	
	timers.setTimeout(function() {
		wrapped();
		assert.assertEqual(2, i, "Delegate is called before timeout 50 ms delay");
	}, 50);
	timers.setTimeout(function() {
		assert.assertEqual(2, i, "Previous timer executed");
		wrapped();
		assert.assertEqual(2, i, "Delegate is not called after last call + timeout ");
		done();
	}, 120);
};

exports.expireAfterInactivity = function(assert) {
	let done = assert.done.bind(assert);
	assert.waitUntilDone(600);

	var i = 0;
	function delegate() {
		return i++;
	}
	var wrapped = utils.expireAfterInactivity(delegate, 200);
	assert.assertEqual(0, i, "Delegate is not called during wrapping");
	wrapped();
	assert.assertEqual(1, i, "Delegate is called immediately after creation");
	
	timers.setTimeout(function() {
		assert.assertEqual(1, i, "State is unchanged");
		wrapped();
		assert.assertEqual(2, i, "Delegate is called before timeout");
	}, 100);
	timers.setTimeout(function() {
		assert.assertEqual(2, i, "State is unchanged");
		wrapped();
		assert.assertEqual(3, i, "Delegate is called after timeout but before last call + timeout");
	}, 250);
	timers.setTimeout(function() {
		assert.assertEqual(3, i, "State is unchanged");
		wrapped();
		assert.assertEqual(3, i, "Delegate is not called after last call + timeout ");
		done();
	}, 500);

};

exports.expireAfterInactivity2 = function(assert) {
	assert.waitUntilDone(200);
	let done = assert.done.bind(assert);
	var i = 0;
	function delegate() {
		return i++;
	}
	var wrapped = utils.expireAfterInactivity(delegate, 100);
	timers.setTimeout(function() {
		assert.assertEqual(0, i, "Delegate is not called during creation");
		wrapped();
		assert.assertEqual(1, i, "Delegate is called after creation + timeout");
		done();
	}, 120);
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

