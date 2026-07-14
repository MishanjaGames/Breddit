const https = require('https');
const keys = require('../config/keys');

// ---------------------------------------------------------------------------
// Отправка почты через EmailJS REST API (https://api.emailjs.com/api/v1.0/email/send).
// Идея: в EmailJS создаётся ОДИН generic-шаблон с плейсхолдерами
// {{subject}}, {{title}}, {{message}}, {{action_url}}, {{action_label}}, {{to_email}}.
// Разные "письма" (verify email / reset password / password changed) — это просто
// разные наборы параметров (шаблоны ниже), отправляемые в этот единственный EmailJS-шаблон.
// Если EmailJS не сконфигурирован (нет ключей в .env) — используется nodemailer (SMTP)
// как резервный вариант, либо, если и он не настроен, письмо просто логируется в консоль.
// ---------------------------------------------------------------------------

const EMAILJS_ENDPOINT = 'api.emailjs.com';

const sendViaEmailJs = (templateParams) => new Promise((resolve, reject) => {
    const payload = JSON.stringify({
        service_id: keys.emailjs.serviceId,
        template_id: keys.emailjs.templateId,
        user_id: keys.emailjs.publicKey,
        accessToken: keys.emailjs.privateKey || undefined,
        template_params: templateParams
    });

    const req = https.request({
        hostname: EMAILJS_ENDPOINT,
        path: '/api/v1.0/email/send',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) return resolve(body);
            reject(new Error(`EmailJS error ${res.statusCode}: ${body}`));
        });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
});

let nodemailerTransport = null;
const getNodemailerTransport = () => {
    if (nodemailerTransport) return nodemailerTransport;
    if (!keys.smtp.host) return null;
    const nodemailer = require('nodemailer');
    nodemailerTransport = nodemailer.createTransport({
        host: keys.smtp.host,
        port: keys.smtp.port,
        secure: keys.smtp.port === 465,
        auth: keys.smtp.user ? { user: keys.smtp.user, pass: keys.smtp.pass } : undefined
    });
    return nodemailerTransport;
};

const sendViaSmtp = async ({ to, subject, html, text }) => {
    const transport = getNodemailerTransport();
    if (!transport) return false;
    await transport.sendMail({ from: keys.smtp.from, to, subject, html, text });
    return true;
};

/**
 * Отправляет письмо. Пробует EmailJS -> SMTP (nodemailer) -> лог в консоль (dev-фолбэк).
 * @param {{to: string, subject: string, title: string, message: string, actionUrl?: string, actionLabel?: string}} opts
 */
const sendMail = async ({ to, subject, title, message, actionUrl = '', actionLabel = '' }) => {
    const templateParams = {
        to_email: to,
        subject,
        title,
        message,
        action_url: actionUrl,
        action_label: actionLabel
    };

    if (keys.emailjs.serviceId && keys.emailjs.templateId && keys.emailjs.publicKey) {
        try {
            await sendViaEmailJs(templateParams);
            return;
        } catch (e) {
            console.error('[email] EmailJS send failed, falling back to SMTP:', e.message);
        }
    }

    const html = `<h2>${title}</h2><p>${message}</p>${actionUrl ? `<p><a href="${actionUrl}">${actionLabel || actionUrl}</a></p>` : ''}`;
    const sentViaSmtp = await sendViaSmtp({ to, subject, html, text: `${title}\n\n${message}\n\n${actionUrl}` });
    if (sentViaSmtp) return;

    // Ничего не сконфигурировано (локальная разработка без ключей) — просто логируем,
    // чтобы флоу (получение токена по ссылке из письма) можно было проверить в консоли.
    console.warn(`[email:DEV] To: ${to} | Subject: ${subject} | ${message} ${actionUrl}`);
};

// ---------- Шаблоны конкретных писем (все идут через один EmailJS template_id выше) ----------

exports.sendVerificationEmail = (to, verifyUrl) => sendMail({
    to,
    subject: 'Підтвердіть вашу пошту',
    title: 'Підтвердження email',
    message: 'Дякуємо за реєстрацію! Підтвердіть свою email-адресу, натиснувши кнопку нижче. Посилання дійсне 24 години.',
    actionUrl: verifyUrl,
    actionLabel: 'Підтвердити email'
});

exports.sendPasswordResetEmail = (to, resetUrl) => sendMail({
    to,
    subject: 'Скидання пароля',
    title: 'Скидання пароля',
    message: 'Ви (або хтось інший) запросили скидання пароля для цього акаунта. Якщо це були не ви — просто проігноруйте цей лист. Посилання дійсне 1 годину.',
    actionUrl: resetUrl,
    actionLabel: 'Скинути пароль'
});

exports.sendPasswordChangedEmail = (to) => sendMail({
    to,
    subject: 'Пароль змінено',
    title: 'Пароль успішно змінено',
    message: 'Пароль вашого акаунта щойно було змінено. Якщо це були не ви — негайно скористайтесь формою скидання пароля та зверніться до підтримки.'
});

exports.sendMail = sendMail;