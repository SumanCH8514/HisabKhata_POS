import { connect } from 'cloudflare:sockets';

export class SmtpClient {
  constructor({ host = 'smtp.gmail.com', port = 465, user, pass, fromName = 'HisabKhata POS', fromEmail, replyTo, encryption = 'ssl_tls', serviceType = 'inbuilt' }) {
    this.host = host || 'smtp.gmail.com';
    this.port = Number(port) || 465;
    this.user = (user || '').trim();
    this.pass = (pass || '').trim().replace(/\s+/g, '');
    this.fromName = fromName || 'HisabKhata POS';
    this.fromEmail = (fromEmail || this.user).trim();
    this.replyTo = (replyTo || this.fromEmail || this.user).trim();
    this.encryption = encryption || 'ssl_tls';
    this.serviceType = serviceType || 'inbuilt';
  }

  isConfigured() {
    return Boolean(this.user && this.pass);
  }

  async sendMail({ to, subject, text, html, from, fromName, replyTo }) {
    if (!this.user || !this.pass) {
      throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS or configure your custom SMTP service.');
    }

    const senderEmail = (from || this.fromEmail || this.user).trim();
    const senderName = (fromName || this.fromName || 'HisabKhata POS').replace(/"/g, '').trim();
    const replyToEmail = (replyTo || this.replyTo || senderEmail).trim();

    const recipientList = Array.isArray(to) ? to : [to];
    const cleanRecipients = recipientList.map(e => (e || '').trim()).filter(Boolean);

    if (cleanRecipients.length === 0) {
      throw new Error('Recipient email address is required');
    }

    const isSecureDirect = this.port === 465 || this.encryption === 'ssl_tls';
    const socket = connect(
      { hostname: this.host, port: this.port },
      { secureTransport: isSecureDirect ? 'on' : 'off' }
    );

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    let buffer = '';

    const readLine = async () => {
      while (true) {
        const lineEnd = buffer.indexOf('\r\n');
        if (lineEnd !== -1) {
          const line = buffer.slice(0, lineEnd);
          buffer = buffer.slice(lineEnd + 2);
          return line;
        }
        const { value, done } = await reader.read();
        if (done) {
          if (buffer.length > 0) {
            const line = buffer;
            buffer = '';
            return line;
          }
          throw new Error('SMTP connection closed unexpectedly by server');
        }
        buffer += decoder.decode(value, { stream: true });
      }
    };

    const readResponse = async () => {
      let code = 0;
      let message = '';
      while (true) {
        const line = await readLine();
        if (line.length >= 3) {
          code = parseInt(line.slice(0, 3), 10);
          message += (message ? '\n' : '') + line.slice(4);
          if (line.length === 3 || line.charAt(3) === ' ') {
            break;
          }
        }
      }
      return { code, message };
    };

    const sendCmd = async (cmd, expectedCodes) => {
      if (cmd !== null) {
        await writer.write(encoder.encode(cmd + '\r\n'));
      }
      const res = await readResponse();
      const expected = Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes];
      if (!expected.includes(res.code)) {
        throw new Error(`SMTP Error (${res.code}): ${res.message}`);
      }
      return res;
    };

    try {
      await sendCmd(null, 220);

      await sendCmd(`EHLO localhost`, 250);

      await sendCmd('AUTH LOGIN', 334);

      const b64User = btoa(this.user);
      await sendCmd(b64User, 334);

      const b64Pass = btoa(this.pass);
      await sendCmd(b64Pass, 235);

      const envelopeFrom = (this.host && this.host.includes('gmail.com')) ? this.user : (senderEmail || this.user);
      await sendCmd(`MAIL FROM:<${envelopeFrom}>`, 250);

      for (const rcpt of cleanRecipients) {
        await sendCmd(`RCPT TO:<${rcpt}>`, [250, 251]);
      }

      await sendCmd('DATA', 354);

      const msgId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${this.host}>`;
      const dateStr = new Date().toUTCString();
      const isHtml = Boolean(html);
      const bodyContent = isHtml ? html : (text || '');

      let mime = '';
      mime += `From: "${senderName}" <${senderEmail}>\r\n`;
      mime += `Reply-To: <${replyToEmail}>\r\n`;
      mime += `To: ${cleanRecipients.join(', ')}\r\n`;
      mime += `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\n`;
      mime += `Date: ${dateStr}\r\n`;
      mime += `Message-ID: ${msgId}\r\n`;
      mime += `MIME-Version: 1.0\r\n`;
      mime += `Content-Type: ${isHtml ? 'text/html; charset=UTF-8' : 'text/plain; charset=UTF-8'}\r\n`;
      mime += `Content-Transfer-Encoding: base64\r\n`;
      mime += `\r\n`;

      const utf8Bytes = encoder.encode(bodyContent);
      let binaryStr = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binaryStr += String.fromCharCode(utf8Bytes[i]);
      }
      const base64Body = btoa(binaryStr);
      const chunkedBody = base64Body.match(/.{1,76}/g)?.join('\r\n') || '';

      mime += chunkedBody;
      mime += '\r\n.\r\n';

      await writer.write(encoder.encode(mime));
      await sendCmd(null, 250);

      try {
        await sendCmd('QUIT', 221);
      } catch {}

      return { success: true, messageId: msgId };
    } finally {
      try {
        writer.releaseLock();
      } catch {}
      try {
        reader.releaseLock();
      } catch {}
      try {
        socket.close();
      } catch {}
    }
  }
}

export function createSmtpClient(env) {
  const user = env.SMTP_USER || env.GMAIL_USER || env.GMAIL_EMAIL;
  const pass = env.SMTP_PASS || env.GMAIL_PASS || env.GMAIL_APP_PASSWORD || env.GMAIL_PASSWORD;
  const host = env.SMTP_HOST || 'smtp.gmail.com';
  const port = env.SMTP_PORT || 465;
  const fromName = env.SMTP_FROM_NAME || 'HisabKhata POS';
  const fromEmail = env.SMTP_FROM_EMAIL || env.SMTP_FROM || '';

  return new SmtpClient({
    host,
    port,
    user,
    pass,
    fromName,
    fromEmail,
    serviceType: 'inbuilt'
  });
}

export async function resolveSmtpClient(env, db, companyId) {
  if (db && companyId) {
    try {
      const row = await db.prepare(`SELECT * FROM company_smtp_settings WHERE company_id = ?`).bind(companyId).first();
      if (row && row.service_type === 'custom' && row.host && row.username && row.password) {
        return new SmtpClient({
          host: row.host,
          port: row.port || 465,
          user: row.username,
          pass: row.password,
          fromName: row.from_name || 'HisabKhata POS',
          fromEmail: row.from_email || row.username,
          replyTo: row.reply_to || row.from_email || row.username,
          encryption: row.encryption || 'ssl_tls',
          serviceType: 'custom'
        });
      }
    } catch {}
  }
  return createSmtpClient(env);
}

export { buildStaffInvitationEmail } from './mail_templates/index.js';

