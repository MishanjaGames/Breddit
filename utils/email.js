const emailjs = require('@emailjs/nodejs');
const keys = require('../config/keys');

// ---------------------------------------------------------------------------
// Відправка пошти через @emailjs/nodejs.
//
// EmailJS сам по собі погано підставляє {{link}}/{{email}} всередині вкладених
// HTML-атрибутів (href і т.п.) — тому замість того, щоб покладатись на його
// внутрішню підстановку змінних, ми РЕНДЕРИМО ПОВНИЙ HTML листа тут, на бекенді,
// і передаємо його одним-єдиним параметром {{html}}.
//
// У самому EmailJS-шаблоні (template_id) достатньо одного поля Content,
// куди вставляється сира змінна {{{html}}} (потрібне саме "Insert as HTML" /
// перемикання типу поля на HTML при вставці змінної — інакше розмітка
// потрапить на екран як текст, як на твоєму скріншоті).
//
// Це дозволяє мати ОДИН generic template в EmailJS, а всі "види" листів
// (verify email / reset password / password changed) — це просто різні
// HTML-рядки, зібрані нижче з одного базового лейауту.
// ---------------------------------------------------------------------------

let initialized = false;
const ensureInit = () => {
    if (initialized) return;
    emailjs.init({
        publicKey: keys.emailjs.publicKey,
        privateKey: keys.emailjs.privateKey || undefined
    });
    initialized = true;
};

const escapeHtml = (str = '') => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const COMPANY_NAME = keys.companyName || 'badlycoded.dev';
const APP_NAME = keys.appName || 'Breddit';
const WEBSITE_LINK = process.env.FRONTEND_URL || '#';
const LOGO_URL = keys.emailLogoUrl || `${WEBSITE_LINK}/favicon.ico`;

/**
 * Базовий лейаут листа (шапка з лого + біла картка з контентом + сірий футер).
 */
const renderLayout = ({ heading, bodyHtml, to }) => `
<div style="font-family: system-ui, sans-serif, Arial; font-size: 14px; color: #333; padding: 20px 14px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: auto; background-color: #fff">
    <div style="text-align: center; background-color: #333; padding: 14px">
      <a style="text-decoration: none; outline: none" href="${WEBSITE_LINK}" target="_blank">
        <img style="height: 32px; vertical-align: middle" height="32px" src="${LOGO_URL}" alt="logo" />
      </a>
    </div>
    <div style="padding: 14px">
      <h1 style="font-size: 22px; margin-bottom: 26px">${heading}</h1>
      ${bodyHtml}
      <p>Best regards,<br />${APP_NAME} Team</p>
    </div>
  </div>
  <div style="max-width: 600px; margin: auto">
    <p style="color: #999">
      The email was sent to ${escapeHtml(to)}<br />
      You received this email because you are registered with ${APP_NAME}
    </p>
  </div>
</div>`.trim();

const renderActionEmail = ({ to, heading, paragraphs, link, linkExpiry }) => {
    const bodyHtml = [
        ...paragraphs.map((p) => `<p>${p}</p>`),
        link ? `<p><a href="${link}">${escapeHtml(link)}</a></p>` : '',
        linkExpiry ? `<p>${linkExpiry}</p>` : ''
    ].filter(Boolean).join('\n      ');

    return renderLayout({ heading, bodyHtml, to });
};

/**
 * Надсилає лист через EmailJS. `html` — вже повністю зібрана розмітка листа.
 */
const sendMail = async ({ to, subject, html }) => {
    if (!keys.emailjs.serviceId || !keys.emailjs.templateId || !keys.emailjs.publicKey) {
        console.warn(`[email:DEV] EmailJS не налаштовано. To: ${to} | Subject: ${subject}`);
        return;
    }

    ensureInit();

    const templateParams = {
        email: to,
        to_email: to,
        subject,
        html
    };

    try {
        await emailjs.send(keys.emailjs.serviceId, keys.emailjs.templateId, templateParams);
    } catch (e) {
        console.error('[email] EmailJS send failed:', e?.text || e?.message || e);
        throw e;
    }
};

// ---------- Конкретні листи (усі йдуть через один EmailJS template_id вище) ----------

exports.sendVerificationEmail = (to, verifyUrl) => sendMail({
    to,
    subject: 'Підтвердіть вашу пошту',
    html: renderActionEmail({
        to,
        heading: 'Підтвердіть вашу email-адресу',
        paragraphs: [
            'Дякуємо за реєстрацію! Підтвердіть свою email-адресу, натиснувши посилання нижче:'
        ],
        link: verifyUrl,
        linkExpiry: 'Посилання дійсне 24 години.'
    })
});

exports.sendPasswordResetEmail = (to, resetUrl) => sendMail({
    to,
    subject: 'Скидання пароля',
    html: renderActionEmail({
        to,
        heading: 'You have requested a password change',
        paragraphs: [
            'We received a request to reset the password for your account. To proceed, please click the link below to create a new password:'
        ],
        link: resetUrl,
        linkExpiry: 'This link will expire in one hour.'
    }).replace(
        '<p>Best regards,',
        '<p>If you didn\'t request this password reset, please ignore this email or let us know immediately. Your account remains secure.</p>\n      <p>Best regards,'
    )
});

exports.sendPasswordChangedEmail = (to) => sendMail({
    to,
    subject: 'Пароль змінено',
    html: renderActionEmail({
        to,
        heading: 'Ваш пароль було змінено',
        paragraphs: [
            'Пароль вашого акаунта щойно було змінено. Якщо це були не ви — негайно скористайтесь формою скидання пароля та зверніться до підтримки.'
        ]
    })
});

exports.sendMail = sendMail;