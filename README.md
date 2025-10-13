# Time Tracker Application

A comprehensive time tracking system with Go backend, React web dashboard, and React Native mobile app.

## Project Structure

```
timeTracker/
├── backend/              # Go API server
│   ├── api/              # API handlers, routes, services, repositories
│   │   ├── docs/         # API documentation
│   │   └── openapi/      # OpenAPI specifications
│   ├── db/               # Database connection and configuration
│   ├── migrate/          # Database migration scripts
│   ├── internal/         # Internal packages (config, etc.)
│   ├── logger/           # Logging utilities
│   ├── errorutil/        # Error handling utilities
│   ├── go.mod            # Go module dependencies
│   └── go.sum            # Go module checksums
├── web-dashboard/        # React web admin dashboard
│   ├── public/           # Public assets
│   ├── src/              # React source code
│   ├── package.json      # Node.js dependencies
│   └── tsconfig.json     # TypeScript configuration
├── mobile-app/           # React Native mobile app (Expo)
│   ├── assets/           # App icons and images
│   ├── App.tsx           # Main app component
│   ├── app.json          # Expo configuration
│   ├── package.json      # Node.js dependencies
│   └── tsconfig.json     # TypeScript configuration
└── README.md             # This file
```

## Applications

### Backend API
- **Purpose**: Handles all data operations and business logic
- **Users**: Both web dashboard and mobile app
- **Port**: `http://localhost:8080`
- **Documentation**: [API Documentation](backend/api/docs/README.md)

### Web Dashboard
- **Purpose**: Admin interface for managers and HR
- **Features**: User management, reports, analytics, system settings
- **Port**: `http://localhost:5173`

### Mobile App
- **Purpose**: Daily time tracking for employees
- **Features**: Start/stop timer, view entries, quick logging
- **Platform**: iOS and Android (Expo managed workflow)

## Getting Started

### Backend (Go)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   go mod tidy
   ```

3. Run database migrations:
   ```bash
   cd migrate/cmd
   go run main.go
   ```

4. Start the API server:
   ```bash
   cd ../../api/cmd
   go run main.go
   ```

### Web Dashboard (React + Vite)

1. Navigate to the web dashboard directory:
   ```bash
   cd web-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Mobile App (React Native + Expo)

1. Navigate to the mobile app directory:
   ```bash
   cd mobile-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```

4. Run on device/simulator:
   ```bash
   npm run android  # For Android
   npm run ios      # For iOS (can be run on any platform via Expo Go)
   npm run web      # For web browser testing
   ```

   **Note**: You can also scan the QR code with the Expo Go app on your phone for instant testing.

## Technologies Used

### Backend
- Go
- PostgreSQL
- Standard library HTTP server

### Web Dashboard
- React 18
- TypeScript
- Vite (Build Tool)

### Mobile App
- React Native
- Expo (managed workflow)
- TypeScript

## Development

All three applications can be developed independently:
- **Backend API**: `http://localhost:8080`
- **Web Dashboard**: `http://localhost:5173`
- **Mobile App**: React Native development server
