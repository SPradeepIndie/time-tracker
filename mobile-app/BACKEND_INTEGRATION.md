# Mobile App - Backend Integration

## 🔌 Backend Connection

The mobile app is now integrated with your Go backend API running on `localhost:8080`.

### API Endpoints Used

- `GET /trackers` - Fetch all tracks
- `GET /trackers/{id}` - Get track by ID
- `POST /trackers` - Create new track
- `PUT /trackers/{id}` - Update track
- `DELETE /trackers/{id}` - Delete track
- `GET /health` - Health check

## 📁 Architecture

### Data Flow
```
Mobile App UI 
  ↕️
TrackContext (State Management)
  ↕️
API Service (HTTP Requests)
  ↕️
Track Mapper (Data Transformation)
  ↕️
Go Backend (localhost:8080)
  ↕️
PostgreSQL Database
```

### Key Files

1. **`/services/api.ts`** - HTTP client for backend API
2. **`/utils/trackMapper.ts`** - Converts between frontend and backend data models
3. **`/context/TrackContext.tsx`** - State management with API integration
4. **`/config/api.ts`** - API configuration (change URL here)

## 🔄 Data Mapping

Your backend uses a simple `task` string field, so we encode the frontend data structure into it:

**Backend Format:**
```json
{
  "id": 1,
  "task": "Task Title | Description | STATUS:pending | PRIORITY:medium | TAGS:tag1,tag2",
  "start_time": "2025-12-02T10:00:00Z",
  "end_time": null
}
```

**Frontend Format:**
```json
{
  "id": 1,
  "title": "Task Title",
  "description": "Description",
  "status": "pending",
  "priority": "medium",
  "tags": ["tag1", "tag2"],
  "startTime": "2025-12-02T10:00:00Z",
  "endTime": null
}
```

## ⚙️ Configuration

### For Different Environments

Edit `/config/api.ts`:

**Web / iOS Simulator:**
```typescript
BASE_URL: 'http://localhost:8080'
```

**Android Emulator:**
```typescript
BASE_URL: 'http://10.0.2.2:8080'
```

**Physical Device:**
```typescript
BASE_URL: 'http://YOUR_COMPUTER_IP:8080'
```

To find your IP:
- **Mac/Linux:** `ifconfig | grep inet`
- **Windows:** `ipconfig`

## 🚀 Features

- ✅ Real-time CRUD operations with backend
- ✅ Pull-to-refresh to sync data
- ✅ Loading states
- ✅ Error handling
- ✅ Automatic data transformation
- ✅ No local storage needed (server is source of truth)

## 🧪 Testing

1. **Start your backend:**
   ```bash
   cd backend
   go run api/cmd/main.go
   ```

2. **Start the mobile app:**
   ```bash
   cd mobile-app
   npm start
   ```

3. **Test the connection:**
   - Create a new track - should appear in backend
   - Refresh the list - should fetch from backend
   - Update/delete - should reflect on backend

## 🐛 Troubleshooting

**"Failed to load tracks":**
- Check if backend is running on port 8080
- Verify the BASE_URL in `/config/api.ts`
- Check network connectivity
- For Android: use `10.0.2.2` instead of `localhost`
- For physical device: use your computer's IP address

**CORS errors (web only):**
- Backend needs to allow CORS from your frontend origin
- Add CORS middleware to your Go backend

## 📝 Notes

- All data is stored on the backend PostgreSQL database
- The app fetches fresh data on startup and on pull-to-refresh
- Changes are immediately synced to the backend
- No offline mode currently (requires backend connection)
