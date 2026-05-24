# Trend Intelligence

> **Real-time Trend Detection & Monitoring Platform**
>
> A full-stack AI-powered system that detects, analyzes, and monitors emerging trends across multiple sources including GitHub, HackerNews, Google Trends, NewsAPI, and DevTO. Features intelligent clustering, semantic search, AI summarization, forecasting, and real-time WebSocket updates.

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Frontend Pages](#frontend-pages)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### Core Functionality
- **Real-time Trend Detection** - Monitors multiple data sources continuously with intelligent clustering
- **Multi-Source Integration** - Aggregates data from GitHub, HackerNews, Google Trends, NewsAPI, and DevTO
- **AI-Powered Summarization** - Uses Groq LLM to generate insightful trend summaries
- **Semantic Search** - Find trends using natural language queries with embeddings
- **Live Updates** - WebSocket-based real-time trend notifications and updates
- **Trend Forecasting** - Predict trend momentum and trajectory using machine learning
- **Alert System** - Create custom alerts for specific trends with email notifications
- **Watchlist Management** - Save and track favorite trends
- **Trend History** - Full audit trail of trend evolution and coverage
- **Content Ideas** - AI-generated content suggestions based on trending topics
- **Cross-Platform Analytics** - View trend data across multiple platforms in one dashboard
- **Export Functionality** - Export trends and analysis data in multiple formats

### Advanced Features
- **Sentiment Analysis** - VADER sentiment scoring on trend content
- **Semantic Clustering** - Advanced topic grouping using sentence transformers
- **Caching Strategy** - Redis-backed intelligent caching for performance optimization
- **Rate Limiting & Throttling** - Built-in API rate limiting and source throttling
- **JWT Authentication** - Secure API endpoints with token-based authentication
- **Role-Based Access** - User permission management system
- **Configuration Management** - Dynamic platform and source configuration
- **Health Monitoring** - Real-time service health and readiness checks
- **Performance Metrics** - Track API response times and system metrics

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                          │
│  Dashboard | Alerts | Watchlist | Trends | History | Settings  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                   Backend (FastAPI v4.0.0)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Router Layer                            │   │
│  │  Trends | History | Alerts | Forecast | Search | Auth   │   │
│  └──────────────────┬───────────────────────────────────────┘   │
│  ┌──────────────────▼───────────────────────────────────────┐   │
│  │              Service Layer                              │   │
│  │  Trend Engine | Forecast | Alert | Semantic Search      │   │
│  │  Embedding | Auth | Cache                               │   │
│  └──────────────────┬───────────────────────────────────────┘   │
│  ┌──────────────────▼───────────────────────────────────────┐   │
│  │           Data Source Clients                            │   │
│  │  GitHub | HackerNews | NewsAPI | Google Trends | DevTO  │   │
│  │                   Reddit (Legacy)                        │   │
│  └──────────────────┬───────────────────────────────────────┘   │
└────────────────────┼────────────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
   ┌──▼──┐      ┌────▼─────┐   ┌───▼────┐
   │Redis│      │PostgreSQL│   │Groq LLM│
   │Cache│      │Database  │   │Service │
   └─────┘      └──────────┘   └────────┘
```

### Backend (FastAPI)
- **Framework**: FastAPI with Uvicorn ASGI server
- **Data Processing**: 
  - Sentence-transformers for semantic embeddings
  - Scikit-learn for agglomerative clustering
  - APScheduler for background jobs and polling
- **Caching Layer**: Redis (Upstash) with async pub/sub
- **Database**: PostgreSQL (Supabase) with async SQLAlchemy/asyncpg
- **AI Integration**: Groq API for LLM-powered summaries and analysis
- **Real-time**: WebSocket connections with Redis pub/sub broadcasting
- **Authentication**: JWT tokens with bcrypt password hashing

### Frontend (Next.js + React)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS + PostCSS
- **Data Visualization**: Recharts for interactive charts and sparklines
- **UI Components**: Lucide React icons
- **API Client**: Axios for HTTP requests
- **Real-time Client**: Custom WebSocket hooks for live updates

---

## 🛠️ Tech Stack

### Backend Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.104.1 | Web framework |
| Uvicorn | 0.24.0 | ASGI server |
| SQLAlchemy | 2.0.23 | ORM layer |
| asyncpg | 0.29.0 | Async PostgreSQL driver |
| Redis | 5.0.1 | Caching & pub/sub |
| sentence-transformers | 2.2.2 | Semantic embeddings |
| scikit-learn | 1.3.2 | Clustering algorithms |
| APScheduler | 3.10.4 | Background jobs |
| Groq | 0.4.2 | LLM API client |
| Pydantic | 2.4.2 | Data validation |
| python-jose | 3.3.0 | JWT handling |
| websockets | 12.0 | WebSocket support |
| vaderSentiment | 3.3.2 | Sentiment analysis |
| pytrends | 4.9.2 | Google Trends data |

### Frontend Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 14.0.0 | React framework |
| React | 18.2.0 | UI library |
| TypeScript | 6.0.3 | Type safety |
| Tailwind CSS | 3.3.0 | Styling |
| Recharts | 2.10.0 | Charts library |
| Axios | 1.6.0 | HTTP client |
| Lucide React | 0.292.0 | Icon library |

---

## 📁 Project Structure

```
trend-intelligence/
├── main.py                          # FastAPI application entry point
├── requirements.txt                 # Python dependencies
├── render.yaml                      # Render deployment config
├── README.md                        # This file
├──.gitignore
├── SETUP_GUIDE.md                   # Detailed setup instructions
│
├── app/
│   ├── __init__.py
│   ├── config.py                    # Configuration & settings
│   ├── database.py                  # Database initialization
│   ├── scheduler.py                 # Background job scheduler
│   │
│   ├── models/                      # Pydantic models
│   │   └── __init__.py
│   │
│   ├── routes/                      # API endpoints
│   │   ├── __init__.py
│   │   ├── alerts.py                # Alert management endpoints
│   │   ├── auth.py                  # Authentication endpoints
│   │   ├── config.py                # Configuration endpoints
│   │   ├── content.py               # Content ideas endpoints
│   │   ├── export.py                # Data export endpoints
│   │   ├── forecast.py              # Trend forecasting endpoints
│   │   ├── google_trends.py         # Google Trends endpoints
│   │   ├── health.py                # Health check endpoints
│   │   ├── history.py               # Trend history endpoints
│   │   ├── internal.py              # Internal/admin endpoints
│   │   ├── search.py                # Semantic search endpoints
│   │   ├── status.py                # Service status endpoints
│   │   ├── trends.py                # Core trends endpoints
│   │   ├── watchlist.py             # Watchlist management endpoints
│   │   └── websocket.py             # WebSocket real-time endpoints
│   │
│   └── services/                    # Business logic & data clients
│       ├── __init__.py
│       ├── alert_service.py         # Alert processing
│       ├── auth_service.py          # Authentication logic
│       ├── cache.py                 # Redis cache wrapper
│       ├── devto_client.py          # DevTO API client
│       ├── embedding_service.py     # Embeddings & clustering
│       ├── forecast_service.py      # Trend forecasting logic
│       ├── github_client.py         # GitHub API client
│       ├── google_trends_client.py  # Google Trends client (RSS)
│       ├── google_trends_rss_client.py # Alternative GT source
│       ├── groq_service.py          # Groq LLM integration
│       ├── hackernews_client.py     # HackerNews API client
│       ├── newsapi_client.py        # NewsAPI client
│       ├── reddit_client.py         # Reddit API client (legacy)
│       ├── semantic_search.py       # Semantic search implementation
│       └── trend_engine.py          # Core trend processing engine
│
├── frontend/
│   ├── package.json                 # Node.js dependencies
│   ├── tsconfig.json                # TypeScript configuration
│   ├── tailwind.config.ts           # Tailwind CSS configuration
│   ├── next.config.js               # Next.js configuration
│   ├── postcss.config.js            # PostCSS configuration
│   ├── vercel.json                  # Vercel deployment config
│   │
│   ├── app/                         # Next.js app directory
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home page
│   │   ├── globals.css              # Global styles
│   │   ├── alerts/page.tsx          # Alert management page
│   │   ├── dashboard/page.tsx       # Dashboard page
│   │   ├── history/page.tsx         # Trend history page
│   │   ├── login/page.tsx           # Login page
│   │   ├── settings/page.tsx        # User settings page
│   │   ├── status/page.tsx          # Service status page
│   │   ├── trends/[id]/page.tsx     # Trend detail page
│   │   └── watchlist/page.tsx       # Watchlist page
│   │
│   ├── components/                  # React components
│   │   ├── AlertForm.tsx            # Alert creation form
│   │   ├── ClientLayout.tsx         # Client-side layout wrapper
│   │   ├── ColdStartBanner.tsx      # Cold start notice banner
│   │   ├── ContentIdeaPanel.tsx     # Content suggestions display
│   │   ├── CrossPlatformChart.tsx   # Multi-source trend chart
│   │   ├── ForecastBadge.tsx        # Trend forecast badge
│   │   ├── Navbar.tsx               # Navigation bar
│   │   ├── ProtectedRoute.tsx       # Auth-protected route wrapper
│   │   ├── SparklineChart.tsx       # Compact trend sparkline
│   │   ├── SubredditSelector.tsx    # Reddit community selector
│   │   ├── TrendCard.tsx            # Trend display card
│   │   ├── TrendDashboard.tsx       # Main dashboard component
│   │   ├── TrendTimeline.tsx        # Trend timeline view
│   │   ├── WatchlistButton.tsx      # Watchlist action button
│   │   └── WhyTrendingPanel.tsx     # Trend analysis panel
│   │
│   └── lib/                         # Utilities & helpers
│       ├── api.ts                   # API client wrapper
│       ├── auth.tsx                 # Authentication utilities
│       ├── types.ts                 # TypeScript type definitions
│       └── useTrendSocket.ts        # WebSocket hook
│
└── tests/
    ├── test_e2e_endpoints.py        # End-to-end API tests
    ├── test_integration.py          # Integration tests
    └── test_services.py             # Unit tests for services
```

---

## 🚀 Quick Start

### Prerequisites
- **Python** 3.11 or higher
- **Node.js** 18 or higher
- **Git**
- API Keys:
  - [Groq API Key](https://console.groq.com)
  - [GitHub Token](https://github.com/settings/tokens)
  - [NewsAPI Key](https://newsapi.org)
  - [DevTO API Token](https://dev.to/settings/account)
- **External Services**:
  - [Upstash Redis](https://upstash.com) or local Redis
  - [Supabase PostgreSQL](https://supabase.com) or local PostgreSQL
  - [Resend](https://resend.com) (optional, for email alerts)

### Backend Setup

```bash
# Clone repository
git clone <repository-url>
cd trend-intelligence

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys and connection strings
nano .env

# Run database migrations (if needed)
# python -m alembic upgrade head

# Start backend server
python main.py
# Server runs on http://localhost:8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment
# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
# Frontend runs on http://localhost:3000
```

### Access Application

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔐 Environment Variables

### Backend (.env)

```env
# API Keys
GROQ_API_KEY=gsk_...
GITHUB_TOKEN=ghp_...
NEWSAPI_KEY=...
DEVTO_API=...
RESEND_API_KEY=...

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Cache
REDIS_URL=redis://host:6379

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production

# Internal Security
INTERNAL_SECRET=your-internal-secret

# Application
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000

# Legacy (Deprecated)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📡 API Documentation

### Health & Status
- `GET /health` - Service health check
- `GET /ready` - Readiness probe
- `GET /api/status/` - Detailed service status

### Trends
- `GET /api/trends/` - Get current trending topics (with filtering & sorting)
- `GET /api/trends/{cluster_id}` - Get trend details by ID
- `GET /api/trends/summary/{cluster_id}` - Get AI-powered trend summary
- `GET /api/trends/why-trending/{cluster_id}` - Get why-trending analysis

### Search
- `GET /api/search/semantic` - Semantic search across trends
- `POST /api/search/query` - Full-text search with filters

### Forecast
- `GET /api/forecast/{cluster_id}` - Get trend forecast
- `GET /api/forecast/compare` - Compare multiple trends' trajectories

### History
- `GET /api/history/` - Get trend history with timeline
- `GET /api/history/{cluster_id}` - Get specific trend history

### Alerts
- `GET /api/alerts/` - List user alerts
- `POST /api/alerts/` - Create new alert
- `PUT /api/alerts/{alert_id}` - Update alert
- `DELETE /api/alerts/{alert_id}` - Delete alert
- `POST /api/alerts/{alert_id}/test` - Test alert

### Watchlist
- `GET /api/watchlist/` - Get watchlist items
- `POST /api/watchlist/` - Add to watchlist
- `DELETE /api/watchlist/{item_id}` - Remove from watchlist

### Content Ideas
- `GET /api/content/ideas` - Get AI-generated content ideas

### Configuration
- `GET /api/config/sources` - Get available data sources
- `POST /api/config/sources` - Update source configuration
- `GET /api/config/platform-settings` - Get platform settings

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token

### Export
- `GET /api/export/trends` - Export trends (CSV/JSON)
- `GET /api/export/report` - Generate trend report

### WebSocket
- `WS /ws/trends` - Live trend updates (with filtering)
- `WS /ws/alerts` - Real-time alert notifications

---

## 🎨 Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard** | `/dashboard` | Main trending topics display with real-time updates |
| **Trends Detail** | `/trends/[id]` | Detailed view of a specific trend with history & analysis |
| **Watchlist** | `/watchlist` | Saved trends and monitoring list |
| **Alerts** | `/alerts` | Alert configuration and management |
| **History** | `/history` | Timeline view of all trends |
| **Settings** | `/settings` | User preferences and source configuration |
| **Status** | `/status` | Service health and metrics |
| **Login** | `/login` | User authentication |

---

## 🔧 Development

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_services.py -v

# Run with coverage
pytest --cov=app tests/
```

### Code Quality

```bash
# Lint backend code
pylint app/

# Format code
black app/

# Frontend linting
cd frontend
npm run lint
```

### Development Mode

**Backend** with auto-reload:
```bash
python main.py --reload
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** with hot reload:
```bash
cd frontend
npm run dev
```

### Debugging

**Backend**:
- Set breakpoints in your IDE
- Use `print()` or `logger.info()` for logging
- Check logs in terminal output

**Frontend**:
- Use React Developer Tools browser extension
- Use Network tab in browser DevTools for API debugging
- WebSocket frames visible in DevTools

---

## 🚢 Deployment

### Render (Backend)

1. **Connect Repository**
   - Push code to GitHub
   - Go to [render.com](https://render.com)
   - Create new Web Service from GitHub repo

2. **Configure**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
   - Environment: Python 3.11

3. **Set Environment Variables**
   - Navigate to Environment in Render dashboard
   - Add all variables from `.env.example`

4. **Deploy**
   ```bash
   git push  # Auto-deploys with Render integration
   ```

### Vercel (Frontend)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Select `frontend` as root directory

2. **Configure**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Framework: Next.js

3. **Set Environment Variables**
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL

4. **Deploy**
   ```bash
   git push  # Auto-deploys with Vercel integration
   ```

### Docker Deployment

**Backend Dockerfile**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build & Run**:
```bash
docker build -t trend-intelligence-backend .
docker run -p 8000:8000 --env-file .env trend-intelligence-backend
```

### Database Migration

For Supabase PostgreSQL:
```bash
# Create tables using SQL schema from your database setup
# Or use SQLAlchemy models:
python -c "from app.database import Base, engine; Base.metadata.create_all(engine)"
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Make** your changes with clear commit messages
4. **Test** your changes thoroughly
5. **Push** to your fork: `git push origin feature/your-feature`
6. **Open** a Pull Request with description of changes

### Code Style
- **Backend**: Follow PEP 8, use Black formatter
- **Frontend**: Follow ESLint config, use Prettier

### Commit Messages
- Use clear, descriptive messages
- Format: `type(scope): description`
- Examples: `feat(trends): add semantic search`, `fix(alerts): email notification bug`

---

## 📊 API Response Examples

### Get Trends
```json
{
  "trends": [
    {
      "cluster_id": "trend_123",
      "title": "Python 3.12 Release",
      "score": 0.95,
      "momentum": 0.87,
      "source": ["github", "hackernews"],
      "posts_count": 342,
      "last_seen": "2024-05-24T10:30:00Z"
    }
  ],
  "total": 45,
  "cached": true
}
```

### Trend Summary
```json
{
  "cluster_id": "trend_123",
  "title": "Python 3.12 Release",
  "summary": "Python 3.12 brings significant performance improvements...",
  "key_points": [
    "50% faster performance in some scenarios",
    "Better type checking support",
    "Improved error messages"
  ],
  "sentiment": "positive"
}
```

---

## 📈 Performance Optimization

### Caching Strategy
- Trends cached for 5 minutes
- Search results cached for 1 hour
- User preferences cached per session

### Database Optimization
- Indexes on frequently queried columns
- Batch processing for bulk inserts
- Connection pooling with asyncpg

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization with Next.js Image
- Memoization for expensive computations

---

## 🔍 Monitoring & Logging

### Logging
- Backend logs to stdout/stderr
- Configure log level in `app/config.py`
- All API requests logged with timing

### Health Checks
- `/health` - Basic health status
- `/ready` - Readiness for traffic (checks DB & cache)
- `/api/status/` - Detailed metrics

### Metrics Tracked
- API response times
- Cache hit rates
- Database query times
- WebSocket connections
- Error rates by endpoint

---

## 📚 Documentation Files

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup instructions

---

## ❓ Troubleshooting

### Backend Won't Start
- Check Python version: `python --version` (need 3.11+)
- Verify .env file exists and has required keys
- Check if port 8000 is already in use
- Review error logs for specific issues

### Frontend Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is correctly set
- Check backend is running and accessible
- Clear browser cache and cookies
- Check CORS settings in backend config

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check PostgreSQL service is running
- Confirm network connectivity to database
- Check credentials in connection string

### Redis Connection Issues
- Verify Upstash/Redis service is running
- Check `REDIS_URL` in .env
- Ensure Redis connection limits not exceeded
- Review Redis memory usage

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 👥 Support & Contact

For issues, questions, or suggestions:
- Open an [Issue](https://github.com/your-repo/issues) on GitHub
- Check existing documentation
- Review test files for usage examples

---

## 🎯 Roadmap

### Planned Features
- [ ] Advanced ML-based trend prediction
- [ ] Custom trend clustering algorithms
- [ ] Mobile app (React Native)
- [ ] Vector database integration (Pinecone/Weaviate)
- [ ] Advanced analytics dashboard
- [ ] Trend API for third-party integration
- [ ] Browser extension for trend detection

---

**Built with ❤️ using FastAPI, Next.js, and AI-powered analysis**
- Support multi-source ingestion (HN, Google Trends, YouTube)
- User authentication and alerts
- Time-series forecasting
- Advanced monitoring and analytics

