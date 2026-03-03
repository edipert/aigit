import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, email, type, message } = req.body;

        const { data, error } = await resend.emails.send({
            from: 'Aigit System <onboarding@resend.dev>',
            to: ['info@connexsus.io'],
            subject: `[Aigit Feedback] ${type} from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\nType: ${type}\n\nMessage:\n${message}`,
        });

        if (error) {
            return res.status(400).json(error);
        }

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error sending email' });
    }
}
