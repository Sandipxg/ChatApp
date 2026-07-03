# 💬 ChatApp

Welcome to **ChatApp**, a real-time web messaging platform featuring an upgraded modern glassmorphism design, custom background settings, push reminders, and robust security management.

---

## ✨ Features

- 🔒 **Secure Auth**: Seamless Email & Password login/signup alongside Google & GitHub OAuth integrations powered by Better Auth.
- 🖼️ **Profile Picture Upload**: Upload and edit avatars using a secure backend parser (Multer) with permanent storage hosted on Cloudinary CDN.
- 🎨 **Premium Glassmorphic UI**: High-end frosted glass layout, soft typography, smooth micro-animations, and customizable themes (Light/Dark/System).
- 🖼️ **Personalized Accent Colors & Wallpapers**: Switch colors and gradient/image backdrops dynamically in real-time.
- 🔔 **Push Notifications & Reminders**: Opt-in to receive desktop push notifications and set daily message reminders with custom timezones.
- ⚠️ **Danger Zone Control**: Fully secure account deletion validating authentication state prior to removing user data.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **Routing & State**: React Router, Context API (`AuthContext`, `ThemeContext`)

### Backend
- **Framework**: Express (Node.js)
- **Database**: MongoDB (Mongoose ORM)
- **Media Storage**: Cloudinary (SDK Integration) + Multer (for multi-part file parsing)
- **Auth Provider**: Better Auth (with MongoDB adapter & username plugins)
- **Security Middleware**: CORS, Rate Limiting, Helmet

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB running locally or on MongoDB Atlas

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside the `backend` folder and populate the variables:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/chatapp
   BETTER_AUTH_SECRET=your_auth_secret_key
   BETTER_AUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret

   # Cloudinary Keys (Optional, falls back to mock images if left empty)
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`.

---

## 🐳 Docker Deployment

To launch the database, backend, and frontend instantly using Docker:
```bash
docker-compose up --build
```
This starts:
- **Database**: MongoDB at `mongodb://localhost:27017`
- **Backend Service**: Express API at `http://localhost:3000`
- **Frontend Service**: React App at `http://localhost:5173`

---

## 📁 Project Structure

```
chatapp/
├── backend/
│   ├── config/             # Auth & Database initializations
│   ├── controllers/        # Chat & Auth controllers
│   ├── middleware/         # Auth verification & Error handling
│   ├── models/             # Mongoose schemas (User, Message)
│   ├── routes/             # Express API routers
│   └── app.js              # Core express application middleware
├── frontend/
│   ├── src/
│   │   ├── components/     # Icons & UI elements
│   │   ├── context/        # AuthContext & ThemeContext
│   │   ├── pages/          # Login, Chat, and Settings pages
│   │   ├── services/       # API call handlers (chatService)
│   │   ├── App.jsx         # App router structure & dynamic headers
│   │   └── index.css       # Animations & global theme utility overrides
└── docker-compose.yml      # Service definitions
```
