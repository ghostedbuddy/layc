import { resolve as resolvePath } from 'path';
import Router from './Routing/Router';
import LayRouting from './Routing/LayRouting';
import HtmlEngine from './Views/HtmlEngine';

export default class LayServer {
	controllers = new Map();
	loaders = new Map();
	proc = null;
	router;
	publicFiles;
	options = new Map([
		['loaders', undefined],
		['publicDir', undefined],
		['viewsPath', undefined],
		['preferIndexFiles', false],
		['discoverPublicFiles', false],
		['enforceTrailingSlash', false],
		['laycLoading', false],
	]);

	constructor(options = {}) {
		if (typeof options == 'object') {
			const optionKeys = Object.getOwnPropertyNames(options);

			for (const key of optionKeys) {
				if (!this.options.has(key)) continue;
				if (key == 'loaders') continue;
				const valueType = typeof this.options.get(key);
				if (
					typeof options[key] !== 'undefined' &&
					(typeof options[key] == valueType ||
						valueType == 'undefined')
				)
					this.options.set(key, options[key]);
			}

			if (options.hasOwnProperty('loaders')) {
				if (options.loaders instanceof Map) {
					this.loaders = options.loaders;
				}
			}
		}

		this.initRouting(options.router);

		if (options.hasOwnProperty('controllers')) {
			this.registerControllers(options.controllers);
		}

		if (options.publicFiles) {
			console.log('publicFiles', options.publicFiles);
			this.addPublicFileRoutes(options.publicFiles);
		}

		if (
			!options.publicFiles &&
			this.options.discoverPublicFiles &&
			this.options.publicDir
		)
			this.indexPublicFiles(this.options.publicDir);

		if (!this.options.viewsEngine && this.options.viewsPath) {
			this.options.viewsEngine = new HtmlEngine();
		}
	}

	option(key, value = undefined) {
		if (!this.options.has(key)) return undefined;
		if (value !== undefined) this.option.set(key, value);
		return this.options.get(key);
	}

	addPublicFileRoutes(filePaths) {
		if (!filePaths) return;
		if (!Array.isArray(filePaths))
			throw new Error(
				'publicFiles option has to be an array or undefined'
			);
		if (!this.publicFiles || !Array.isArray(this.publicFiles))
			this.publicFiles = [];
		for (let path of filePaths) {
			if (typeof path != 'string') continue;
			this.publicFiles.push(path);
		}
	}

	indexPublicFiles(publicDir) {}

	initRouting(router = null) {
		if (router) this.router = new router(this);
		if (typeof this.router == 'undefined') this.router = new Router(this);
		this.routeControl = new LayRouting(this.router);
	}

	registerControllers(controllers) {
		if (!Array.isArray(controllers)) controllers = [controllers];

		for (let controller of controllers) {
			if (typeof controller != 'function') {
				console.log(`ignored ${controller} for not being a function`);
				continue;
			}

			// if the given controller is just an anonymous function defining the routes itself
			if (!controller?.prototype?.constructor?.name) {
				controller(this.routeControl);
				continue;
			}

			this.controllers.set(
				controller?.name,
				this.instantiateController(controller)
			);
		}
	}

	instantiateController(controller) {
		this.routeControl.setNamespace(controller.namespace);
		const _temp = new controller(this.routeControl);
		if (controller.namespace) this.routeControl.setNamespace(null);
		return _temp;
	}

	isRunning() {
		proc != null;
	}

	async handleRequest(req) {
		const url = new URL(req.url);

		if (
			!url.pathname.endsWith('/') &&
			Array.isArray(this.publicFiles) &&
			this.publicFiles.length > 0
		) {
			let path = this.publicFiles.find(
				(v) => url.pathname.substring(1) === v
			);
			if (path) {
				try {
					return new Response(
						Bun.file(
							resolvePath(
								this.options.get('publicDir') ??
									`${import.meta.dir}/public`,
								path
							)
						)
					);
				} catch (err) {
					console.log(err, import.meta.dir, 'public', path);
					return new Response('Internal Server Error', {
						status: 500,
					});
				}
			}
		}

		if (this.options.enforceTrailingSlash && !url.pathname.endsWith('/')) {
			return Response.redirect(`${url.toString()}/`, 302);
		}

		let resp = await this.router.handle(req);

		if (!resp) return new Response('Not Found', { status: 404 });

		return resp;
	}

	listen(port = 8080) {
		try {
			this.proc = Bun.serve({
				port,
				development: Bun.env.BUN_ENV != 'production',
				fetch: this.handleRequest.bind(this),
				error(err) {
					console.log(err.stack);
					return new Response(`<pre>${err}\n${err.stack}</pre>`, {
						headers: {
							'Content-Type': 'text/html',
						},
					});
				},
			});

			if (!this.proc) {
				throw new Error('something went wrong');
			}

			console.log(
				this.proc,
				`listening on ${this.proc.hostname} with port ${this.proc.port}`
			);
		} catch (err) {
			console.log('where', err.stack);
			console.error(err);
		}
	}

	load(filepath) {
		const filename = filepath.split('/').pop().toString();
		const ext = filename.split('.').pop().toLowerCase();

		for (const keys of this.loaders.keys()) {
			if (keys.includes(ext)) {
				return this.loaders.get(keys)(filepath);
			}
		}
	}
}
