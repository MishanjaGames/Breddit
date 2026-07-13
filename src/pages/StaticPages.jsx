function StaticPage({ title, children }) {
  return (
    <div className="static-page">
      <h1>{title}</h1>
      <div className="static-page-body">{children}</div>
    </div>
  );
}

export function AboutPage() {
  return (
    <StaticPage title="Про Breddit">
      <p>Breddit — платформа для спільнот, де можна створювати теми, ділитися постами та обговорювати їх у коментарях.</p>
      <p>Приєднуйтесь до спільнот за інтересами, публікуйте власний контент і слідкуйте за оновленнями улюблених тем.</p>
    </StaticPage>
  );
}

export function RulesPage() {
  return (
    <StaticPage title="Правила Breddit">
      <ol className="rules-list">
        <li>Поважайте інших користувачів.</li>
        <li>Заборонено спам та шахрайський контент.</li>
        <li>Дотримуйтесь правил конкретної спільноти.</li>
        <li>Заборонено публікацію незаконного контенту.</li>
        <li>Не видавайте себе за іншу особу.</li>
      </ol>
    </StaticPage>
  );
}

export function PrivacyPage() {
  return (
    <StaticPage title="Політика конфіденційності">
      <p>Ми збираємо мінімально необхідні дані для роботи сервісу: email, ім'я користувача та контент, який ви публікуєте.</p>
      <p>Ваші дані не передаються третім особам, окрім випадків, передбачених законодавством.</p>
    </StaticPage>
  );
}

export function TermsPage() {
  return (
    <StaticPage title="Угода користувача">
      <p>Реєструючись на Breddit, ви погоджуєтесь дотримуватись правил спільноти та законодавства.</p>
      <p>Адміністрація залишає за собою право видаляти контент та блокувати акаунти, що порушують правила.</p>
    </StaticPage>
  );
}

export function AccessibilityPage() {
  return (
    <StaticPage title="Доступність">
      <p>Ми прагнемо зробити Breddit зручним для всіх користувачів, включно з людьми з обмеженими можливостями.</p>
      <p>Якщо ви зіткнулися з проблемами доступності, повідомте нам, і ми постараємось їх виправити.</p>
    </StaticPage>
  );
}
