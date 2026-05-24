# Trend Intelligence - Implementation Guide

## 📋 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- Reddit OAuth credentials
- Groq API key
- Upstash Redis account
- Supabase PostgreSQL account

### Step 1: Backend Setup

```bash
# Clone or navigate to project
cd trends

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API credentials
```

### Step 2: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Create .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 3: Run Locally

**Backend Terminal:**
```bash
uvicorn main:app --reload
# API available at http://localhost:8000
# Docs available at http://localhost:8000/docs
```

**Frontend Terminal:**
```bash
npm run dev
# Dashboard available at http://localhost:3000
```

## 🔧 Configuration

### Reddit OAuth Setup

1. Go to https://www.reddit.com/prefs/apps
2. Create new app (choose "script" type)
3. Note your `client_id` and `client_secret`
4. Add to `.env`:
   ```
   REDDIT_CLIENT_ID=your_id
   REDDIT_CLIENT_SECRET=your_secret
   REDDIT_USER_AGENT=TrendAgent/1.0 (by /u/yourname)
   ```

### Groq API Setup

1. Visit https://console.groq.com
2. Create API key
3. Add to `.env`:
   ```
   GROQ_API_KEY=your_key
   ```

### Upstash Redis Setup

1. Create account at https://upstash.com
2. Create new Redis database (free tier: 256MB)
3. Copy REST URL and token
4. Add to `.env`:
   ```
   REDIS_URL=https://your-upstash-url
   REDIS_TOKEN=your_token
   ```

### Supabase PostgreSQL Setup

1. Create project at https://supabase.com
2. Copy connection string
3. Add to `.env`:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend (Vercel)               │
│              TrendDashboard / TrendCard                  │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP + WebSocket
┌────────────────────▼────────────────────────────────────┐
│               FastAPI Backend (Render)                   │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │ Reddit       │  │ Embeddings   │  │ Clustering   │   │
│ │ Client       │  │ Service      │  │ Service      │   │
│ └──────────────┘  └──────────────┘  └──────────────┘   │
├──────────────────────────────────────────────────────────┤
│              APScheduler (Background Jobs)               │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │ Redis Cache  │  │ Groq LLM     │  │ WebSocket    │   │
│ │ (Upstash)    │  │ Integration  │  │ Server       │   │
│ └──────────────┘  └──────────────┘  └──────────────┘   │
└───┬──────────────────────────┬───────────────────────┬──┘
    │                          │                       │
┌───▼──────────┐  ┌───────────▼────────┐  ┌──────────▼──┐
│ PostgreSQL   │  │ Redis Pub/Sub       │  │ Upstash     │
│ (Supabase)   │  │ Channel             │  │ Redis       │
└──────────────┘  └────────────────────┘  └─────────────┘
```

## 🚀 Deployment

### Deploy to Render (Backend)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Select `render.yaml` as build configuration
5. Add environment variables:
   - `REDDIT_CLIENT_ID`
   - `REDDIT_CLIENT_SECRET`
   - `GROQ_API_KEY`
   - `REDIS_URL`
   - `DATABASE_URL`
   - `ENVIRONMENT=production`
6. Deploy

### Deploy to Vercel (Frontend)

1. Import GitHub repository
2. Set environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com`
3. Deploy

## 📈 API Endpoints

### Health & Status
```
GET /health              → {"status": "ok"}
GET /ready              → {"ready": true}
```

### Trends
```
GET /api/trends/              → List all trends
GET /api/trends/{cluster_id}  → Get trend details
GET /api/trends/summary/{id}  → Get AI summary
```

### Real-time Updates
```
WS /ws/trends           → WebSocket connection for live updates
```

## 🧪 Testing

```bash
# Run tests
pytest tests/

# Run with coverage
pytest tests/ --cov=app

# Run specific test
pytest tests/test_services.py::TestRedditClient
```

## 📝 Key Features

- ✅ Real-time Reddit monitoring
- ✅ Semantic clustering with sentence-transformers
- ✅ AI-powered summaries with Groq
- ✅ Redis caching and pub/sub
- ✅ WebSocket live updates
- ✅ PostgreSQL historical data
- ✅ Rate limit handling
- ✅ Responsive React dashboard

## 🔮 Next Steps (Phase 2)

- [ ] Multi-source ingestion (HN, Google Trends, YouTube)
- [ ] Kafka event streaming
- [ ] Vector database integration
- [ ] User authentication and alerts
- [ ] Time-series forecasting
- [ ] Advanced analytics dashboard
- [ ] Notification system (email, SMS, Slack)

## 🆘 Troubleshooting

### Backend won't start
- Check Python version: `python --version` (need 3.11+)
- Verify all dependencies: `pip list`
- Check `.env` file exists with valid credentials

### Frontend won't connect to API
- Verify backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

### Redis connection failed
- Verify Redis URL is correct
- Check network connectivity to Upstash
- Ensure Redis token is valid

### Redis clustering fails
- Check that embeddings are being generated correctly
- Verify scikit-learn is installed
- Check logs for memory issues

## 📞 Support

For issues or questions:
1. Check the logs: `docker logs <container>` or `tail -f logs/`
2. Review the README in each component
3. Check GitHub issues
4. Review deployment platform docs (Render, Vercel)
