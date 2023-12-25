import { LayServer } from '../lib';
import { google } from 'googleapis';

class InfoController {
	static namespace = 'info';
	constructor(server) {
		server.get('/', this.index);
		server.get('/:country', this.countryInfo);
		server.get('/multiple/:a/:a/:a', this.multiple);
	}

	index(req, res) {
		res.text('I think you are right here');
	}

	countryInfo(req, res) {
		res.json({
			name: req.params.get('country'),
			description: `the country is ${req.params.get('country')}`,
			params: [...req.params.entries()],
		});
	}

	multiple(req, res) {
		res.json({
			params: [...req.params],
		});
	}
}

class oAuthController {
	static namespace = 'oauth';
	constructor(server) {
		server.get('/:provider', this.auth.bind(this));
		server.get('/callback/:provider', this.callback.bind(this));
	}

	async auth(req, res) {
		if (req.params.get('provider') != 'google') {
			return {
				messages: 'invalid provider',
				data: [...req.params.entries()],
			};
		}

		const scopes = 'https://www.googleapis.com/auth/youtube';
		const url = oauth2Client.generateAuthUrl({
			// 'online' (default) or 'offline' (gets refresh_token)
			access_type: 'offline',

			// If you only need one scope you can pass it as a string
			scope: scopes,
		});

		console.log(url);

		return Response.redirect(url, 301);
	}

	callback(req, res) {
		if (!req.query.get('code')) {
			return new Response('/', { status: 302 });
		}

		return new Response(`/${req.query.get('code')}`);
	}
}

const server = new LayServer({
	controllers: [
		function Main(server) {
			server.get('/', async (req, res) => {
				return {
					message: 'Hi mom, i am on the internet!',
					batman: req.query.get('batman'),
					body: req.query,
				};
			});
			server.all('/data', (req, res) => {
				let respBody = `your ${req.method} request was well recieved`;
				switch (req.method) {
					case 'POST':
					case 'PUT':
						return {
							message: respBody,
							data: {
								body: req.body,
							},
						};
					case 'PATCH':
						respBody = `we can try but i think there is no way to ${req.method} this out.`;
						break;
					case 'DELETE':
						respBody = 'What do you want to delete?';
						break;
					case 'OPTIONS':
						respBody = `I guess, we are out of ${req.method}. 💩`;
						break;
					case 'HEAD':
						respBody = `this response has not really a body but a big ${req.method}`;
						break;
				}
				return new Response(respBody, {
					status: 200,
				});
			});
			server.get('/contact', (req, res) => {
				return new Response('This is how you remind me!', {
					status: 200,
				});
			});
		},
		oAuthController,
		InfoController,
	],
});

server.listen(Bun.env.APP_PORT ?? Bun.env.PORT ?? 42169);
