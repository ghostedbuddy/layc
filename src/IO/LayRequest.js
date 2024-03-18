import RequestParser from '../Utils/RequestParser';

export default class LayRequest extends Request {
	body = undefined;
	nativeRequest = null;
	constructor(req) {
		super(req);

		this.params = new Map();
		this.query = new Map();
		this.nativeReq = req;
	}

	header(key) {
		this.headers?.get(key);
	}

	async parseBody() {
		if(typeof this.body != 'undefined') return this.body;
		this.body = await RequestParser(this.nativeReq);
	}
}
