import MimeTypeMap from './MimeTypeMap';

export default class LayResponse {
	body;
	statusCode;
	headerList = new Map();
	mimeType;
	options = {
		disableFileCheck: false,
	};

	constructor(router) {
		this.router = router;
		this.body = 'Not Implemented';
		this.statusCode = 502;
		this.headerList = new Map();
		this.mimeType = 'text/plain';
	}

	async send(str) {
		this.type('text');
		this.body = str;

		if (this.options.disableFileCheck) return;
		try {
			const temp = Bun.file(str);

			if (await temp.exists()) {
				this.file = str;
			}
		} catch (err) {}
	}

	json(data, options = {}) {
		let { replacer, space } = options;
		if (!Array.isArray(replacer) && typeof replacer != 'function') {
			replacer = null;
		}
		if (isNaN(space) || Math.floor(space) < 0) {
			space = 0;
		}
		this.type('json');
		this.body = JSON.stringify(data, replacer, space);
	}

	type(key) {
		if (!MimeTypeMap.has(key)) {
			this.mimeType = MimeTypeMap.get('text');
			return;
		}
		this.mimeType = MimeTypeMap.get(key);
	}

	status(value = null) {
		if (isNaN(value)) throw new Error('status has to be a number');
		this.statusCode = value || 502;
	}

	text(value = null) {
		if (typeof value != 'string') {
			value = JSON.stringify(value);
		}

		this.type('text');
		this.body = value;
	}

	json(value = null) {
		this.text(value);
		this.type('json');
	}

	redirect(value = null, status = 302) {
		if (value === null) {
			return this.redirectUrl;
		}

		this.redirectUrl = value;
		this.status(status);
	}

	headers() {
		if (!this.headerList.get('Content-Type')) {
			this.headerList.set('Content-Type', `${this.mimeType}`);
		}
		return this.headerList;
	}

	header(key, value) {
		this.headerList.set(key, value);
	}

	build(options = {}) {
		if (this.redirectUrl) {
			return Response.redirect(this.redirectUrl, this.status());
		}
		return new Response(this.body, {
			status: this.status(),
			headers: this.headers(),
		});
	}
}
