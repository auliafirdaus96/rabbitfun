# 🚀 Rabbit Launchpad Backend API

Backend API for Rabbit Launchpad that provides endpoints for managing token metadata, analytics, and other features. This backend is integrated with exponential bonding curve smart contracts.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Redis (optional, for caching)
- npm or yarn

### Installation

1. Clone repository
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies
```bash
npm install
```

3. Setup database
```bash
# PostgreSQL setup
createdb rabbit_launchpad
psql rabbit_launchpad < schema.sql
```

4. Environment configuration
```bash
cp .env.example .env
```

5. Edit `.env` file:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/rabbit_launchpad"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001
NODE_ENV=development
REDIS_URL="redis://localhost:6379"
```

6. Run database migrations
```bash
npm run migrate
```

## 🗂️ Project Structure

```
backend/
├── src/
│   ├── server.ts           # Main server entry point
│   ├── services/           # Business logic services
│   │   ├── tokenService.ts
│   │   ├── userService.ts
│   │   └── analyticsService.ts
│   ├── utils/              # Utility functions
│   │   ├── database.ts
│   │   └── middleware.ts
│   ├── routes/             # API routes
│   │   ├── tokens.ts
│   │   ├── users.ts
│   │   └── analytics.ts
│   ├── models/             # Database models
│   └── websocket/          # WebSocket handlers
├── prisma/                 # Prisma ORM
├── tests/                  # Test files
└── package.json
```

## 🚀 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run websocket    # Start WebSocket server
npm run test         # Run tests
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Tokens
- `GET /api/tokens` - Get all tokens
- `GET /api/tokens/:address` - Get token by address
- `POST /api/tokens` - Create new token
- `PUT /api/tokens/:address` - Update token
- `DELETE /api/tokens/:address` - Delete token

### Analytics
- `GET /api/analytics/overview` - Platform overview
- `GET /api/analytics/tokens` - Token analytics
- `GET /api/analytics/users` - User analytics

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id/tokens` - Get user tokens

## 🔌 WebSocket Events

### Connection
- `ws://localhost:8081` - WebSocket server

### Events
- `token_price_update` - Token price updates
- `new_transaction` - New transaction events
- `token_created` - New token created
- `user_activity` - User activity updates

## 🛠️ Technology Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **PostgreSQL** - Primary database
- **Prisma** - ORM
- **Redis** - Caching & session storage
- **Socket.io** - WebSocket implementation
- **JWT** - Authentication
- **TypeScript** - Type safety

## 🔧 Development

### Running Tests
```bash
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage
```

### Code Quality
```bash
npm run lint              # Run ESLint
npm run lint:fix          # Fix linting issues
npm run format            # Format code with Prettier
npm run type-check        # Run TypeScript checks
```

### Database Management
```bash
npm run migrate           # Run database migrations
npm run migrate:rollback  # Rollback migrations
npm run db:seed          # Seed database
npm run db:reset         # Reset database
npm run db:studio        # Open Prisma Studio
```

## 🚀 Deployment

### Environment Variables
```bash
# Required
DATABASE_URL="postgresql://username:password@host:5432/database"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3001

# Optional
REDIS_URL="redis://localhost:6379"
NODE_ENV="production"
LOG_LEVEL="info"
CORS_ORIGIN="http://localhost:8080"
```

### Docker Deployment
```bash
# Build image
docker build -t rabbit-backend .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  rabbit-backend
```

### Production Deployment
```bash
# Build
npm run build

# Start
npm run start
```

## 🔒 Security

- JWT-based authentication
- Input validation and sanitization
- Rate limiting
- CORS configuration
- SQL injection prevention
- XSS protection

## 📝 Logging

Request and response logging with Winston:
- Development: Console output
- Production: File logging
- Error tracking and alerting

## 🧪 Testing

- Unit tests with Jest
- Integration tests for API endpoints
- Database testing with test fixtures
- WebSocket connection testing

## 📈 Monitoring

- Health check endpoint: `GET /api/health`
- Performance metrics
- Error tracking
- Database connection monitoring

---

<div align="center">

**🐰 Rabbit Launchpad Backend**

**Built with ❤️ for the Rabbit Launchpad ecosystem**

</div>