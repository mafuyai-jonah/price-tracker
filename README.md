# README.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

BIZ BOOK is a full-stack e-commerce platform that connects shoppers with vendors for price comparison and business management. The platform serves two primary user types: **Shoppers** (price comparison, watchlists, alerts) and **Vendors** (product management, analytics, sales reports).

## Development Commands

### Backend (Node.js/Express + PostgreSQL)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Development with auto-reload
npm run dev

# Production start
npm start

# Database migrations (run in order)
node migrate-users-table.js
node migrate-vendors-table.js
node migrate-products-table.js
node migrate-reviews-table.js
node create-wishlist-table.js
node migrate-comparisons-table.js
node migrate-shoppers-table.js
node migrate-sales-reports-table.js
node migrate-product-images.js
node migrate-search-system.js
```

### Frontend (React + Vite + Tailwind)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Full Stack Development

```bash
# Start both backend and frontend in development mode
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### Testing Single Components

The frontend uses React components extensively. To test individual components:

```bash
# Frontend development server allows hot-reload testing of components
cd frontend && npm run dev

# Navigate to specific routes to test components:
# http://localhost:5173/ - Homepage
# http://localhost:5173/signup - Signup choice
# http://localhost:5173/login - Login
# http://localhost:5173/vendor/dashboard - Vendor dashboard
# http://localhost:5173/shopper/dashboard - Shopper dashboard
# http://localhost:5173/search - Advanced Product Search (main search)
```

## Architecture Overview

### Backend Architecture (Express.js + PostgreSQL)

**Main Entry Point**: `backend/index.js`
- Comprehensive security setup (helmet, rate limiting, CORS, input validation)
- Modular route structure in `backend/routes/`
- Database abstraction in `backend/utils.js`
- JWT-based authentication with role-based access control

**Route Structure**:
- `routes/auth.js` - Authentication (login, signup, profile management)
- `routes/products.js` - Product CRUD operations
- `routes/search.js` - Advanced search system (suggestions, history, analytics)
- `routes/vendor.js` - Vendor-specific functionality (analytics, sales reports)
- `routes/shopper.js` - Shopper-specific functionality (watchlists, price alerts)

**Database Design**:
- PostgreSQL with separate migration files for each table
- Core tables: users, vendors, products, reviews, wishlist, comparisons, sales_reports
- Search system tables: search_history, search_suggestions, popular_searches, saved_searches, search_analytics
- Foreign key relationships maintaining data integrity
- Support for both user types with role-based data access

### Frontend Architecture (React + Context API)

**Main Entry Point**: `frontend/src/main.jsx` → `App.jsx`

**State Management**: 
- `UserContext.jsx` - Global authentication state with localStorage persistence
- Context provides user data, authentication status, login/logout functions
- Automatic token verification and session management

**Component Structure** (all in `frontend/src/components/`):
- **Authentication**: `SignupChoice.jsx`, `SignupVendor.jsx`, `SignupShopper.jsx`, `Login.jsx`
- **Dashboards**: `VendorDashboard.jsx`, `ShopperDashboard.jsx` (role-based home screens)
- **Core Features**: `AdvancedProductSearch.jsx`, `VendorProductManager.jsx`, `Watchlist.jsx`
- **Advanced Features**: `SmartPriceAlerts.jsx`, `SmartComparison.jsx`, `SocialShopping.jsx`
- **Analytics**: `VendorAnalytics.jsx`, `VendorSalesReport.jsx`
- **User Management**: `UserProfile.jsx`

**Routing Pattern**:
- Role-based route protection
- Dynamic routing based on user type (vendor vs shopper)
- Mobile-responsive navigation with `MobileMenu` component

### Key Architectural Patterns

1. **Dual User System**: Every feature is designed around shopper vs vendor user types
2. **Security-First Backend**: Comprehensive input validation, rate limiting, SQL injection prevention
3. **Context-Based State**: Centralized user state with localStorage persistence
4. **Component Composition**: Modular React components with clear separation of concerns
5. **API-First Design**: RESTful API structure with consistent error handling

## Database Relationships

The platform uses a relational database with these key relationships:
- `users` → `vendors` (1:1) - Vendor profile data
- `vendors` → `products` (1:many) - Vendor's product catalog  
- `users` → `reviews` (1:many) - User reviews
- `users` → `wishlist` (1:many) - Shopper saved items
- Cross-vendor price `comparisons` for shopper decision-making

## Environment Setup

**Backend Environment** (`.env`):
```
PORT=3001
JWT_SECRET=your_jwt_secret_key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=biz_book
DB_USER=your_db_user
DB_PASSWORD=your_db_password
NODE_ENV=development
```

**Frontend Configuration**: 
- API base URL configured in `src/config.js` 
- Development server runs on port 5173 (Vite default)
- Backend expects frontend on localhost:5173 for CORS

## Security Implementation

The backend implements enterprise-grade security:
- **Input Validation**: validator.js for email/input sanitization
- **SQL Injection Prevention**: Parameterized queries throughout
- **Authentication**: JWT tokens with expiration
- **Rate Limiting**: Different limits for auth vs general endpoints
- **Password Security**: bcrypt with 12 salt rounds
- **Headers Security**: Helmet.js with CSP
- **XSS Protection**: Input sanitization and secure headers

## Key Features by User Type

### Vendors
- Product catalog management (CRUD)
- Sales analytics and reporting  
- Customer review management
- Business profile management 
- Inventory tracking

### Shoppers
- Advanced product search with intelligent filtering and suggestions
- Price comparison across vendors
- Watchlist for tracking favorite products
- Smart price alerts and notifications
- Social shopping features (reviews, community)

## Development Notes

- **Hot Reload**: Both frontend (Vite) and backend (nodemon) support hot reload
- **Database Migrations**: Run migration files manually in the specified order
- **API Testing**: Backend includes `/health` endpoint for connectivity testing
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Mobile Responsive**: Frontend designed mobile-first with responsive navigation
- **Performance**: Lazy loading, component optimization, and efficient state management

## Common Development Patterns

When adding new features:
1. **Backend**: Add route in appropriate file (`routes/`), update database schema if needed
2. **Frontend**: Create component in `components/`, add to routing in `App.jsx`
3. **Authentication**: Use `authenticateToken` middleware for protected routes
4. **User Type Logic**: Check `user.user_type` for role-based functionality
5. **Error Handling**: Follow existing patterns with try/catch and user-friendly messages
