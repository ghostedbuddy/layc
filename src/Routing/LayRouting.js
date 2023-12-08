export default class LayRouting {
	router;
	namespace;
	constructor(router, namespace = null) {
		this.router = router;

		if (namespace !== null) this.namespace = namespace;
	}

	setNamespace(ns) {
		if (!ns || typeof ns != 'string') this.namespace = null;
		this.namespace = ns;
	}

	routes() {
		return this.router.routes;
	}

	add(path, cb, method) {
		if (this.namespace) {
			if (!path.startsWith('/')) path = '/' + path;
			path = this.namespace + path;
		}

		this.router.add(path, cb, method);
	}

	route(config = {}) {
		if (typeof config != 'object')
			throw new Error('route config is not an object');

		const { path, handle, method = 'get' } = config;
		if (typeof path != 'string')
			throw new Error('route path is not a string');
		if (typeof handle != 'function')
			throw new Error('route handle is not a function');
		this.add(path, handle, method);
		return this;
	}

	any(path, cb) {
		this.all(path, cb);
	}

	all(path, cb) {
		this.add(path, cb, 'all');
		return this;
	}

	get(path, cb) {
		this.add(path, cb, 'get');
		return this;
	}

	post(path, cb) {
		this.add(path, cb, 'post');
		return this;
	}

	put(path, cb) {
		this.add(path, cb, 'put');
		return this;
	}

	patch(path, cb) {
		this.add(path, cb, 'patch');
		return this;
	}

	delete(path, cb) {
		this.add(path, cb, 'delete');
		return this;
	}

	head(path, cb) {
		this.add(path, cb, 'head');
		return this;
	}

	options(path, cb) {
		this.add(path, cb, 'options');
		return this;
	}
}
