import MimeTypeMap from './MimeTypeMap';

export default class LayResponse {
	#routing = undefined;
	#body = 'Not Implemented';
	#file = undefined;
	#redirectUrl = undefined;
	#statusCode = 502;
	#headerList = new Map();
	#mimeType = 'text/plain';
	#options = {
		disableFileCheck: false,
	};

	constructor(routing) {
		this.#routing = routing;
	}

	type(key) {
		if (!MimeTypeMap.has(key)) {
			if(this.#mimeType != 'text/plain') this.#mimeType = MimeTypeMap.get('text');
			return;
		}
		this.mimeType = MimeTypeMap.get(key);
	}

	status(value = null) {
		if (isNaN(value)) throw new TypeError('status has to be a number');
		this.#statusCode = value || 502;
	}

	redirect(value = null, status = 302) {
		if (value === null) {
			return this.#redirectUrl;
		}

		this.#redirectUrl = value;
		this.status(status);
	}

	headers() {
		if (!this.#headerList.get('Content-Type')) {
			this.#headerList.set('Content-Type', `${this.#mimeType}`);
		}
		return this.#headerList;
	}

	header(key, value) {
		this.#headerList.set(key, value);
	}

	async build(options = {}) {
		if (this.#redirectUrl) {
			return Response.redirect(this.#redirectUrl, this.status());
		}

		if(this.#file) return new Response(this.#file);

		if(['text/plain'].includes(this.#mimeType)) {
			await this.handleLayout(this.#body, options);
		}

		return new Response(this.#body, {
			status: this.status(),
			headers: this.headers(),
		});
	}

	async send() {
		await this.text(...arguments);

		if (typeof(arguments[0]) != 'string' || !arguments[0]) return;
		if (this.#options.disableFileCheck) return;

		try {
			const temp = Bun.file(arguments[0]);

			if (await temp.exists()) {
				this.#file = temp;
			}
		} catch (err) {}
	}

	async text() {
		let [value, ...rest] = arguments;
		if (typeof value != 'string') {
			value = JSON.stringify(value);
		}

		this.type('text');
		await this.handleLayout(value, ...rest);
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
		this.#body = JSON.stringify(data, replacer, space);
	}

	async render(path, data = {}) {
		const loader = await this.#routing.getServer().load(path);
		const content = await loader.parse(data);

		return content;
	}

	async handleLayout(content, options = {}) {
		this.#body = String(content);
		if(!options.hasOwnProperty('layout') || typeof options.layout !== 'string') {
			if(this.#routing.getServer().hasLayout()) {
				options.layout = this.#routing.getServer().getLayout();
			}
		}

		if(!options.layout) return

		const layout = await this.#routing.getServer().load(options.layout);
		if(layout) {
			this.#body = await layout.parse({ ...(options?.data || {}), content: String(content) },  options);
			this.#mimeType = layout.mimeType;
		}
	}
}
