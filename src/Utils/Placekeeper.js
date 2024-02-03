export default class Placekeeper {
	static KEYWORDS = ['if', 'for', 'while', 'else', 'elseif', 'end'];
	static init(content) {
		const sections = Array();
		const variables = new Map();
		const currentSection = new Map();

		for (let idx = 0; idx < content.length; idx++) {
			const char = content[idx];
			if (char == '{') {
				if (content[idx + 1] == '{') {
					if (currentSection.has('start')) currentSection.clear(); // everything before this was not a section then
					// begins a new section meant to be for a variable but still can be an operational section
					// @example: {{#if variableName}} {{#for variableName}} {{#while variableName}}
					currentSection.set('start', idx);
				}
			} else if (currentSection.has('start')) {
				if (char == '}') {
					if (content[idx + 1] == '}') {
						// ends a section
						currentSection.set('end', idx + 2);
						currentSection.set(
							'content',
							content
								.substring(
									currentSection.get('start'),
									currentSection.get('end')
								)
								.toString()
								.trim()
						);

						currentSection.set(
							'variables',
							Placekeeper.parseVariables(
								currentSection.get('content')
							)
						);
						sections.push(new Map(currentSection));
						currentSection.clear();
						idx++;
					}
				}
			}
		}
		console.log(sections);
		return {
			variables,
			sections,
		};
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
			if (!section instanceof Map) {
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
