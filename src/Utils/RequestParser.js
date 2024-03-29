import Logger from './Logger';
export async function parseFormData(req, multipart = false) {
	const data = await req.formData();

	for (const key of data.keys()) {
		const value = data.get(key);
		if (value.constructor.name == 'Blob' && multipart) {
			let tempFile = Bun.file(`/tmp/${Date.now().toString(36)}`, { type: value.type });
			data.set(key, await Bun.write(tempFile, value));
		}
	}

	return data;
}

export default async function RequestParser(req) {
	try {
		const contentType = req.headers.get('Content-Type')?.toLowerCase();

		if (!contentType) return await req.text();

		if (contentType.indexOf('multipart') >= 0)
			return await parseFormData(req, true);
		if (contentType == 'application/x-www-form-urlencoded')
			return await parseFormData(req);
		if (contentType == 'application/json') return await req.json();

		return await req.text();
	} catch (err) {
		Logger(err, typeof req, req.constructor.name);
	}
}
