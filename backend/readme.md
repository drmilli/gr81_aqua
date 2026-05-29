Backend (Node.js + Express + PostgreSQL)
📖 About

This is the Backend API for the SmartPrime8K XPlay-like media streaming platform.
It powers the mobile frontend (React Native + Expo) and the Admin Dashboard, providing:

Authentication & user management.

Movies, Series & Live TV APIs.

Profile & account management.

QR Code device pairing.

Dashboard & settings.

The backend is built with Node.js + Express, uses PostgreSQL as the primary database, and is designed for scalability and secure content delivery.

🎯 Features

User Management

Register / Login with User ID.

Multi-profile support (like Netflix).

JWT Authentication.

Content Management

Movies & Series (list, details, categories).

Live TV channels (News, Events, Sports, etc.).

Search API for movies, series & TV.

User Actions

My List (favorites).

QR Code pairing for device login.

Account & subscription details.

Admin APIs (for Admin Panel)

Upload / update content.

Manage categories, channels, and users.

Monitor usage & analytics.

📂 Project Structure
backend/
│── config/
│   ├── db.js             # Sequelize connection to PostgreSQL
│   └── env.js            # Environment variables
│
│── controllers/          # Business logic for each route
│   ├── authController.js
│   ├── movieController.js
│   ├── tvController.js
│   ├── profileController.js
│   ├── userController.js
│   └── qrController.js
│
│── middleware/           # Custom middleware
│   ├── authMiddleware.js
│   └── errorHandler.js
│
│── models/               # Sequelize models
│   ├── User.js
│   ├── Profile.js
│   ├── Movie.js
│   ├── Series.js
│   ├── TVChannel.js
│   └── QRSession.js
│
│── routes/               # API endpoints
│   ├── authRoutes.js
│   ├── movieRoutes.js
│   ├── tvRoutes.js
│   ├── profileRoutes.js
│   ├── userRoutes.js
│   └── qrRoutes.js
│
│── migrations/           # Sequelize migrations
│── seeders/              # Initial seed data
│── utils/                # Utility functions
│   ├── generateToken.js
│   └── logger.js
│
│── app.js                # Express app setup
│── server.js             # Server entry point
│── package.json
└── README.md

⚡️ Tech Stack

Node.js + Express – API framework.

PostgreSQL – Relational database.

Sequelize ORM – Database ORM for Postgres.

JWT (JSON Web Tokens) – Authentication.

bcrypt.js – Password hashing.

Multer / Cloudinary / AWS S3 – Media upload (movies, series, posters).

🚀 Getting Started
Prerequisites

Node.js ≥ 18

PostgreSQL ≥ 14

Git

Installation
# Clone the repo
git clone https://github.com/your-org/xplay-backend.git
cd xplay-backend

# Install dependencies
npm install

Environment Variables

Create a .env file in the root with:

PORT=5000
DATABASE_URL=postgres://<user>:<password>@localhost:5432/xplay
JWT_SECRET=your_jwt_secret
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

Run Migrations & Seeders
# Run database migrations
npx sequelize-cli db:migrate

# (Optional) Seed initial data
npx sequelize-cli db:seed:all

Run Server
# Development
npm run dev

# Production
npm start


Server runs on:
👉 http://localhost:5000

📡 API Endpoints
Auth

POST /api/auth/register – Register user.

POST /api/auth/login – Login with User ID.

Movies & Series

GET /api/movies – List movies.

GET /api/movies/:id – Movie details.

GET /api/series – List series.

GET /api/series/:id – Series details.

TV

GET /api/tv – List channels.

GET /api/tv/:id – Channel details.

Profiles

GET /api/profiles – Get user profiles.

POST /api/profiles – Add profile.

My List

POST /api/mylist – Add movie/series.

GET /api/mylist – Get user’s list.

QR Code

POST /api/qr/generate – Generate QR session.

POST /api/qr/verify – Verify QR login.

🛠 Development Notes

API responses follow REST standards.

Use Postman or Insomnia for testing.

Follow MVC structure for clean code.

Error handling centralized in middleware/errorHandler.js.

Database relationships managed via Sequelize associations:

User ↔ Profile (1:N)

User ↔ MyList (1:N)

Movie ↔ Category (M:N)

Series ↔ Episodes (1:N)
