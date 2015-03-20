/* Proxies notifications until expiration */
function expireAfter(callback, timeout) {
	var expiration = Date.now() + timeout;
	return function() {
		if (Date.now() > expiration)
			return true;
		return callback();
	};
}

/* Proxies notifications until callback returns truth */
function blockAfterSuccess(callback) {
	var success = false;
	return function() {
		if (success)
			return true;
		return success = callback();
	};
}

exports.expireAfter = expireAfter;
exports.blockAfterSuccess = blockAfterSuccess;
