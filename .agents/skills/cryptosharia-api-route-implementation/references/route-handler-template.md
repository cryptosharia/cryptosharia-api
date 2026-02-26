# Route Handler Template

Use this as a baseline when implementing a `+server.ts` handler.

```ts
import type { RequestHandler } from './$types';
import { ApiResponse } from '$lib/api';
import { parseJsonBody } from '$lib/api/request';
import { SomeRequestBody, SomeResponseBody } from '.';

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1) Auth/permission gate

	// 2) Parse and validate
	const parsedBody = await parseJsonBody(request, SomeRequestBody);
	if (!parsedBody.ok) return parsedBody.response;

	try {
		// 3) Domain orchestration

		// 4) Schema-driven response
		return ApiResponse.ok(SomeResponseBody.parse({}), 'Success');
	} catch (error) {
		console.error('POST /example error:', error);
		return ApiResponse.internalServerError('Failed to process request');
	}
};
```

## Completion Checklist

- Contract updated in `index.ts`
- Route registered in OpenAPI registry (if new module)
- Integration tests updated
- `check/lint/test` status captured in final report
