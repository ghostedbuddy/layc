import Placekeeper from '../Utils/Placekeeper.js';

/**
 * symbolic markdown engine implementation for illustrational purposes
 * @note at this point its preferable to avoid dependencies for as long as possible
 * @class
 */
export default class MarkdownEngine {
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
		const file = Bun.file(filepath);
		if (!(await file.exists())) throw new Error('file not found');
		if (!file) throw new Error('something went wrong');

		const rawContent = await file.text();
		let { metadata, content } = await this.extractFrontMatter(rawContent);
		content = this.toHtml(content);
		const { sections, variables } = Placekeeper.init(content);

		this.#internalCache.set(
			filepath,
			new Map([
				['content', content],
				['sections', sections],
				['variables', variables],
				['metadata', metadata],
				['mimeType', file.type || 'text/html'],
				['size', file.size],
			])
		);

		console.log(filepath, this.#internalCache.get(filepath));

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
	async parse(identifier, data = {}, options = {}) {
		if (!this.#internalCache.has(identifier)) {
			throw new Error('file not found');
		}
		const view = this.#internalCache.get(identifier);
		let parsed = Placekeeper.parse(
			view.get('content'),
			view.get('sections')
		);
		for (const [key, value] of Object.entries(data)) {
			parsed = parsed.replace(
				new RegExp(`{{${key}}}`, 'g'),
				value.toString()
			);
		}

		return new Response(view.get('content'), {
			...(options || {}),
			headers: {
				...(options.headers || {}),
				'Content-Type': 'text/html', //view.get('mimeType'),
				'Content-Length': view.get(),
			},
		});
	}

	async extractFrontMatter(content) {
		/**
		 * Parses a value and returns the appropriate data type.
		 * @param {string} value - The value to be parsed.
		 * @returns {string|boolean|number|array} - The parsed value.
		 */
		function parseValue(value) {
			console.log(value);
			value = value.trim();
			if (value.startsWith('"') && value.endsWith('"'))
				return value.substring(1, value.length - 1);
			if (value === 'true' || value === 'false') return value === 'true';
			if (!isNaN(value)) return Number(value);
			if (value.startsWith('[') && value.endsWith(']'))
				return value
					.substring(1, value.length - 1)
					.split(',')
					.map((v) => parseValue(v.trim()));
			return value;
		}

		let lines = content.split('\n');
		let isFrontMatter = false;
		const variables = new Map();
		let idx = 0;
		while (lines.length > 0) {
			const line = lines.shift().toString().trim();
			if (
				line === '' || // ignore empty lines
				line.startsWith('#') // ignore comments
			) {
				idx++;
				continue;
			}

			if (line === '---') {
				if (isFrontMatter) break;
				isFrontMatter = true;
				idx++;
				continue;
			}

			if (isFrontMatter && line.indexOf(':') === -1) continue; // ignore invalid lines

			const key = line.substring(0, line.indexOf(':')).trim();
			let value = line.substring(line.indexOf(':') + 1).trim();

			if (value == '') {
				idx++;
				continue;
			}

			value = parseValue(value);
			variables.set(key, value);
			idx++;
		}

		return {
			metadata: variables,
			content: lines.join('\n'),
		};
	}

	/**
	 * retrieves the content of a markdown file and returns it as html
	 */
	toHtml(content) {
		let html = '';
		let lines = content.split('\n');
		while (lines.length > 0) {
			const line = lines.shift().toString().trim();
			if (line === '') continue;
			if (line.startsWith('#')) {
				const level = line.indexOf(' ');
				html += `<h${level}>${line
					.substring(level)
					.trim()}</h${level}>`;
			} else {
				if (line.startsWith('- ') || line.startsWith('1.')) {
					const numerical = line.startsWith('1.');
					html += numerical ? '<ol>' : '<ul>';
					while (
						lines.length > 0 &&
						(lines[0].startsWith('-') ||
							lines[0].startsWith('\t') ||
							lines[0].startsWith('1.') ||
							lines[0].startsWith(' '.repeat(4)))
					) {
						const item = lines.shift().toString().trim();
						html += `<li>${item
							.substring(item.indexOf(' ') + 1)
							.trim()}</li>`;
					}
					html += numerical ? '</ol>' : '</ul>';
				} else if (line.startsWith('```')) {
					const lang = line.substring(3).trim();
					let code = '';
					while (lines.length > 0 && !lines[0].startsWith('```')) {
						code += lines.shift().toString().trim() + '\n';
					}
					let attr = '';
					if (lang) attr = ` class="language-${lang}"`;
					html += `<pre><code${attr}>${code}</code></pre>`;
				} else if (line.startsWith('---')) {
					html += '<div class="hr"><hr></div>';
				} else if (line.startsWith('> ')) {
					let item = line;
					html += '<blockquote>';
					while (lines.length > 0 && lines[0].startsWith('>')) {
						html += lines
							.shift()
							.toString()
							.trim()
							.substring(2)
							.trim();
					}
					html += '</blockquote>';
				} else {
					html += `<p>${line}</p>`;
				}
			}
		}
		return html;
	}
}
