import Placekeeper from '../Utils/Placekeeper';

export default class HtmlEngine {
	#internalCache = new Map();
	constructor() {}

	async handle(filepath) {
		// load file
		const file = Bun.file(filepath);
		if (!(await file.exists())) throw new Error('file not found');

		const rawContent = await file.text();
		const { sections, variables } = Placekeeper.init(rawContent);

		this.#internalCache.set(filepath, {
			content: rawContent,
			sections,
			variables,
			mimeType: file.type || 'text/html',
			size: file.size,
		});

		return {
			parse: (data = null, options = {}) =>
				this.parse(filepath, data, options),
		};
	}

	parse(identifier, data = {}, options = {}) {
		if (!this.#internalCache.has(identifier)) {
			throw new Error('file not found');
		}
		const view = this.#internalCache.get(identifier);
		let parsed = Placekeeper.parse(view.content, view.sections);
		for (const [key, value] of Object.entries(data)) {
			parsed = parsed.replace(
				new RegExp(`{{${key}}}`, 'g'),
				value.toString()
			);
		}
		return new Response(parsed, {
			...(options || {}),
			headers: {
				...(options.headers || {}),
				'Content-Type': view.mimeType,
				'Content-Length': view.size,
			},
		});
	}
}
