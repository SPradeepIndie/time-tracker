# Time Tracker API Documentation

This document describes the REST API endpoints for the Time Tracker application.

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication
- **User Endpoints**: OAuth2 Bearer Token
- **Admin Endpoints**: OAuth2 Bearer Token with admin role

## User Endpoints (Mobile App)

### Time Tracking

#### Get User's Time Entries
```
GET /user/trackers
```
**Description**: Retrieve all time tracking entries for the authenticated user.

**Response**: Array of time tracking entries

#### Create Time Entry
```
POST /user/trackers
```
**Description**: Create a new time tracking entry.

**Request Body**:
```json
{
  "task": "Development work",
  "startTime": "2025-10-09T09:00:00Z",
  "endTime": "2025-10-09T17:00:00Z"
}
```

#### Update Time Entry
```
PUT /user/trackers/{id}
```
**Description**: Update an existing time tracking entry.

#### Delete Time Entry
```
DELETE /user/trackers/{id}
```
**Description**: Delete a time tracking entry.

### User Profile

#### Get User Profile
```
GET /user/profile
```
**Description**: Get the authenticated user's profile information.

#### Update User Profile
```
PUT /user/profile
```
**Description**: Update the authenticated user's profile.

## Admin Endpoints (Web Dashboard)

### User Management

#### Get All Users
```
GET /admin/users
```
**Description**: Retrieve all users in the system.

#### Create User
```
POST /admin/users
```
**Description**: Create a new user account.

#### Update User
```
PUT /admin/users/{id}
```
**Description**: Update user information.

#### Deactivate User
```
DELETE /admin/users/{id}
```
**Description**: Deactivate a user account.

### Reports & Analytics

#### Generate Time Reports
```
GET /admin/reports/time
```
**Description**: Generate time tracking reports.

**Query Parameters**:
- `startDate`: Start date for the report
- `endDate`: End date for the report
- `userId`: Filter by specific user (optional)
- `format`: Report format (json, csv, pdf)

#### Get Analytics Data
```
GET /admin/analytics
```
**Description**: Retrieve productivity analytics and insights.

### System Management

#### System Health Check
```
GET /admin/system/health
```
**Description**: Check system health and status.

#### Get System Configuration
```
GET /admin/system/config
```
**Description**: Retrieve system configuration settings.

#### Update System Configuration
```
PUT /admin/system/config
```
**Description**: Update system configuration settings.

## AI Endpoints

### Recommendations

#### Get AI Recommendations
```
GET /ai/recommendations/{userId}
```
**Description**: Get AI-generated productivity recommendations for a user.

#### Generate Weekly Plan
```
POST /ai/weekly-plan/{userId}
```
**Description**: Generate an AI-powered weekly work plan.

## Error Responses

All endpoints return standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a JSON object with error details:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

## Rate Limiting

- **User endpoints**: 100 requests per minute
- **Admin endpoints**: 200 requests per minute
- **AI endpoints**: 10 requests per minute

For detailed request/response schemas, see the [OpenAPI specification](../openapi/timetracker-api.yaml).
