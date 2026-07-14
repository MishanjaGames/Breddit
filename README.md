# Breddit — Frontend

SPA-клієнт для проєкту Breddit (Reddit-подібна платформа: спільноти, пости, коментарі, голосування, підписки, сповіщення).

Стек: React 19, React Router 7, Vite 6, Axios, Socket.IO client.

Цей README описує запуск **frontend**, який ходить до окремого backend (Express + MongoDB). Перед запуском переконайтесь, що backend піднятий — див. його README (розділ "Запуск Backend").

---

## 1. Вимоги

- Node.js 18+ і npm
- Запущений backend API (локально на `http://localhost:4000` або на іншому origin)

---

## 2. Встановлення

```bash
git clone <URL_РЕПОЗИТОРІЮ>
cd <назва_папки>/Breddit-release_Frontend   # або відповідна назва фронта у вашому репо
npm install
```

---

## 3. Налаштування змінних оточення

Реальний `.env` **не** зберігається в репозиторії (він у `.gitignore`). Скопіюйте приклад і заповніть своїм значенням:

```bash
cp .env.example .env
```

| Змінна | Опис | Приклад |
|---|---|---|
| `VITE_API_URL` | Адреса backend API (**без** `/api` і без завершального `/`) | `http://localhost:4000` |

> **Важливо:** вказуйте саме origin сервера (`http://localhost:4000`), а не `http://localhost:4000/api` — суфікс `/api` фронтенд додає сам (`src/config/env.js`). Той самий origin використовується і для роздачі статичних медіа (`/uploads/...`).

Origin, з якого запускається фронтенд (за замовчуванням `http://localhost:3000`), має збігатися зі значенням `CORS_ORIGIN` на backend, інакше запити впадуть з CORS-помилкою.

---

## 4. Запуск

```bash
npm run dev
```

Vite підніме dev-сервер на `http://localhost:3000` (порт заданий у `vite.config.js`).

Перевірка, що фронтенд ходить до правильного API: відкрийте DevTools → Network і переконайтесь, що запити йдуть на `<VITE_API_URL>/api/...` і повертають 200/401 (а не CORS/`ERR_CONNECTION_REFUSED`).

### Продакшн-збірка

```bash
npm run build      # збірка у папку build/
npm run preview    # локальний перегляд production-збірки
```

---

## 5. Структура проєкту

| Папка | Призначення |
|---|---|
| `src/pages` | Сторінки-маршрути: Home, Explore, Search, Community, Post, Profile, Drafts, Notifications, ManageCommunities, TagCommunities, Login/Register, OAuthCallback |
| `src/components` | Перевикористовувані UI-блоки: PostCard, CommentThread, VoteButtons, MediaCarousel/Gallery/Lightbox/Picker, MarkdownEditor, ContentBlockEditor, Navbar, Sidebar, ModerationPanel, AuthModal та інші |
| `src/context` | React Context-провайдери: Auth, AuthModal, Confirm, CreateCommunityModal, Socket, Theme, Toast |
| `src/api` | Обгортка над Axios (`client.js`) — базовий URL, JWT з `localStorage` у заголовку `Authorization`; `resolve.js` — допоміжні функції побудови посилань (медіа тощо) |
| `src/config/env.js` | Читає `VITE_API_URL`, формує `API_ORIGIN` і `API_URL` (`+/api`) |
| `src/utils` | Допоміжні утиліти |

---

## 6. Взаємодія з Backend

- REST-запити — через `src/api/client.js` (Axios instance з базовим URL `API_URL` і автопідстановкою JWT з `localStorage`).
- Реалтайм — Socket.IO client (`src/context/SocketContext.jsx`) підключається до того ж origin, що й API, передаючи JWT-токен при handshake; використовується для live-оновлень сповіщень, голосів і фіда.
- Формати ендпоінтів (auth, users, categories, posts, comments, votes, search, notifications) описані в README backend.

---

## 7. Сценарій демонстрації на захисті

Мінімальний прохідний сценарій (backend піднятий, `.env` налаштований, `npm run dev`):

1. **Реєстрація / вхід** — сторінки `Register` / `Login` (або Google OAuth через `OAuthCallback`)
2. **Створення спільноти** — `ManageCommunities`
3. **Створення поста** в цій спільноті — `SubmitPost`
4. **Коментар** до поста — сторінка `Post`, `CommentThread`
5. **Голосування** за пост/коментар — `VoteButtons`
6. **Пошук** користувача/спільноти/поста — сторінка `Search`
7. **Перегляд профілю** — `Profile`
8. **Чернетки** — `Drafts` (незавершені пости зберігаються локально до публікації)
9. **Сповіщення** — `Notifications` (оновлюються в реальному часі через Socket.IO)

---

## 8. Безпека / .env

- `.env` з реальними значеннями **ніколи не комітиться** — він у `.gitignore`. У репозиторії лежить лише `.env.example` із заглушкою.
- JWT зберігається в `localStorage` і додається до кожного запиту через axios-interceptor (`src/api/client.js`); токен ніколи не хардкодиться в коді.
- Усі звернення до захищених ресурсів backend перевіряють токен на сервері — фронтенд лише приховує/показує UI залежно від стану `AuthContext`, не покладаючись на це як на єдиний захист.