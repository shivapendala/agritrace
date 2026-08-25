# AgriTrace API Specification

## Health Endpoint
- `GET /api/v1/health` - Check backend service and PostgreSQL database status

## Authentication & User Management
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - Authenticate & obtain JWT tokens
- `GET /api/v1/auth/me` - Current authenticated user profile
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/users` - User directory (SUPER_ADMIN)
