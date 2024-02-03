import Placekeeper from '../Utils/Placekeeper';

export default class HtmlEngine {
	#internalCache = new Map();
	constructor() {}

	/**
	 * Handles the specified file by loading its content, parsing sections and variables,
	 * and caching the result.
	 *
	 * @param {string} filepath - The path of the file to handle.
	 * @returns {Object} - An object with a `parse` method that can be used to parse the file.
	 * @throws {Error} - If the file is not found.
	 */
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

	/**
	 * Parses the specified identifier using the provided data and options.
	 * @param {string} identifier - The identifier of the file to parse.
	 * @param {Object} [data={}] - The data object to replace placeholders in the file content.
	 * @param {Object} [options={}] - The options object.
	 * @returns {Response} - The parsed response object.
	 * @throws {Error} - If the file is not found.
	 */
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
