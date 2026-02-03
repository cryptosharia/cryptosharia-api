import { ScalarApiReference } from '@scalar/sveltekit';
import { resolve } from '$app/paths';
import type { RequestHandler } from './$types';

const render = ScalarApiReference({
	url: resolve('/openapi.json')
});

export const GET: RequestHandler = async () => {
	return render();
};
