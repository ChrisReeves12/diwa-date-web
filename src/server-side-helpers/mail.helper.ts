import FormData from "form-data";
import Mailgun from "mailgun.js";
import { log, logError } from "@/server-side-helpers/logging.helpers";

/**
 * Create a visually appealing email template that wraps the content
 * @param content - The main content to embed in the template
 * @returns HTML template string
 */
function createEmailTemplate(content: string): string {
    const logoUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/images/full_logo_dark.svg`;
    const primaryBlue = '#0092e4';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Diwa Date</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Nunito Sans', Arial, sans-serif;
                background-color: #f8f9fa;
                line-height: 1.6;
            }
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                background-color: ${primaryBlue};
                padding: 15px;
                text-align: center;
            }
            .logo {
                max-width: 200px;
                height: auto;
                display: block;
                margin: 0 auto;
            }
            .content {
                padding: 30px;
                color: #333333;
                font-size: 16px;
            }
            .content h1, .content h2, .content h3 {
                color: ${primaryBlue};
                margin-top: 0;
            }
            .content h1 {
                font-size: 28px;
                margin-bottom: 20px;
            }
            .content h2 {
                font-size: 24px;
                margin-bottom: 16px;
            }
            .content h3 {
                font-size: 20px;
                margin-bottom: 12px;
            }
            .content p {
                margin-bottom: 16px;
            }
            .content a {
                color: ${primaryBlue};
                text-decoration: none;
            }
            .content a:hover {
                text-decoration: underline;
            }
            .button {
                display: inline-block;
                background-color: ${primaryBlue};
                color: #ffffff !important;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #0077cc;
                text-decoration: none !important;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 30px 20px;
                text-align: center;
                border-top: 1px solid #e0e0e0;
            }
            .footer p {
                margin: 0;
                color: #666666;
                font-size: 14px;
            }
            .footer a {
                color: ${primaryBlue};
                text-decoration: none;
            }
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                }
                .content {
                    padding: 30px 20px;
                }
                .header {
                    padding: 20px 15px;
                }
                .logo {
                    max-width: 150px;
                }
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <img width="250" src="${logoUrl}" alt="Diwa Date Logo" class="logo" />
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>
                    This email was sent by <a href="${process.env.NEXT_PUBLIC_BASE_URL}">Diwa Date</a><br>
                    If you have any questions, please don't hesitate to contact our support team.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}

/**
 * Send email to recipients via Mailgun.
 * @param to
 * @param subject
 * @param content
 * @param from
 */
async function sendEmailMailgun(to: string[], subject: string, content: string, from?: string) {
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
        username: "api",
        key: process.env.MAILGUN_API_KEY as string
    });

    try {
        // Wrap the content in our visually appealing template
        const htmlContent = createEmailTemplate(content);

        const data = await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
            from: from || process.env.MAILGUN_SENDER_EMAIL,
            to: to,
            subject: subject,
            html: htmlContent,
        });

        return { hasError: false, data };
    } catch (error: any) {
        log('An error occurred while sending email via Mailgun.', 'error');
        logError(error);
        return { hasError: true, error }
    }
}

async function sendEmailSparkPost(to: string[], subject: string, content: string, from?: string) {

    try {
        // Wrap the content in our visually appealing template
        const htmlContent = createEmailTemplate(content);

        const response = await fetch('https://api.sparkpost.com/api/v1/transmissions', {
            method: 'POST',
            headers: {
                'Authorization': process.env.SPARKPOST_API_KEY as string,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: {
                    from: from || process.env.SPARKPOST_SENDER_EMAIL,
                    subject: subject,
                    html: htmlContent,
                },
                recipients: to.map(address => ({ address })),
            }),
        });

        const data = await response.json();

        if (!response.ok && (data?.results?.total_accepted_recipients ?? 0) === 0) {
            throw new Error(`SparkPost API error: ${response.status} - ${JSON.stringify(data)}`);
        }

        return { hasError: false, data };
    } catch (error: any) {
        log('An error occurred while sending email via SparkPost.', 'error');
        logError(error);
        return { hasError: true, error }
    }
}

export async function sendEmail(to: string[], subject: string, content: string, from?: string) {
    if (process.env.MAILER === 'mailgun') {
        return sendEmailMailgun(to, subject, content, from);
    } else {
        return sendEmailSparkPost(to, subject, content, from);
    }
}
