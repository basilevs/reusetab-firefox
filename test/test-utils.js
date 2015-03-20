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
	assert.pass("async Unit test running!");
	var i = 0;
	function delegate() {
		return i++;
	}
	var wrapped = utils.expireAfter(delegate, 100);	
	assert.equal(0, i, "Delegate is not called during wrapping");
	wrapped();
	assert.equal(1, i, "Delegate is called immediately after creation");
	
	timers.setTimeout(function() {
		wrapped();
		assert.equal(2, i, "Delegate is called after 10 ms delay");
	}, 50);
	timers.setTimeout(function() {
		assert.equal(2, i, "Previous timer executed");
		wrapped();
		assert.equal(2, i, "Delegate is not called after 200 ms delay");
		done();
	}, 200);
};

require("sdk/test").run(exports);
