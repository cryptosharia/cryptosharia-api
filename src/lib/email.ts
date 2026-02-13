import { GAS_URL } from '$env/static/private';

export type SendEmailParams = {
	to: string;
	subject: string;
	html: string;
};

/**
 * Service to send emails using Google Apps Script (GAS) as a temporary provider.
 * Generic proxy approach without shared secret.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
	try {
		const response = await fetch(GAS_URL, {
			method: 'POST',
			body: JSON.stringify({
				to,
				subject,
				html
			}),
			headers: {
				'Content-Type': 'application/json'
			}
		});

		const result = await response.json();

		if (!response.ok || !result.success) {
			throw new Error(`GAS email service failed: ${result.message || response.statusText}`);
		}

		console.info(`EMAIL_SERVICE: Email sent successfully to ${to}`);
	} catch (error) {
		console.error('EMAIL_SERVICE_ERROR:', error);
	}
}
