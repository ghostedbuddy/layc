const LOGGING_TYPES = ['log', 'debug', 'error', 'warn', 'info'];
function Logger (data, type = 'debug') {
	if(!process.env.DEBUG) return;
	if(LOGGING_TYPES.indexOf(type) < 0) type = 'log';

	console[type](...(Array.isArray(data) ? data : [data]));
}

for(const k of LOGGING_TYPES) {
	Logger[k] = function() {
		Logger(arguments, k);
	}
}

export default Logger;
