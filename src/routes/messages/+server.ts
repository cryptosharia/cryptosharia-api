import { GS_SEND_MESSAGE_URL } from '$env/static/private';
import type { ApiResponse } from '$lib/types';
import { InsertMessage } from '$lib/db/types';
import z from '$lib/zod-openapi';

export async function POST({ request, fetch }) {
	// 1. Safe Parse Body
	let body;

	try {
		body = await request.json();
	} catch {
		return Response.json({ success: false, message: 'Invalid JSON body' } satisfies ApiResponse, {
			status: 400
		});
	}

	// 2. Validate Data
	const result = InsertMessage.safeParse(body);

	if (!result.success) {
		return Response.json(
			{
				success: false,
				message: 'Invalid input',
				errors: z.flattenError(result.error).fieldErrors
			} satisfies ApiResponse,
			{ status: 400 }
		);
	}

	const { name, email, message } = result.data;

	// 3. Forward Request to Google Script
	const res = await fetch(GS_SEND_MESSAGE_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, email, message })
	});

	if (!res.ok) {
		return Response.json(
			{ success: false, message: 'Failed to send message' } satisfies ApiResponse,
			{ status: res.status } // Forward the upstream status
		);
	}

	const data = await res.json();

	return Response.json({
		success: data.success,
		message: data.message
	} satisfies ApiResponse);
}
