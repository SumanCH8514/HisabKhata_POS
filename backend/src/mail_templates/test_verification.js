import rawHtml from './test_verification.html';

export function buildTestVerificationEmail({ host = 'smtp.gmail.com:465 (TLS)', sender = '' } = {}) {
  const timestamp = new Date().toUTCString();
  const year = new Date().getFullYear().toString();

  const html = rawHtml
    .replace(/smtp\.gmail\.com:465 \(TLS\)/g, host)
    .replace(/\{\{host\}\}/g, host)
    .replace(/pos\.hisabkhata@sumanonline\.com/g, sender)
    .replace(/pos@sumanonline\.com/g, sender)
    .replace(/\{\{sender\}\}/g, sender)
    .replace(/18 Sep 2026, 21:05 UTC/g, timestamp)
    .replace(/\{\{timestamp\}\}/g, timestamp)
    .replace(/2026/g, year)
    .replace(/\{\{year\}\}/g, year);

  const text = `HisabKhata POS - SMTP Verification Successful\n\nYour custom SMTP gateway has been verified.\nHost: ${host}\nSender: ${sender}\nTimestamp: ${timestamp}`;

  return {
    subject: 'Verification Successful: HisabKhata POS SMTP Gateway Connected',
    html,
    text
  };
}
