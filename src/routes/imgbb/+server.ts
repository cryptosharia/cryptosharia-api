import type { RequestHandler } from './$types';
import { IMGBB_API_KEY } from '$env/static/private';
import { ApiResponse } from '$lib/api';
import { db } from '$lib/db';
import { imgbbImages } from '$lib/db/tables';
import { ImgbbImage } from '$lib/db/types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const image = formData.get('image') as File;

		if (!image) {
			return ApiResponse.badRequest({
				image: ['Image file is required']
			});
		}

		// Prepare the form data for IMGBB
		const imgbbFormData = new FormData();
		imgbbFormData.set('image', image);
		imgbbFormData.set('name', crypto.randomUUID());

		// We use fetch to proxy the request to IMGBB
		const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
			method: 'POST',
			body: imgbbFormData
		});

		if (!res.ok) {
			const errorData = await res.json();
			console.error('IMGBB API error:', errorData);
			return ApiResponse.badGateway('Failed to upload image to external provider');
		}

		type ImgbbData = {
			id: string;
			title: string;
			url: string;
			width: number;
			height: number;
			size: number;
			image: {
				filename: string;
				mime: string;
			};
			delete_url: string;
		};

		const { data }: { data: ImgbbData } = await res.json();

		const [asset] = await db
			.insert(imgbbImages)
			.values({
				imgbbId: data.id,
				title: data.title,
				url: data.url,
				width: data.width,
				height: data.height,
				size: data.size,
				fileName: data.image.filename,
				mimeType: data.image.mime,
				deleteUrl: data.delete_url
			})
			// use onConflictDoUpdate to avoid ImgBB anti-duplication mechanism
			.onConflictDoUpdate({
				target: imgbbImages.imgbbId,
				// Set a field to its own current value to trigger a "successful" operation
				set: { imgbbId: data.id }
			})
			.returning();

		// Return the URLs from the IMGBB response sanitized via parse
		return ApiResponse.ok(ImgbbImage.parse({ ...asset }), 'Image uploaded successfully');
	} catch (error) {
		console.error('IMGBB upload error:', error);
		return ApiResponse.internalServerError('Failed to process image upload');
	}
};
