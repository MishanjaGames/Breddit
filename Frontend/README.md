# Breddit — Backend

REST API + WebSocket сервер для проєкту Breddit (Reddit-подібна платформа: спільноти, пости, коментарі, голосування, підписки, сповіщення).

Стек: Node.js / Express 5, MongoDB (Mongoose), JWT-автентифікація (Passport), Socket.IO, Multer (завантаження файлів).

Цей README описує запуск **backend + MongoDB**. Якщо ваш frontend лежить в окремому репозиторії/гілці — розділ [Frontend](#3-запуск-frontend) внизу потрібно доповнити реальними командами вашого проєкту (`npm install` / `npm run dev` тощо) та вказати правильний `VITE_API_URL` / `REACT_APP_API_URL`.

---

## 1. Вимоги

- Node.js 18+ і npm
- MongoDB 6/7 (локально, у Docker, або MongoDB Atlas)
- (опційно) Docker + Docker Compose, якщо не хочете ставити Mongo локально

---

## 2. Запуск Backend

### 2.1. Клонування і встановлення залежностей

```bash
git clone <URL_РЕПОЗИТОРІЮ>
cd <назва_папки>/Breddit-release_Backend   # або відповідна назва беку у вашому репо
npm install
```

### 2.2. Налаштування змінних оточення

Реальний `.env` **не** зберігається в репозиторії (він у `.gitignore`). Скопіюйте приклад і заповніть своїми значеннями:

```bash
cp .env.example .env
```

Мінімально необхідні змінні у `.env`:

| Змінна | Опис | Приклад |
|---|---|---|
| `MONGO_URL` | Рядок підключення до MongoDB | `mongodb://localhost:27017/Breddit` |
| `JWT_SECRET` | Довгий випадковий рядок для підпису JWT | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Дозволені origin'и фронтенда (через кому) | `http://localhost:3000` |
| `PORT` | Порт, на якому підніметься API (локально) | `4000` |
| `FRONTEND_URL` | Куди редіректити після OAuth-логіна | `http://localhost:3000` |

Google/Facebook OAuth змінні (`GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID` тощо) — опційні. Якщо залишити їх порожніми, відповідні `/api/auth/google` і `/api/auth/facebook` роути просто повертатимуть 503, решта застосунку (email/password реєстрація і логін) працює без них.

> **Важливо:** сервер тепер **не запускається**, якщо `MONGO_URL` або `JWT_SECRET` не задані — це навмисно, щоб ніхто випадково не задеплоїв застосунок з дефолтним/чужим секретом (`config/keys.js`).

### 2.3. Запуск MongoDB

**Варіант А — Docker Compose (рекомендовано, піднімає і Mongo, і API одразу):**

```bash
docker compose up --build
```

Це підніме:
- `mongo` — MongoDB 7 на порту `27017`, з даними у volume `mongodata` (переживають перезапуск контейнера)
- `api` — сам backend на порту `4000`

Для Docker Compose змінні беруться з вашого `.env` у корені (docker-compose підхоплює `${JWT_SECRET}` тощо автоматично).

**Варіант Б — Mongo локально без Docker:**

Встановіть MongoDB Community Server і запустіть службу (`mongod`), переконайтесь що `MONGO_URL=mongodb://localhost:27017/Breddit` у `.env`.

**Варіант В — MongoDB Atlas (хмара):**

Створіть безкоштовний кластер на [mongodb.com/atlas](https://www.mongodb.com/atlas), додайте свою IP-адресу в Network Access, отримайте connection string і вставте його в `MONGO_URL` (замінивши `<password>` на реальний пароль користувача бази).

### 2.4. Запуск сервера

```bash
npm run dev     # nodemon, з автоперезапуском
# або
npm start       # звичайний запуск
```

При успішному старті в консолі буде:

```
MongoDB connected
Server started on 4000 (HTTP + WebSocket)
```

Перевірка, що API живий:

```bash
curl http://localhost:4000/
# -> Breddit backend is running
```

---

## 3. Запуск Frontend

> Заповнити реальними командами вашого фронтенд-репозиторію/гілки після мержу. Орієнтовний приклад:

```bash
cd <папка_фронтенда>
npm install
# у .env фронтенда вкажіть адресу backend API, наприклад:
# VITE_API_URL=http://localhost:4000/api
npm run dev
```

Фронтенд має ходити на `http://localhost:4000/api/...` (або на ваш `PORT`), а сам фронтенд — працювати на origin, який прописаний у backend-змінній `CORS_ORIGIN` (за замовчуванням `http://localhost:3000`), інакше запити впадуть з CORS-помилкою.

Завантажені файли (аватарки, банери, медіа постів/коментарів) роздаються backend'ом статично за адресою `http://localhost:4000/uploads/...`.

---

## 4. Огляд API

Базовий префікс: `/api`. Захищені роути потребують заголовок `Authorization: Bearer <token>` (токен видається `/api/auth/login` або `/api/auth/register`).

| Модуль | Приклади ендпоінтів |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/google`, `GET /auth/facebook` |
| Users | `GET /users/:nickname`, `PUT /users/me`, `PUT /users/me/avatar`, `POST /users/:nickname/follow`, `GET /users/:nickname/followers` |
| Categories (спільноти) | `GET /categories`, `POST /categories`, `POST /categories/:id/subscribe`, модерація (`ban`/`mute`/`moderators`) |
| Posts | `GET /posts`, `POST /posts`, `GET /posts/:id`, `POST /posts/:id/save`, `POST /posts/:id/approve` |
| Comments | `GET /comments/post/:postId`, `POST /comments`, `PUT /comments/:id` |
| Votes | `POST /votes` (`{ targetType: 'Post'|'Comment', targetId, value: 1|-1 }`) |
| Search | `GET /search?q=...` — повертає пости, спільноти **і користувачів**, що відповідають запиту |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read` |

Реалтайм-події (Socket.IO, з тим самим JWT у `auth: { token }` при підключенні): нові сповіщення, оновлення голосів, кімнати `category:<id>` і `post:<id>` для лайв-оновлень фіда/коментарів.

---

## 5. Сценарій демонстрації на захисті

Мінімальний прохідний сценарій (усе працює одразу після чистого клонування + `npm install` + піднятого Mongo):

1. **Реєстрація** — `POST /api/auth/register`
2. **Вхід** — `POST /api/auth/login`
3. **Створення спільноти** — `POST /api/categories`
4. **Створення поста** в цій спільноті — `POST /api/posts`
5. **Коментар** до поста — `POST /api/comments`
6. **Голосування** за пост/коментар — `POST /api/votes`
7. **Пошук користувача** за нікнеймом — `GET /api/search?q=<нікнейм>` (повертає масив `users`)
8. **Перегляд профілю** знайденого користувача — `GET /api/users/:nickname`

Додатково варто показати: вихід (`POST /api/auth/logout`), підписку на спільноту (`POST /api/categories/:id/subscribe`), збережені пости (`POST /api/posts/:id/save`), сповіщення (`GET /api/notifications`) і завантаження аватара (`PUT /api/users/me/avatar`).

Усі дані зберігаються в MongoDB (колекції `users`, `categories`, `posts`, `comments`, `votes`, `follows`, `subscriptions`, `saveditems`, `notifications`) — після перезапуску сервера дані нікуди не зникають, доки не перезапущено сам MongoDB-контейнер без volume.

---

## 6. Безпека / .env

- `.env` з реальними значеннями **ніколи не комітиться** — він у `.gitignore`. У репозиторії лежить лише `.env.example` із заглушками.
