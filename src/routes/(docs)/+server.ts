import { ScalarApiReference } from '@scalar/sveltekit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const render = ScalarApiReference({
		url: `${url.origin}/openapi.json`,
		theme: 'elysiajs'
	});

	return render();
};
