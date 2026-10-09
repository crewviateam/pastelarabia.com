export const sendEmailWithAttachment = async (
  toEmail: string,
  subject: string,
  text: string,
  attachmentBuffer: Buffer,
  filename: string
) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.warn('Brevo API key not configured. Skipping email.');
    return;
  }

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'Glow Wholesale',
      email: process.env.BREVO_SENDER_EMAIL || 'no-reply@glow-wholesale.com'
    },
    to: [{ email: toEmail }],
    subject: subject,
    htmlContent: `<p>${text}</p>`,
    attachment: [
      {
        content: attachmentBuffer.toString('base64'),
        name: filename
      }
    ]
  };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Brevo email failed:', errorText);
    } else {
      console.log('Email sent successfully via Brevo to', toEmail);
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
