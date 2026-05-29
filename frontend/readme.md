Frontend (React Native + Expo)
📖 About

This is the Frontend (Mobile App) of the SmartPrime8K XPlay-like media streaming platform, built with React Native (Expo).
It allows users to watch live TV, movies, series, manage profiles, and customize settings.
The app is designed with a modern, intuitive UI and powered by Node.js backend APIs.

🎯 Features

Onboarding with User ID login.

Home Page showing recently added and updated content.

Live TV (News, Events, Channels with filters).

Movies & Series with categories, details, and playback.

Global Search across movies, series, and live TV.

Dashboard with quick access to:

My List

Profiles

Account

Scan QR Code

Settings

About

Logout

Playback Screen with video player.

Multi-profile support (like Netflix).

📱 Screens

Onboarding – Welcome screen with ID input.

Home – Recently Added, Latest Updated Movies, Latest Updated Series.

TV – Live channels (News, Events, etc.) with filters.

Movies – Movies & Series with categories.

Search – Global search functionality.

Dashboard – Links to sub-pages.

My List – Saved/favorited content.

Profiles – Manage and switch profiles.

Account – Subscription, billing, user details.

Scan QR Code – Device pairing.

Settings – App preferences (language, playback, notifications).

About – App info, version, policies.

Movie Details – Description, poster, cast, play/add to list.

Play Screen – Video player for movies/TV.

🧭 Navigation

The app uses Bottom Tab Navigation + Stack Navigation with React Navigation v6.

Bottom Tabs

Home 🏠

TV 📺

Movies 🎬

Search 🔍

Dashboard 👤

Dashboard Sub-pages

My List

Profiles

Account

Scan QR Code

Settings

About

Logout

📂 Project Structure
frontend/
│── assets/              # Images, fonts, icons
│── components/          # Reusable UI components
│── navigation/          # React Navigation setup
│── screens/             # All app screens
│   ├── Onboarding.js
│   ├── Home.js
│   ├── TV.js
│   ├── Movies.js
│   ├── Search.js
│   ├── Dashboard.js
│   ├── MyList.js
│   ├── Profiles.js
│   ├── Account.js
│   ├── ScanQRCode.js
│   ├── Settings.js
│   ├── About.js
│   ├── MovieDetail.js
│   └── PlayScreen.js
│── App.js               # Main entry point
│── package.json
└── README.md

⚡️ Tech Stack

React Native (Expo) – Mobile framework.

React Navigation v6 – Navigation & tabs.

Axios / Fetch – API requests.

Expo AV – Video playback.

AsyncStorage / SecureStore – Local storage.

QR Code Scanner (Expo Camera) – Device pairing.

🚀 Getting Started
Prerequisites

Node.js ≥ 18

Expo CLI ≥ 6


Git

Installation
# Clone the repo
git clone https://github.com/your-org/smartprime8k.git
cd frontend

# Install dependencies
npm install

# Start Expo
npx expo start

Running on Devices

iOS: Press i to open iOS simulator.

Android: Press a to open Android emulator.

Physical Device: Scan QR code in Expo Go app.

🛠 Development Notes

Keep components modular and reusable.

API base URL is configured in config/api.js.

Use Axios interceptors for authentication tokens.

Follow naming convention: PascalCase for components, camelCase for functions.

npx eas build -p android --profile preview
