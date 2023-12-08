import RequestParser from '../Utils/RequestParser';

export default class LayRequest extends Request {
	body = null;
	constructor(req) {
		super(req);

		this.params = new Map();
		this.query = new Map();

		this.parseBody(req);
	}

	header(key) {
		this.headers?.get(key);
	}

	async parseBody(req) {
		this.body = await RequestParser(req);
	}
}
