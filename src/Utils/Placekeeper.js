import Logger from './Logger';

const TOKEN_PAIRS = [
	['{{','}}']
]

export default class Placekeeper {
	static init(content) {
		const sections = Array();
		const variables = new Map();
		const currentSection = new Map();

		console.log('content to array', Placekeeper.contentToArray(content));

		return {
			variables,
			sections,
		};
	}

	static walkToEnd(content, endToken = undefined) {
		let result = {
			stack: [],
			length: 0
		};
		for(let idx = 0; idx < content.length; idx++) {
			const char = content[idx];
			const token = TOKEN_PAIRS.find((t) => {
				if(!t[0].startsWith(char)) return false;
				return content.substring(idx, idx + t[0].length) == t[0];
			});

			if(token) {
				// found new start token walk to end:
				idx += token[0].length
				const subset = Placekeeper.walkToEnd(content.substring(idx), token[1]);

				// is  a subset convertable to a function?
				// can't we convert the whole tree to one function so its only one call instead of iteration on runtime?

				result.stack.push(subset.stack);
				result.length += subset.length;
				idx += subset.length + token[1].length - 1;
			} else {
				if(endToken && endToken.startsWith(char) && content.substring(idx, idx + endToken.length)) {
					// found end token
					return result;
				}

				if(result.stack.length == 0 || Array.isArray(result.stack[result.stack.length - 1])) result.stack.push('');
				result.stack[result.stack.length - 1] += char;
				result.length += char.length;
			}
		}
		return result;
	}

	static contentToArray(content) {
		return Placekeeper.walkToEnd(content);
	}

	static variableRegex = new RegExp(/[\w\d]/, 'i');

	static parseVariables(content) {
		// iterates over the content character by character to extract variables and returns a list of them
		const variables = new Map();
		let currentVar;

		for (let idx = 0; idx < content.length; idx++) {
			const char = content[idx];
			if (Placekeeper.variableRegex.test(char)) {
				if (!(currentVar instanceof Map))
					currentVar = new Map([
						['name', ''],
						['start', idx],
						['end', -1],
					]);
				currentVar.set('name', currentVar.get('name') + char);
			} else if (currentVar instanceof Map) {
				currentVar.set('end', idx);
				if (currentVar.get('name').length > 0) {
					variables.set(currentVar.get('name'), currentVar);
				}
				currentVar = null;
			}
		}

		return variables;
	}

	static parse(content, sections) {
		// replace all sections with an empty string
		if (!Array.isArray(sections)) {
			if (!sections instanceof Map) return content;
			sections = [...sections.values()];
		}

		let parts = [];
		let offset = 0;
		for (const section of sections) {
			if (!(section instanceof Map)) {
				if (!Array.isArray(section)) continue;
				if (section.length < 3) continue;
			}
			parts.push(content.substring(offset, section.get('start')));
			offset = section.get('end');
		}
		parts.push(content.substring(offset));

		return parts.join('');
	}
}
