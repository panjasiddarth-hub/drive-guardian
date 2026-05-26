# 🚗 Drive Guardian

An AI-powered real-time fleet monitoring and driver risk analysis platform built using MERN Stack, FastAPI, Redis, RabbitMQ, and Machine Learning.

---

## 🌟 Features

* 🔴 Real-time vehicle monitoring
* 🧠 AI/ML-based driver risk prediction
* 📡 Live trip simulation engine
* ⚠️ Smart alerts & risk detection
* 📊 Fleet analytics dashboard
* 🔐 JWT authentication system
* ⚡ Redis caching
* 🐇 RabbitMQ event queue integration
* 🌐 Full-stack cloud deployment

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* Tailwind CSS

### Backend

* Node.js
* Express.js
* MongoDB
* Redis
* RabbitMQ

### AI / ML

* FastAPI
* Scikit-learn
* Python

### Deployment

* Vercel (Frontend)
* Render (Backend)
* MongoDB Atlas

---

## 🏗️ System Architecture

```text
Frontend (React/Vite)
        ↓
Backend API (Node.js/Express)
        ↓
MongoDB Atlas
        ↓
ML Microservice (FastAPI)
        ↓
Risk Prediction Engine
```

---

## 🚀 Live Demo

### Frontend

https://your-vercel-url.vercel.app

### Backend API

https://your-render-url.onrender.com

---

## 📦 Installation

### Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/drive-guardian.git
cd drive-guardian
```

---

## 🔧 Backend Setup

```bash
cd Backend
npm install
npm start
```

---

## 💻 Frontend Setup

```bash
cd FrontEnd
npm install
npm run dev
```

---

## 🤖 ML Service Setup

```bash
cd Model
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

---

## 🔑 Environment Variables

### Backend `.env`

```env
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
RABBIT_URL=your_rabbitmq_url
REDIS_URL=your_redis_url
```

### Frontend `.env`

```env
VITE_API_URL=your_backend_url
```

---

## 📸 Screenshots

* Login Page
* Fleet Dashboard
* Risk Analysis Panel
* Live Monitoring System

---

## 🎯 Future Improvements

* Driver fatigue detection
* Real GPS integration
* Advanced ML models
* Predictive maintenance
* Mobile application
* Cloud queue infrastructure

---

## 👨‍💻 Author

**Siddarth Panja**

* GitHub: https://github.com/panjasiddarth-hub

---

## ⭐ Support

If you like this project, give it a star ⭐ on GitHub!
