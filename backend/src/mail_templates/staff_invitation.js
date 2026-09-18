import rawHtml from './staff_invitation.html';

export function buildStaffInvitationEmail({ companyName = 'MC Electronics', inviterName = 'The business owner', role = 'cashier', inviteUrl = 'https://pos.hisabkhata.sumanonline.com/join' } = {}) {
  const roleLabel = role === 'manager' ? 'Store Manager' : 'Cashier / Billing Staff';
  const roleDesc = role === 'manager'
    ? 'Manage store billing, stock inventory, customer ledgers, and sales reports.'
    : 'Fast POS counter billing, receipt generation, and barcode scanning.';
  const safeCompanyName = companyName || 'MC Electronics';
  const safeInviterName = inviterName || 'The business owner';
  const year = new Date().getFullYear().toString();

  const html = rawHtml
    .replace(/You've been invited to join MC Electronics/g, `You've been invited to join ${safeCompanyName}`)
    .replace(/\{\{companyName\}\}/g, safeCompanyName)
    .replace(/Sujan Chakrabortty/g, safeInviterName)
    .replace(/\{\{inviterName\}\}/g, safeInviterName)
    .replace(/Store Manager/g, roleLabel)
    .replace(/\{\{roleLabel\}\}/g, roleLabel)
    .replace(/Manage store billing, stock inventory, customer ledgers, and sales reports\./g, roleDesc)
    .replace(/\{\{roleDesc\}\}/g, roleDesc)
    .replace(/https:\/\/pos\.hisabkhata\.sumanonline\.com\/join\?invite=demo/g, inviteUrl)
    .replace(/\{\{inviteUrl\}\}/g, inviteUrl)
    .replace(/2026/g, year)
    .replace(/\{\{year\}\}/g, year);

  const text = `${safeInviterName} has invited you to join ${safeCompanyName} on HisabKhata POS as ${roleLabel}.\n\nAccept your invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`;

  return {
    subject: `Invitation to join ${safeCompanyName} on HisabKhata POS`,
    html,
    text
  };
}
