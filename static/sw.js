const CACHE_NAME = 'memfinance-v2';
const APP_SHELL = [
	'/',
	'/manifest.json'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.pathname.startsWith('/api/')) return;
	if (url.pathname.startsWith('/auth/')) return;
	if (url.host !== self.location.host) return;

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(async () => {
				const cached = await caches.match('/');
				return cached ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
			})
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached) {
				fetch(request).then((response) => {
					if (response.ok) {
						caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
					}
				}).catch(() => {});
				return cached;
			}

			return fetch(request).then((response) => {
				if (response.ok && response.type === 'basic') {
					const copy = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
				}
				return response;
			}).catch(async () => {
				const fallback = await caches.match(request);
				return fallback ?? new Response('', { status: 504 });
			});
		})
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
