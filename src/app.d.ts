// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	type ApiResponse<T> = {
		success: boolean;
		message: string;
		errors?: Record<string, string[] | undefined>;
		data?: T;
	};
}

export {};
