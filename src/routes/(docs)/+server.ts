import { ScalarApiReference } from '@scalar/sveltekit';
import { resolve } from '$app/paths';

const render = ScalarApiReference({
	url: resolve('/openapi.json')
});

export function GET() {
	return render();
}
