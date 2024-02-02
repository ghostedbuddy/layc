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
						for (const [key, value] of sectionVars) {
							variables.set(key, value);
						}
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

	static parseVariables(content) {
		// iterates over the content character by character to extract variables and returns a list of them
		const variables = new Map();
		let currentVar;

		for (let idx = 0; idx < content.length; idx++) {
			const char = content[idx];
			if (char.matches(/[\w\d]/)) {
				if (!currentVar instanceof Map)
					currentVar = new Map([
						['name', ''],
						['start', idx],
						['end', -1],
					]);
				currentVar.set('name', currentVar.get('name') + char);
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
