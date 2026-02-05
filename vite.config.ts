import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],

	server: {
		// Allow other containers in the same network to send HTTP requests to this CryptoSharia API
		allowedHosts: ['cryptosharia-api']
	},

	test: {
		expect: { requireAssertions: true },

		projects: [
			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					fileParallelism: false, // Ensures tests run one at a time to avoid DB deadlocks
					include: ['src/**/*.{test,spec}.{js,ts}'],
					setupFiles: ['./src/vitest.setup.ts'],
					env: {
						DATABASE_URL: 'postgres://root:mysecretpassword@localhost:5432/local_test'
					}
				}
			}
		]
	}
});
