# Breddit — Backend (API)

Backend для навчального проєкту "копія Reddit": Express + MongoDB (Mongoose), автентифікація на JWT (+ опційно Google/Facebook OAuth), спільноти (categories), пости, коментарі, голосування, підписки/фоловінг, збережені пости, сповіщення, аватари/банери, сокети (socket.io) для realtime-сповіщень.

> Це репозиторій **бекенда**. Фронтенд підключається до нього через `CORS_ORIGIN` та базовий URL API (див. розділ [Підключення фронтенда](#підключення-фронтенда)).

## Стек

- Node.js + Express 5
- MongoDB + Mongoose
- JWT (jsonwebtoken) для авторизації, passport-jwt / passport-google-oauth20 / passport-facebook — опційно
- multer — завантаження файлів (аватари, банери, медіа в постах/коментарях)
- socket.io — realtime сповіщення
- bcrypt — хешування паролів

## Вимоги

- Node.js 18+ (LTS)
- npm 9+
- MongoDB 6+ — локально (через Docker або встановлений локально) **або** хмарний кластер (MongoDB Atlas)

## 1. Встановлення

```bash
git clone <URL_РЕПОЗИТОРІЮ>
cd <назва_папки_бекенда>
npm install
```

## 2. Налаштування середовища (.env)

Секрети в репозиторії **не зберігаються**. Скопіюйте приклад і заповніть своїми значеннями:

```bash
cp .env.example .env
```

Мінімально необхідні змінні в `.env`:

| Змінна | Опис | Приклад |
|---|---|---|
| `MONGO_URL` | Рядок підключення до MongoDB | `mongodb://localhost:27017/Breddit` |
| `JWT_SECRET` | Секрет для підпису JWT. **Обов'язковий** — без нього сервер не запуститься. Використовуйте довгий випадковий рядок | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Origin(и) фронтенда через кому, без слеша в кінці | `http://localhost:3000` |
| `PORT` | Порт бекенда (локально) | `4000` |

OAuth (`GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_APP_ID/SECRET`) — опційні, залиште порожніми, щоб вимкнути відповідні кнопки логіну.

⚠️ `.env` вже додано в `.gitignore` — не комітьте його. Якщо secrets колись потрапляли в git-історію (навіть у видалених файлах), їх треба **перевипустити** (змінити пароль до Mongo, згенерувати новий JWT_SECRET, ротацію OAuth-секретів у консолі Google/Facebook) — видалення файлу з робочої копії не видаляє його з історії комітів.

## 3. Піднімання MongoDB

### Варіант A — Docker (найпростіше для локальної розробки)

```bash
docker run -d --name breddit-mongo -p 27017:27017 mongo:6
```

`MONGO_URL` у `.env`:
```
MONGO_URL=mongodb://localhost:27017/Breddit
```

### Варіант B — MongoDB Atlas (хмара)

1. Створіть безкоштовний кластер на [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Створіть користувача БД (Database Access) з окремим паролем — **не використовуйте старі креденшели, якщо вони колись світилися в репозиторії**
3. У Network Access дозвольте свою IP (або `0.0.0.0/0` тільки для навчальних цілей)
4. Скопіюйте connection string у `MONGO_URL`

### Варіант C — локальна інсталяція MongoDB Community Edition

Слідуйте [офіційній інструкції](https://www.mongodb.com/docs/manual/administration/install-community/) для вашої ОС, потім:
```
MONGO_URL=mongodb://localhost:27017/Breddit
```

## 4. Запуск бекенда

```bash
# розробка (з автоперезапуском через nodemon)
npm run dev

# продакшн-режим
npm start
```

За замовчуванням сервер піднімається на `http://localhost:4000` (або на порту з `PORT`).

Перевірка, що все працює:
```bash
curl http://localhost:4000/
# → "Breddit backend is running"
```

У консолі також має з'явитися `MongoDB connected`.

## 5. Підключення фронтенда

1. У бекенді (`.env`) вкажіть origin фронтенда в `CORS_ORIGIN`, наприклад:
   ```
   CORS_ORIGIN=http://localhost:3000
   ```
   Можна перерахувати декілька через кому (наприклад, локальний + деплоєний на Vercel/Render).
2. У фронтенді вкажіть базовий URL API на цей бекенд (зазвичай через `.env`/`.env.local` фронтенда, змінна на кшталт `VITE_API_URL` або `REACT_APP_API_URL` — залежить від конфігурації фронта), наприклад:
   ```
   http://localhost:4000/api
   ```
3. Статичні файли (аватари, банери, медіа постів) віддаються з `/uploads/...` — переконайтесь, що фронтенд формує посилання на них відносно `http://localhost:4000`, а не відносно свого власного origin.
4. JWT повертається у форматі `Bearer <token>` у полі `token` при `/api/auth/login` і `/api/auth/register` — фронтенд має зберігати його (напр. в localStorage) і передавати в заголовку `Authorization: Bearer <token>` для захищених ендпоінтів.

## 6. Основні ендпоінти (для сценарію на захисті)

| Дія | Метод + шлях |
|---|---|
| Реєстрація | `POST /api/auth/register` |
| Вхід | `POST /api/auth/login` |
| Поточний користувач | `GET /api/auth/me` (потрібен токен) |
| Вихід | `POST /api/auth/logout` |
| Створення спільноти | `POST /api/categories` |
| Підписка на спільноту | `POST /api/categories/:id/subscribe` |
| Створення поста | `POST /api/posts` |
| Список постів | `GET /api/posts` |
| Коментар | `POST /api/comments` |
| Голосування | `POST /api/votes` |
| Пошук | `GET /api/search?q=...` |
| Профіль користувача | `GET /api/users/:nickname` |
| Підписатись на юзера | `POST /api/users/:nickname/follow` |
| Збережені пости | `GET /api/posts/mine/saved`, `POST /api/posts/:id/save` |
| Сповіщення | `GET /api/notifications` |
| Оновити аватар | `PUT /api/users/me/avatar` (multipart/form-data) |

## 7. Структура проєкту

```
config/        — конфіг (env-змінні, ключі)
controllers/   — бізнес-логіка ендпоінтів
middleware/    — auth (JWT), rate limiting, multer (upload), валідація
models/        — Mongoose-схеми (User, Post, Comment, Vote, Category, Follow, Subscription, Notification, SavedItem)
routes/        — Express-роути
utils/         — сокети, обробка помилок, OAuth, згадки (@mentions)
uploads/       — завантажені файли (не в git, див. .gitignore)
server.js      — точка входу
```

## 8. Типові проблеми

- **`Missing required environment variable: JWT_SECRET`** — не скопіювали `.env.example` → `.env` або забули заповнити `JWT_SECRET`.
- **CORS помилка в браузері** — `CORS_ORIGIN` в `.env` бекенда не збігається з origin, з якого фронтенд робить запити (перевірте порт і протокол http/https).
- **`MongoDB connected` не з'являється** — перевірте, що MongoDB запущена і `MONGO_URL` правильний (для Atlas — що ваша IP додана в Network Access).
- **401 на захищених роутах** — перевірте, що фронтенд шле заголовок `Authorization: Bearer <token>`, і що токен не протух (термін дії — 2 години, є `POST /api/auth/refresh`).

## 9. Безпека / секрети

- Реальні секрети (пароль до Mongo, JWT-секрет, OAuth client secret) зберігаються **тільки** в локальному `.env` або в змінних середовища на хостингу (Render → Environment), і ніколи не комітяться.
- Якщо плануєте задеплоїти на Render — `render.yaml` вже описує потрібні env-змінні (`MONGO_URL`, `JWT_SECRET`, `CORS_ORIGIN` як `sync: false`, тобто значення вводяться вручну в дашборді, а не в репозиторії).
