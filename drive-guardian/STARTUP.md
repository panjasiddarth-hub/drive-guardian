# Drive Guardian – Quick Start

## Prerequisites
- Docker + Docker Compose
- OR: Node.js 20, Python 3.11, Redis, RabbitMQ running locally

---

## Option A – Docker (recommended)

1. Copy env files:
   ```bash
   cp Backend/.env.example Backend/.env
   cp FrontEnd/.env.example FrontEnd/.env
   ```

2. Edit `Backend/.env` with your MongoDB URI and email credentials.

3. Start everything:
   ```bash
   docker-compose up --build
   ```

4. Open http://localhost (frontend) and http://localhost:5000 (API).

---

## Option B – Local dev

### Backend
```bash
cd Backend
cp .env.example .env    # fill in your values
npm install
node server.js
```

### ML Service
```bash
cd Model
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd FrontEnd
cp .env.example .env    # set VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

---

## Services & Ports
| Service    | Port  |
|------------|-------|
| Frontend   | 80 (docker) / 5173 (dev) |
| Backend    | 5000  |
| ML Service | 8000  |
| Redis      | 6379  |
| RabbitMQ   | 5672  |
| RabbitMQ UI| 15672 |
| MongoDB    | 27017 |
