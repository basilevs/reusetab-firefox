const utils = require("../utils");
const timers = require("sdk/timers");

exports.testBlockAfterSuccess = function(assert) {
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
	assert.throws(wrapped, /Legitimate error/, "Exception propagates fine");
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
