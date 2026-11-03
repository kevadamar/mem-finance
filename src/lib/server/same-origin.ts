export function isSameOrigin(request: Request, url: URL): boolean {
	const origin = request.headers.get('origin');
	return origin === url.origin;
}
