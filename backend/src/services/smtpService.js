const tls = require('tls');

const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];

function smtpConfig() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`SMTP configuration missing: ${missing.join(', ')}`);
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM,
  };
}

function encodeBase64(value) {
  return Buffer.from(value).toString('base64');
}

function dotStuff(value) {
  return value.replace(/^\./gm, '..');
}

function buildMessage({ from, to, subject, text, attachment }) {
  const boundary = `=_PeoplePay360_${Date.now()}`;
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    '',
    attachment.content.toString('base64').match(/.{1,76}/g).join('\r\n'),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

function sendSmtp({ to, subject, text, attachment, verifyOnly = false }) {
  const config = smtpConfig();
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: config.host, port: config.port, rejectUnauthorized: true });
    let buffer = '';
    let pending;
    let closed = false;
    const queue = [];

    const fail = (error) => {
      if (closed) return;
      closed = true;
      socket.destroy();
      reject(error);
    };

    const readResponse = () => new Promise((res, rej) => {
      pending = { resolve: res, reject: rej };
      flushResponse();
    });

    const flushResponse = () => {
      if (!pending) return;
      const match = buffer.match(/(?:^|\r\n)(\d{3})([ -])(.*?)(?=\r\n|$)/s);
      if (!match || (match[2] === '-' && !new RegExp(`(?:^|\\r\\n)${match[1]} `).test(buffer))) return;
      const lines = buffer.split('\r\n');
      const code = Number(match[1]);
      const last = lines.findIndex((line, index) => index > 0 && line.startsWith(`${code} `));
      const response = (last >= 0 ? lines.slice(0, last + 1) : lines).join('\n');
      buffer = last >= 0 ? lines.slice(last + 1).join('\r\n') : '';
      const current = pending;
      pending = null;
      current.resolve({ code, response });
    };

    const command = async (value, accepted) => {
      socket.write(`${value}\r\n`);
      const result = await readResponse();
      if (!accepted.includes(result.code)) throw new Error(`SMTP ${result.code}: ${result.response}`);
      return result;
    };

    const run = async () => {
      await readResponse();
      await command('EHLO peoplepay360.local', [250]);
      await command('AUTH LOGIN', [334]);
      await command(encodeBase64(config.user), [334]);
      await command(encodeBase64(config.pass), [235]);
      if (verifyOnly) {
        await command('QUIT', [221, 250]);
        closed = true;
        socket.end();
        resolve({ verified: true });
        return;
      }
      await command(`MAIL FROM:<${config.from}>`, [250]);
      await command(`RCPT TO:<${to}>`, [250, 251]);
      await command('DATA', [354]);
      const message = dotStuff(buildMessage({ from: config.from, to, subject, text, attachment }));
      socket.write(`${message}\r\n.\r\n`);
      await readResponse();
      await command('QUIT', [221, 250]);
      closed = true;
      socket.end();
      resolve({ to });
    };

    socket.setTimeout(Number(process.env.SMTP_TIMEOUT_MS || 30000), () => fail(new Error('SMTP connection timed out')));
    socket.on('data', (chunk) => { buffer += chunk.toString('utf8'); flushResponse(); });
    socket.on('error', fail);
    socket.on('close', () => { if (!closed) fail(new Error('SMTP connection closed unexpectedly')); });
    socket.on('secureConnect', () => { run().catch(fail); });
  });
}

async function verifySmtp() {
  return sendSmtp({
    verifyOnly: true,
  });
}

module.exports = { sendSmtp, verifySmtp };
