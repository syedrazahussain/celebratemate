// sendEmail.js
const sgMail = require('@sendgrid/mail');

if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY is not set in environment variables');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * sendSimpleEmail
 * @param {Object} params
 * @param {string} params.to - recipient email
 * @param {string} params.subject
 * @param {string} params.html
 * @param {string} [params.from] - optional from (must be verified sender)
 */
async function sendSimpleEmail({ to, subject, html, from }) {
  const msg = {
    to,
    from: from || process.env.SENDGRID_SENDER_EMAIL,
    subject,
    html,
  };

  try {
    const response = await sgMail.send(msg);
    // response is an array for @sendgrid/mail; return status code for checking
    return { ok: true, status: response[0].statusCode, response };
  } catch (err) {
    // Normalize the error so caller can log details
    const message = err && err.response && err.response.body ? err.response.body : err.message || err;
    return { ok: false, error: message };
  }
}

module.exports = { sendSimpleEmail };
