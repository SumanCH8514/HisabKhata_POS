import rawHtml from './password_reset.html';

export function buildPasswordResetEmail({ userName = 'Valued Partner', userEmail = '', resetUrl = 'https://pos.hisabkhata.sumanonline.com/reset-password' } = {}) {
  const year = new Date().getFullYear().toString();
  const safeName = userName || 'Valued Partner';
  const safeEmail = userEmail || '';

  const html = rawHtml
    .replace(/\{\{userName\}\}/g, safeName)
    .replace(/\{\{userEmail\}\}/g, safeEmail)
    .replace(/\{\{resetUrl\}\}/g, resetUrl)
    .replace(/\{\{year\}\}/g, year);

  const text = `HisabKhata POS - Reset Password\n\nHello ${safeName},\nWe received a request to reset your password.\nClick this link within 1 hour to set a new password:\n${resetUrl}\n\nIf you did not request this, please disregard this email.`;

  return {
    subject: `Reset your HisabKhata POS password`,
    html,
    text
  };
}
