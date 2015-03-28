var utils = require("./utils");
var timers = require("sdk/timers");

exports["test blockAfterSuccess"] = function(assert) {
	var i = 0;
	var delegate = function() {
		i++;
		return i == 2;
	};
	var wrapped = utils.blockAfterSuccess(delegate);
	assert.equal(0, i, "Delegate is not called during wrapping");
	wrapped();
	assert.equal(1, i, "Delegate is called first time");
	wrapped();
	assert.equal(2, i, "Delegate is called after fail");
	wrapped();
	assert.equal(2, i, "Delegate is not called after success");
	i = 3;
	wrapped();
	assert.equal(3, i, "Delegate is never called after success");
	delegate = function() {
		throw new Error("Legitimate error");
	};
	wrapped = utils.blockAfterSuccess(delegate);
	assert.throws(wrapped, "Exception propagates fine");
};

exports["test expireAfter"] = function(assert, done) {
	var i = 0;
	function delegate() {
		return i++;
	}
	var wrapped = utils.expireAfter(delegate, Date.now()+100);
	assert.equal(0, i, "Delegate is not called during wrapping");
	wrapped();
	assert.equal(1, i, "Delegate is called immediately after creation");
	
	timers.setTimeout(function() {
		wrapped();
		assert.equal(2, i, "Delegate is called before timeout 50 ms delay");
	}, 50);
	timers.setTimeout(function() {
		assert.equal(2, i, "Previous timer executed");
		wrapped();
		assert.equal(2, i, "Delegate is not called after last call + timeout ");
		done();
	}, 120);
};

exports["test expireAfterInactivity"] = function(assert, done) {
	var i = 0;
	function delegate() {
		return i++;
	}
	var wrapped = utils.expireAfterInactivity(delegate, 100);
	assert.equal(0, i, "Delegate is not called during wrapping");
	wrapped();
	assert.equal(1, i, "Delegate is called immediately after creation");
	
	timers.setTimeout(function() {
		wrapped();
		assert.equal(2, i, "Delegate is called before timeout");
	}, 50);
	timers.setTimeout(function() {
		wrapped();
		assert.equal(3, i, "Delegate is called after timeout but before last call + timeout");
	}, 120);
	timers.setTimeout(function() {
		assert.equal(3, i, "Previous timer executed");
		wrapped();
		assert.equal(3, i, "Delegate is not called after last call + timeout ");
		done();
	}, 250);

};

exports["test expireAfterInactivity2"] = function(assert, done) {
	var i = 0;
	function delegate() {
		return i++;
	}
	var wrapped = utils.expireAfterInactivity(delegate, 100);
	timers.setTimeout(function() {
		assert.equal(0, i, "Delegate is not called during creation");
		wrapped();
		assert.equal(1, i, "Delegate is called after creation + timeout");
		done();
	}, 120);
};



exports["test areUrlsEqualByHost"] = function(assert) {
	var areEqual = utils.areUrlsEqualByHost;
	function assertEqual(url1, url2) {
		assert.ok(areEqual(url1, url2), url1 + " == " + url2);
	}
	function assertNotEqual(url1, url2) {
		assert.ok(!areEqual(url1, url2), url1 + " != " + url2);
	}
	assertEqual("https://git.eclipse.org/r/#/q/is:watched+status:open", "https://git.eclipse.org/r/44335");
	assertNotEqual("about:blank", "about:home");
};

require("sdk/test").run(exports);
