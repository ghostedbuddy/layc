import LayRequest from '../IO/LayRequest';
import LayResponse from '../IO/LayResponse';
import RequestParser from '../Utils/RequestParser';

export default class Router {
	server = undefined;
	routes = new Map();
	static allMethodKey = '$all';
	static methods = ['all', 'get', 'post', 'put', 'patch', 'head', 'options'];
	headerList = new Map();

	constructor(server) {
		this.server = server;
	}

	getServer() {
		return this.server;
	}

	async handle(req) {
		if (!(req instanceof Request)) {
			throw new Error('`req` is not a proper Request');
		}

		let method = (req.method || '').toString().toLowerCase();
		const methodKey = `$${method.toLowerCase()}`;
		let path;
		let url = req.url;

		if (!(url instanceof URL) && typeof url == 'string') {
			url = new URL(url);
			path = url.pathname;
		}
		if (path.startsWith('/')) path = path.substring(1);
		if (path.endsWith('/')) path = path.substring(0, path.length - 1);

		let currentNode = this.routes;
		let paramsList = [];

		if (path != '') {
			let segments = path.split('/');
			for (let index = 0; index < segments.length; index++) {
				const segment = segments[index];

				if (currentNode.has(segment)) {
					currentNode = currentNode.get(segment);
					continue;
				}

				if (currentNode.has(':') || currentNode.has('?')) {
					paramsList.push(segment);
					currentNode = currentNode.get(':') ?? currentNode.get('?');
					continue;
				}

				currentNode = null;
				break;
			}
		}

		if (
			!(currentNode instanceof Map) ||
			(['get', 'head'].indexOf(method) < 0 &&
				!currentNode.has(methodKey) &&
				!currentNode.has(Router.allMethodKey))
		) {
			return new Response(`[${method}] Method Not Allowed`, {
				status: 405,
			});
		}

		if (
			!currentNode.has(methodKey) &&
			!currentNode.get(Router.allMethodKey)
		) {
			return new Response(`Not Implemented: [${method}, ${req.url}]`, {
				status: 501,
			});
		}

		const reqContext = {
			request: null,
			response: null,
		};
		try {
			reqContext.request = new LayRequest(req);
			reqContext.response = new LayResponse(this);
		} catch (err) {
			console.log(err);
		}
		let handle =
			currentNode.get(methodKey) || currentNode.get(Router.allMethodKey);

		if (typeof handle == 'object' && typeof handle.callback == 'function') {
			if (Array.isArray(handle.params)) {
				for (const name of handle.params) {
					let value = paramsList[reqContext.request.params.size];
					if (reqContext.request.params.has(name)) {
						let yet = reqContext.request.params.get(name);
						if (!Array.isArray(yet)) {
							yet = [yet];
						}
						yet.push(value);
						value = yet;
					}
					reqContext.request.params.set(name, value);
				}
			}
		}

		try {
			const retVal = await handle.callback(
				reqContext.request,
				reqContext.response
			);
			if (typeof retVal != 'undefined') {
				if (retVal instanceof Response) {
					return retVal;
				} else if (typeof retVal == 'string') {
					reqContext.response.send(retVal);
				} else {
					reqContext.response.json(retVal);
				}
			}
		} catch (err) {
			console.log(err);
			return new Response('Error', { status: 500 });
		}

		if (reqContext.response.redirect()) {
			return Response.redirect(
				reqContext.response.redirect,
				reqContext.response.status || 302
			);
		}

		return new Response(reqContext.response.body, {
			status: reqContext.response.status() || 200,
			headers: reqContext.response.headers() || {},
		});
	}

	add(route, callback, method = 'get', middleware = null) {
		if (typeof callback != 'function')
			throw new Error('`callback` is not a function');
		if (typeof route != 'string')
			throw new Error('`route` is not a string');
		if (Router.methods.indexOf(method) < 0)
			throw new Error(
				`invalid \`method\` (${method}) given`,
				Router.methods
			);
		if (!Array.isArray(middleware)) {
			middleware = typeof middleware == 'function' ? [middleware] : null;
		}

		const methodKey = `$${method.toLowerCase()}`;
		if (route.startsWith('/')) route = route.substring(1);
		if (route.endsWith('/')) route = route.substring(0, route.length - 1);

		let params = [];
		let segments = route.split('/');
		let currentNode = this.routes;

		if (route == '') {
			if (currentNode.get(methodKey)) {
				if (!this.server.option('allowOverwrite')) {
					console.log(
						`overwriting of routes is prohibited: [${method}] \`${route}\``
					);
					return;
				}

				console.log(`overwriting route for \`${route}\``);
			}
			currentNode.set(methodKey, { callback, middleware, params: [] });
			return;
		}

		// add method to the segments to store the callback with
		//   and to allow different methods for the same route
		for (let index = 0; index < segments.length; index++) {
			let segment = segments[index];
			let varName = null;

			if (segment.startsWith(':')) {
				let newSegment = ':';
				varName = segment.substring(1);
				if (segment.endsWith('?')) {
					// optional param
					newSegment = '?';
					varName = varName.substring(0, -1);
				}
				segment = newSegment;
				params.push(varName);
			}

			if (!currentNode.has(segment)) currentNode.set(segment, new Map());

			currentNode = currentNode.get(segment);
		}

		if (currentNode.has(methodKey)) {
			if (!this.server.option('allowOverwrite')) {
				console.log(
					`overwriting of routes is prohibited: [${method}] \`${route}\``
				);
				return;
			}

			console.log(`overwriting route for \`${route}\``);
		}

		currentNode.set(methodKey, { callback, middleware, params });
	}

	remove(route, method, cb = null) {
		const methodKey = `$${method.toLowerCase()}`;
		if (route.startsWith('/')) route = route.substring(1);
		if (route.endsWith('/')) route = route.substring(0, route.length - 1);

		let currentNode = this.routes;

		if (route != '') {
			let segments = route.toString().split('/');

			for (let index = 0; index < segments.length; index++) {
				const segment = segments[index];

				if (currentNode.has(segment)) {
					currentNode = currentNode.get(segment);
					continue;
				}

				if (currentNode.has(':') || currentNode.has('?')) {
					currentNode = currentNode.get(':') ?? currentNode.get('?');
					continue;
				}

				currentNode = null;
				break;
			}
		}

		if (
			!(currentNode instanceof Map) ||
			!currentNode.has(methodKey) ||
			(typeof cb == 'function' && currentNode.get(methodKey) != cb)
		) {
			return false;
		}

		return currentNode.delete(methodKey);
	}
}
