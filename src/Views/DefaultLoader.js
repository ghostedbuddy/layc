export default class DefaultLoader {
	constructor(filepath) {
		this.content = filepath;
	}

	async load() {
		return this.content;
	}

	parse(data = null) {
		return this.content;
	}
}
