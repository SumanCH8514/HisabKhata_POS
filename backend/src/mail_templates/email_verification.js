import rawHtml from './email_verification.html';

export function buildEmailVerificationEmail({ userName = 'Valued Partner', userEmail = '', verifyUrl = 'https://pos.hisabkhata.sumanonline.com/verify-email', code = '123456' } = {}) {
  const year = new Date().getFullYear().toString();
  const safeName = userName || 'Valued Partner';
  const safeEmail = userEmail || '';
  const safeCode = code || '';

  const html = rawHtml
    .replace(/\{\{userName\}\}/g, safeName)
    .replace(/Suman/g, safeName)
    .replace(/\{\{userEmail\}\}/g, safeEmail)
    .replace(/\{\{verifyUrl\}\}/g, verifyUrl)
    .replace(/\{\{code\}\}/g, safeCode)
    .replace(/123456/g, safeCode)
    .replace(/\{\{year\}\}/g, year);

  const text = `HisabKhata POS - Email Verification\n\nWelcome to HisabKhata POS, ${safeName}!\nPlease verify your email address to activate your store account.\n\nVerification Link:\n${verifyUrl}\n\nOr enter this 6-digit verification code:\n${safeCode}\n\nThis verification code and link expire in 24 hours.\nIf you did not register, please ignore this email.`;

  return {
    subject: `Verify your email address - HisabKhata POS (${safeCode})`,
    html,
    text
  };
}
