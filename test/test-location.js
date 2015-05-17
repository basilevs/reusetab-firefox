"use strict";
const utils = require("../utils");
const location = require("../location");
const {addLocationListener, removeLocationListener} = location;
const tabs = require("sdk/tabs");

function getFirstTab() {
	for (let tab of tabs)
		return tab;
	return null;
}

exports.testAddRemove = function(assert) {
	const tab = getFirstTab();
	var i = 0;
	var tabInEvent = null;
	const listener = (tab) => {
		tabInEvent = tab;
		i++;
	};
	addLocationListener(tab, listener);
	removeLocationListener(tab, listener);
	assert.pass("No failures");
};

require("sdk/test").run(exports);
