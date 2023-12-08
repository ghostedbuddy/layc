import { resolve as resolvePath } from 'path';
import Router from './Routing/Router';
import LayRouting from './Routing/LayRouting';
import HtmlEngine from './Views/HtmlEngine';

export default class LayServer {
	controllers = new Map();
	proc = null;
	router;
	publicFiles;
	options = new Map([
		['publicDir', undefined],
		['viewsPath', undefined],
		['viewsEngine', undefined],
		['onlySingleRoutes', true],
		['preferIndexFiles', false],
		['discoverPublicFiles', true],
		['enforceTrailingSlash', true],
	]);

	constructor(options = {}) {
		if (typeof options == 'object') {
			const optionKeys = Object.getOwnPropertyNames(options);

			for (const key of optionKeys) {
				if (!this.options.has(key)) continue;
				const valueType = typeof this.options.get(key);
				if (typeof options[key] == valueType)
					this.options.set(key, options[key]);
			}
		}

		this.initRouting(options.router);

		if (options.hasOwnProperty('controllers')) {
			this.registerControllers(options.controllers);
		}

		if (options.publicFiles) {
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
		for (let path of filePaths) {
		}
	}

	indexPublicFiles(publicDir) {}

	initRouting(router = null) {
		if (router) this.router = new router(this);
		if (typeof this.router == 'undefined') this.router = new Router(this);
		this.routeControl = new LayRouting(this.router);
	}

	registerControllers(controllers) {
		if (!Array.isArray(controllers))
			throw new Error('controllers is not an Array');

		for (let controller of controllers) {
			if (typeof controller != 'function') {
				console.log(`ignored ${controller} for not being a function`);
				continue;
			}

			this.controllers.set(
				controller.name,
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
						Bun.file(resolvePath(import.meta.dir, 'public', path))
					);
				} catch (err) {
					console.log(err);
					return new Response('Internal Server Error', {
						status: 500,
					});
				}
			}
		}

		if (this.options.enforceTrailingSlash && !url.pathname.endsWith('/')) {
			return Response.redirect(`${url.toString()}/`, 302);
		}

		return await this.router.handle(req);
	}

	listen(port = 3000) {
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
}
