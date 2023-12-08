export async function parseFormData(req, multipart = false) {
	const data = await req.formData();

	// console.log(tempFile, new Response(tempFile).headers.get('Content-Type'));
	// console.log(upload.type, upload.type == tempFile.type);

	for (const key of data.keys()) {
		const value = data.get(key);
		if (value.constructor.name == 'Blob' && multipart) {
			// const ext = value.name.toString().split('.').pop().toLowerCase();
			const tempFilePath = `/tmp/${Date.now().toString(36)}`;
			await Bun.write(tempFilePath, value);
			let tempFile = Bun.file(tempFilePath, { type: value.type });
			console.log(
				tempFile,
				new Response(tempFile).headers.get('Content-Type')
			);
			console.log(value.type, value.type == tempFile.type);
			// data.set(key, await Bun.write())
		}
	}

	return data;
}

export default async function RequestParser(req) {
	try {
		const contentType = req.headers.get('Content-Type')?.toLowerCase();

		let val = await req.text();
		console.log(val);
		return {};

		if (!contentType) return await req.text();

		if (contentType.startsWith('multipart/form-data'))
			return await parseFormData(req, true);
		if (contentType == 'application/x-www-form-urlencoded')
			return await parseFormData(req);
		if (contentType == 'application/json') return await req.json();

		return await req.text();
	} catch (err) {
		console.log(err, typeof req, req.constructor.name);
	}
}
