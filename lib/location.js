const {Ci, Cu} = require("chrome");
const {viewFor} = require('sdk/view/core');
const {modelFor} = require('sdk/model/core');
const {getTabForBrowser, getBrowserForTab, getTabForContentWindow} = require("sdk/tabs/utils");
const {log} = require("./utils");
Cu.import("resource://gre/modules/XPCOMUtils.jsm", this);

var progressListener = {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebProgressListener, Ci.nsISupportsWeakReference]),
    onLocationChange: function(aProgress, aRequest, aURI) {
		log("onLocationChange ");
		const view = getTabForContentWindow(aProgress.DOMWindow);
		const model = modelFor(view);
		const {locationChangeListeners} = model;
		if (!locationChangeListeners)
			return;
		for (let i in locationChangeListeners) {
			locationChangeListeners[i].apply(null, [model]);
		}
    }
};

function getBrowserForModel(tab) {
	const view = viewFor(tab);
	const browser = getBrowserForTab(view);
	if (!browser)
		throw new Error("Failed to get brwoser for tab " + tab.id);
	return browser;
}

function addLocationListener(tab, callback) {
	if (!tab.locationChangeListeners) {
		tab.locationChangeListeners = [];
		getBrowserForModel(tab).addProgressListener(progressListener);
	}
	tab.locationChangeListeners.push(callback);
}

function removeLocationListener(tab, callback) {
	const listeners = tab.locationChangeListeners;
	if (!listeners)
		return;
	var index = listeners.indexOf(callback);
	listeners.splice(index, 1);
	if (!listeners.length) {
		getBrowserForModel(tab).addProgressListener(progressListener);
		delete tab.locationChangeListeners;
		getBrowserForModel(tab).removeProgressListener(progressListener);
	}
}

exports.addLocationListener = addLocationListener;
exports.removeLocationListener = removeLocationListener;
