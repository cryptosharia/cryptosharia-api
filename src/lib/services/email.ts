import { RESEND_API_KEY, RESEND_FROM, RESEND_REPLY_TO } from '$env/static/private';
import { Resend } from 'resend';

export type SendEmailParams = {
	to: string;
	subject: string;
	html: string;
	replyTo?: string;
};

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams): Promise<void> {
	const resend = new Resend(RESEND_API_KEY);

	try {
		const { error } = await resend.emails.send({
			from: RESEND_FROM,
			to,
			subject,
			html,
			replyTo: replyTo ?? RESEND_REPLY_TO
		});

		if (error) {
			throw new Error(`Resend email service failed: ${error.message}`);
		}

		console.info(`EMAIL_SERVICE: Email sent successfully to ${to} via Resend`);
	} catch (error) {
		console.error('EMAIL_SERVICE_ERROR: Failed to send email via Resend', error);
		throw error;
	}
}
