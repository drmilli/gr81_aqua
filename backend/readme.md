# GR81 Aqua — Backend API

Node.js + Express + PostgreSQL backend powering the GR81 Aqua IPTV player app and admin panel.

---

## What it does

- **Device licensing** — trial / yearly / lifetime via Stripe
- **User management** — admin creates accounts and assigns IPTV servers
- **Provider/server management** — M3U and Xtream Codes servers with EPG support
- **Admin panel** — web UI at `/admin` for managing users, servers, and devices
- **Auth** — JWT-based login (username + password)

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express |
| Database | PostgreSQL (Neon cloud) |
| ORM | Sequelize |
| Auth | JWT + bcryptjs |
| Payments | Stripe |
| Logging | Winston + Morgan |

---

## Project structure

```
backend/
├── controllers/
│   ├── adminUserController.js     # Admin: user CRUD
│   ├── adminLicenseController.js  # Admin: device licenses
│   ├── authController.js          # Login / register
│   ├── licensingController.js     # Device trial/paid check
│   ├── providerController.js      # IPTV server CRUD
│   └── ...
├── middleware/
│   ├── authMiddleware.js          # JWT verification
│   ├── roles.js                   # Role guard (admin etc.)
│   ├── validate.js                # express-validator helper
│   └── errorHandler.js
├── migrations/                    # Sequelize migration files
├── models/                        # Sequelize models
│   ├── User.js
│   ├── Provider.js                # IPTV server (M3U / Xtream)
│   ├── DeviceLicense.js           # Per-device trial/paid
│   └── ...
├── routes/
│   ├── authRoutes.js
│   ├── adminUserRoutes.js
│   ├── adminLicenseRoutes.js
│   ├── providerRoutes.js
│   └── ...
├── scripts/
│   └── seedAdmin.js               # Create first admin user
├── admin.html                     # Admin panel (served at /admin)
├── app.js
└── server.js
```

---

## Getting started

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables

Create a `.env` file:

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_strong_secret_here

# Leave empty to allow all origins (dev). Set specific URLs in production.
ALLOWED_ORIGINS=

# Stripe (for device licensing payments)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Deep link scheme (matches app.json scheme)
APP_SCHEME=gr81aqua
```

### 3. Run migrations
```bash
npx sequelize db:migrate
```

### 4. Seed the admin user
```bash
node scripts/seedAdmin.js
```
Prints the admin email, password, and JWT to the console.

### 5. Start the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs at → **http://localhost:5000**

---

## API reference

### Auth
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` | Login — returns JWT |
| POST | `/api/auth/register` | `{ email, password, name }` | Register user |

### Admin — Users *(requires admin JWT)*
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/stats` | Dashboard KPIs |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/:id` | Update user (role, server, password) |
| DELETE | `/api/admin/users/:id` | Delete user |

### Admin — Device Licenses *(requires admin JWT)*
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/licenses` | List all devices |
| POST | `/api/admin/licenses/:deviceId/grant` | Grant yearly / lifetime |
| POST | `/api/admin/licenses/:deviceId/revoke` | Revoke access |

### Providers / IPTV Servers *(requires admin JWT)*
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/providers` | List servers |
| POST | `/api/providers` | Add server |
| PUT | `/api/providers/:id` | Update server |

### Licensing *(public — called by the app)*
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/licensing/status` | Check device trial/paid status |
| POST | `/api/licensing/checkout` | Create Stripe checkout session |

---

## Admin panel

Open in browser: **http://localhost:5000/admin**

Login with the credentials printed by `node scripts/seedAdmin.js`.

Features:
- **Dashboard** — KPIs (users, devices, trial, paid, servers)
- **Users** — create/edit/delete users, assign IPTV server
- **Servers** — add M3U / Xtream / EPG servers
- **Devices** — grant / revoke device licenses
- **Activity** — device check-in log

---

## Deployment (Render)

1. Push code to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add environment variables in the Render dashboard (same as `.env` above)
6. Run migrations locally against your cloud DB:
   ```bash
   npx sequelize db:migrate
   ```

---

## Database models

| Model | Description |
|---|---|
| `User` | App users — email, hashed password, role, assigned provider |
| `Provider` | IPTV servers — M3U URL, Xtream URL/credentials, EPG URL |
| `DeviceLicense` | Per-device trial / yearly / lifetime license |
| `TVChannel` | Ingested live channels |
| `Movie` / `Series` / `Episode` | Ingested VOD content |
| `EPGEvent` | Electronic Programme Guide events |
| `Subscription` | User subscription records |
| `QRSession` | QR code pairing sessions |
