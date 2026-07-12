# API Endpoints — Reddit Clone Backend

**Base URL:** `http://localhost:4000/api`

**Auth:** защищённые эндпоинты требуют `Authorization: Bearer <accessToken>`.
Refresh-токен передаётся через httpOnly cookie (`credentials: 'include'` на фронте обязателен).

**Файлы:** multipart/form-data не поддерживается. `avatarUrl` / `bannerUrl` / `iconUrl` / `mediaUrl` — строки-ссылки, не файлы. Загрузка на S3 — отдельный эндпоинт (TODO).

**Формат ошибок:**
```json
{ "error": "Текст помилки", "details": [] }
```
| Код | Значение |
|---|---|
| 400 | Ошибка валидации |
| 401 | Не авторизован |
| 403 | Нет прав |
| 404 | Не найдено |
| 409 | Конфликт |
| 429 | Rate limit |
| 500 | Ошибка сервера |

---

## Auth `/api/auth`

| Метод | Путь | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/register` | – | `email, username, password` | `201` `{ user, accessToken }` + cookie `refreshToken` |
| POST | `/login` | – | `emailOrUsername, password` | `200` `{ user, accessToken }` |
| POST | `/refresh` | cookie | – | `200` `{ accessToken, user }` |
| POST | `/logout` | cookie | – | `204` |
| POST | `/forgot-password` | – | `email` | `200` `{ message }` |
| POST | `/reset-password` | – | `token, newPassword` | `200` `{ message }` |
| GET | `/me` | Bearer | – | `200` `{ user }` |

---

## Users `/api/users`

| Метод | Путь | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/:username` | – | – | `200` `{ user }` (+ postCount, commentCount) |
| PATCH | `/me` | Bearer | `bio?, avatarUrl?` | `200` `{ user }` |
| GET | `/me/posts` | Bearer | – | `200` `{ posts[] }` |
| GET | `/me/comments` | Bearer | – | `200` `{ comments[] }` |

---

## Subreddits `/api/subreddits`

| Метод | Путь | Auth | Body / Query | Response |
|---|---|---|---|---|
| POST | `/` | Bearer | `name, title, description, isPrivate?, bannerUrl?, iconUrl?` | `201` `{ subreddit }` |
| GET | `/?search=&page=&limit=` | – | limit ≤100, default 20 | `200` `{ subreddits[], total, page, limit }` |
| GET | `/:name` | опц. | – | `200` `{ subreddit, isSubscribed, role }` |
| PATCH | `/:id` | MOD/ADMIN | `title?, description?, bannerUrl?, iconUrl?, isPrivate?` | `200` `{ subreddit }` |
| DELETE | `/:id` | ADMIN (creator) | – | `204` |
| POST | `/:id/subscribe` | Bearer | – | `201` `{ membership }` |
| DELETE | `/:id/subscribe` | Bearer | – | `204` |
| GET | `/:id/moderators` | – | – | `200` `{ moderators[] }` |
| POST | `/:id/moderators` | ADMIN | `username` | `201` `{ membership }` |
| DELETE | `/:id/moderators/:userId` | ADMIN | – | `204` |
| POST | `/:id/rules` | MOD/ADMIN | `title, description, order` | `201` `{ rule }` |
| DELETE | `/:id/rules/:ruleId` | MOD/ADMIN | – | `204` |
| GET | `/:id/posts?sort=&page=&limit=` | – | sort: hot\|new\|top\|controversial | `200` `{ posts[], total, page, limit }` |
| POST | `/:id/posts` | Bearer | `title, type, content\|url\|mediaUrl` | `201` `{ post }` |
| GET | `/:id/reports?status=` | MOD/ADMIN | status: PENDING\|RESOLVED\|REJECTED | `200` `{ reports[] }` |
| POST | `/:id/bans` | MOD/ADMIN | `username, reason` | `201` `{ ban }` |
| DELETE | `/:id/bans/:userId` | MOD/ADMIN | – | `204` |
| GET | `/:id/bans` | MOD/ADMIN | – | `200` `{ bans[] }` |

Типы поста: `TEXT` → `content`, `LINK` → `url`, `MEDIA` → `mediaUrl`.

---

## Posts `/api/posts`

| Метод | Путь | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/:id` | опц. | – | `200` `{ post, myVote }` |
| PATCH | `/:id` | автор | `title?, content?` | `200` `{ post }` |
| DELETE | `/:id` | автор/мод | – | `204` |
| POST | `/:id/vote` | Bearer | `value: UP\|DOWN\|null` | `200` `{ score, upvotes, downvotes, myVote }` |
| GET | `/:id/comments?sort=` | – | sort: best\|new\|top | `200` `{ comments[] }` (дерево, `replies`) |
| POST | `/:id/comments` | Bearer | `content, parentId?` | `201` `{ comment }` |
| POST | `/:id/remove` | MOD/ADMIN | `reason?` | `200` `{ post }` |
| POST | `/:id/approve` | MOD/ADMIN | – | `200` `{ post }` |

---

## Comments `/api/comments`

| Метод | Путь | Auth | Body | Response |
|---|---|---|---|---|
| PATCH | `/:id` | автор | `content` | `200` `{ comment }` |
| DELETE | `/:id` | автор/мод | – | `204` |
| POST | `/:id/vote` | Bearer | `value: UP\|DOWN\|null` | `200` `{ score, upvotes, downvotes, myVote }` |

---

## Feed `/api/feed`

| Метод | Путь | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/home?sort=&page=&limit=` | Bearer | – | `200` `{ posts[], total, page, limit }` |
| GET | `/popular?sort=&page=&limit=` | опц. | кеш 60с | `200` `{ posts[], total, page, limit }` |
| GET | `/all?sort=&page=&limit=` | опц. | – | `200` `{ posts[], total, page, limit }` |

---

## Search `/api/search`

| Метод | Путь | Auth | Query | Response |
|---|---|---|---|---|
| GET | `/?q=&type=&page=&limit=` | – | type: all\|posts\|subreddits\|users | `200` `{ posts[], subreddits[], users[] }` |

---

## Notifications `/api/notifications`

| Метод | Путь | Auth | Query/Body | Response |
|---|---|---|---|---|
| GET | `/?unreadOnly=&page=&limit=` | Bearer | – | `200` `{ notifications[], unreadCount, total, page, limit }` |
| PATCH | `/:id/read` | Bearer | – | `204` |
| PATCH | `/read-all` | Bearer | – | `204` |

---

## Moderation `/api/moderation`

| Метод | Путь | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/reports` | Bearer | `targetType: POST\|COMMENT, postId\|commentId, reason` | `201` `{ report }` |
| PATCH | `/reports/:id` | Bearer | `status: RESOLVED\|REJECTED` | `200` `{ report }` |
| POST | `/comments/:id/remove` | MOD/ADMIN | – | `200` `{ comment }` |

---

## Health

| Метод | Путь | Response |
|---|---|---|
| GET | `/health` | `200` `{ status: "ok", time }` |