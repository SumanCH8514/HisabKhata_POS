import rawHtml from './welcome.html';

export function buildWelcomeEmail({ userName = 'Suman', loginUrl = 'https://pos.hisabkhata.sumanonline.com', supportEmail = 'support@sumanonline.com' } = {}) {
  const year = new Date().getFullYear().toString();
  const safeName = userName || 'Valued Partner';

  const html = rawHtml
    .replace(/Welcome to HisabKhata POS, Suman/g, `Welcome to HisabKhata POS, ${safeName}`)
    .replace(/\{\{userName\}\}/g, safeName)
    .replace(/https:\/\/pos\.hisabkhata\.sumanonline\.com/g, loginUrl)
    .replace(/\{\{loginUrl\}\}/g, loginUrl)
    .replace(/support@sumanonline\.com/g, supportEmail)
    .replace(/\{\{supportEmail\}\}/g, supportEmail)
    .replace(/2026/g, year)
    .replace(/\{\{year\}\}/g, year);

  const text = `Welcome to HisabKhata POS, ${safeName}!\n\nOpen your POS Dashboard: ${loginUrl}\nNeed assistance? Contact ${supportEmail}.`;

  return {
    subject: `Welcome to HisabKhata POS, ${safeName}!`,
    html,
    text
  };
}
