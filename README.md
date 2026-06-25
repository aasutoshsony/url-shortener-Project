# URL Shortener — Production-Grade Node.js Service
# The shortening is achieved by generating a unique identifier using a library like shortid, which acts as the alias for the original URL. This ID is stored in the database along with the original URL. During access, the system resolves the short ID back to the original URL using a cache-first approach with Redis.
---

## ⚡ Setup

```bash
# 1. Clone / unzip project
cd url-shortener

# 2. Install dependencies
npm install

# 3. Copy env file and configure
cp .env.example .env

# 4. Start MongoDB (locally)
mongod --dbpath /data/db

# 5. Start Redis (locally)
redis-server

# 6. Run
npm run dev        # development (nodemon)
npm start          # production
```

> Requires: Node ≥ 18, MongoDB ≥ 6, Redis ≥ 7

---

## 📁 Project Structure

```
url-shortener/
├── app.js                          # Entry point, server bootstrap
├── package.json
├── .env.example
└── src/
    ├── config/
    │   ├── db.js                   # Mongoose connection
    │   └── redis.js                # Redis client (singleton)
    ├── models/
    │   └── urlModel.js             # Mongoose schema + TTL index
    ├── controllers/
    │   └── urlController.js        # Thin HTTP layer
    ├── services/
    │   └── urlService.js           # Business logic, cache-aside
    └── routes/
        └── urlRoutes.js            # Express routes + rate limiters
```

---

## 🔌 API Endpoints

| Method   | Path                        | Description                          |
|----------|-----------------------------|--------------------------------------|
| `POST`   | `/api/shorten`              | Create a short URL                   |
| `GET`    | `/:shortId`                 | Redirect to original URL             |
| `GET`    | `/api/r/:shortId`           | Redirect (API prefix variant)        |
| `GET`    | `/api/analytics/:shortId`   | Fetch click analytics                |
| `DELETE` | `/api/:shortId`             | Delete a short URL                   |
| `GET`    | `/health`                   | Health check                         |

### POST `/api/shorten` — Request Body
```json
{
  "originalUrl": "https://example.com/very/long/path",
  "customId":    "my-link",       // optional
  "ttlDays":     7,               // optional, URL expires after N days
  "createdBy":   "user@email.com" // optional
}
```

### POST `/api/shorten` — Response
```json
{
  "success": true,
  "data": {
    "shortId":     "aB3xY9k",
    "shortUrl":    "http://localhost:3000/aB3xY9k",
    "originalUrl": "https://example.com/very/long/path",
    "expiresAt":   "2024-07-01T00:00:00.000Z",
    "createdAt":   "2024-06-24T12:00:00.000Z"
  }
}
```

### GET `/api/analytics/:shortId` — Response
```json
{
  "success": true,
  "data": {
    "shortId":     "aB3xY9k",
    "shortUrl":    "http://localhost:3000/aB3xY9k",
    "originalUrl": "https://example.com/very/long/path",
    "clicks":      42,
    "expiresAt":   null,
    "isExpired":   false,
    "createdAt":   "2024-06-24T12:00:00.000Z"
  }
}
```

---

## 📋 Error Responses

| Status | Scenario                           |
|--------|------------------------------------|
| 400    | Invalid/missing URL or bad input   |
| 404    | Short ID not found                 |
| 409    | Custom short ID already taken      |
| 410    | URL has expired                    |
| 429    | Rate limit exceeded                |
| 500    | Internal server error              |

---

