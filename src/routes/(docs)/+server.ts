import { ScalarApiReference } from '@scalar/sveltekit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const render = ScalarApiReference({
		url: `${url.origin}/openapi.json`,
		theme: 'elysiajs',
		pageTitle: 'CryptoSharia API',
		favicon: '/favicon.svg'
	});

	return render();
};
