# User Management API Documentation

## Overview
The User Management API provides comprehensive CRUD operations for user profiles in the ArtistHub platform. It integrates with DynamoDB for persistent storage and supports complex user data structures including profiles, portfolios, work experience, and connections.

## Database Schema

### Users Table
- **Primary Key:** `userId` (UUID)
- **Global Secondary Index:** `usernameIndex` on `username`
- **Table Name:** `task-api-v1-users-{stage}`

### User Object Structure

```typescript
{
  userId: string (UUID),                    // Unique identifier
  username: string (unique),                // Username for login
  email: string,                            // Email address
  privacy: "public|private|semi-private",   // Profile privacy level
  currentPlan: "free|premium|professional", // Current subscription plan
  view: number,                             // View count (increments)
  aboutMe: string,                          // User bio
  device_tokens: string[],                  // Push notification tokens
  subscription: {
    activePlan: string,
    startDate: ISO date,
    renewalDate: ISO date,
    status: "active|inactive|cancelled"
  },
  tokens: {
    AccessToken: string,
    RefreshToken: string,
    IdToken: string
  },
  basicDetails: {
    firstName: string,
    lastName: string,
    fullName: string,
    avatarUrl: string,
    gender: "Male|Female|Other|Prefer not to say",
    category: string[],  // e.g., ["Actor", "Singer", "Dancer"]
    birthDate: ISO date,
    age: number,
    city: string
  },
  contactDetails: {
    email: string,
    phone: string,
    instagram: string,
    facebook: string,
    twitter: string,
    youtube: string
  },
  physicalStats: {
    height: string,      // e.g., "180cm"
    weight: string,      // e.g., "75kg"
    bust: string,
    waist: string,
    hips: string,
    chest: string,
    biceps: string,
    hairType: string,
    hairLength: string
  },
  skills: {
    languages: string[],
    expertise: string[],
    hobbies: string[]
  },
  workExperience: [{
    id: string (UUID),
    workType: "Exhibition|Commission|Performance|Project",
    brand: string,
    verified: boolean,
    workLink: string (URL),
    createdAt: ISO date
  }],
  portfolio: [{
    id: string (UUID),
    url: string,
    type: "image|video",
    selected: boolean,
    uploadedAt: ISO date
  }],
  appliedJobs: [{
    appId: string (UUID),
    jobId: string (UUID),
    avatarUrl: string
  }],
  requestSent: [{
    connectionId: string (UUID),
    userId: string (UUID),
    chatId: string (UUID)
  }],
  requestReceived: [{
    connectionId: string (UUID),
    userId: string (UUID),
    chatId: string (UUID)
  }],
  connections: [{
    connectionId: string (UUID),
    senderId: string (UUID),
    receiverId: string (UUID),
    chatId: string (UUID),
    connectionStatus: "pending|connected|rejected",
    connectedAt: ISO date
  }],
  createdAt: ISO date,
  updatedAt: ISO date
}
```

## API Endpoints

### 1. Create User
**Endpoint:** `POST /users`  
**Description:** Create a new user profile  
**Authentication:** Not required

**Request Body:**
```json
{
  "username": "john_artist",
  "email": "john@example.com",
  "privacy": "public",
  "currentPlan": "free",
  "aboutMe": "Professional actor and dancer",
  "basicDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "gender": "Male",
    "category": ["Actor", "Dancer"],
    "birthDate": "1995-05-15",
    "age": 29,
    "city": "Mumbai"
  },
  "contactDetails": {
    "phone": "+919876543210",
    "instagram": "john_artist",
    "facebook": "john.doe.artist"
  },
  "physicalStats": {
    "height": "180cm",
    "weight": "75kg",
    "chest": "40in"
  },
  "skills": {
    "languages": ["English", "Hindi", "Marathi"],
    "expertise": ["Classical Dance", "Contemporary"],
    "hobbies": ["Photography", "Painting"]
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": { ...user object }
}
```

**Error Responses:**
- `400` - Missing required fields
- `409` - Username already exists
- `500` - Server error

---

### 2. Get User by ID
**Endpoint:** `GET /users/{userId}`  
**Description:** Retrieve user profile by userId  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "user": { ...user object }
}
```

**Error Responses:**
- `400` - Missing userId
- `404` - User not found
- `500` - Server error

---

### 3. Get User by Username
**Endpoint:** `GET /users/username/{username}`  
**Description:** Retrieve user profile by username  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "user": { ...user object }
}
```

**Error Responses:**
- `400` - Missing username
- `404` - User not found
- `500` - Server error

---

### 4. Update User
**Endpoint:** `PUT /users/{userId}`  
**Description:** Update user profile (partial update)  
**Authentication:** Not required

**Request Body:** (All fields optional)
```json
{
  "privacy": "semi-private",
  "currentPlan": "premium",
  "aboutMe": "Updated bio",
  "basicDetails": {
    "firstName": "Jane",
    "city": "Bangalore"
  },
  "skills": {
    "languages": ["English", "Hindi", "Tamil"]
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": { ...updated user object }
}
```

**Error Responses:**
- `400` - No fields to update / Missing userId
- `404` - User not found
- `409` - Username already exists (if updating username)
- `500` - Server error

---

### 5. Delete User
**Endpoint:** `DELETE /users/{userId}`  
**Description:** Permanently delete user profile  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "deletedUserId": "user-uuid"
}
```

**Error Responses:**
- `400` - Missing userId
- `404` - User not found
- `500` - Server error

---

### 6. List All Users (Paginated)
**Endpoint:** `GET /users?limit=10&lastKey=encodedKey`  
**Description:** Retrieve paginated list of all users  
**Authentication:** Not required

**Query Parameters:**
- `limit` (optional, default: 10) - Number of items per page
- `lastKey` (optional) - Base64-encoded last evaluated key for pagination

**Success Response (200):**
```json
{
  "success": true,
  "items": [ ...user objects ],
  "count": 10,
  "lastKey": "base64encodedkey"
}
```

**Error Responses:**
- `500` - Server error

---

### 7. Increment User View Count
**Endpoint:** `PUT /users/{userId}/view`  
**Description:** Increment view count for a user profile  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "message": "User view incremented",
  "view": 42
}
```

**Error Responses:**
- `400` - Missing userId
- `500` - Server error

---

### 8. Add Work Experience
**Endpoint:** `POST /users/{userId}/work-experience`  
**Description:** Add work experience entry to user profile  
**Authentication:** Not required

**Request Body:**
```json
{
  "workType": "Exhibition",
  "brand": "National Art Gallery",
  "workLink": "https://example.com/exhibition",
  "verified": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Work experience added",
  "workExperience": {
    "id": "uuid",
    "workType": "Exhibition",
    "brand": "National Art Gallery",
    "verified": true,
    "workLink": "https://example.com/exhibition",
    "createdAt": "2024-01-29T10:30:00Z"
  },
  "user": { ...updated user object }
}
```

**Error Responses:**
- `400` - Missing required fields / Missing userId
- `404` - User not found
- `500` - Server error

---

### 9. Add Portfolio Item
**Endpoint:** `POST /users/{userId}/portfolio`  
**Description:** Add portfolio item (image or video) to user profile  
**Authentication:** Not required

**Request Body:**
```json
{
  "url": "https://example.com/portfolio/image.jpg",
  "type": "image",
  "selected": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Portfolio item added",
  "portfolioItem": {
    "id": "uuid",
    "url": "https://example.com/portfolio/image.jpg",
    "type": "image",
    "selected": true,
    "uploadedAt": "2024-01-29T10:30:00Z"
  },
  "user": { ...updated user object }
}
```

**Error Responses:**
- `400` - Missing required fields / Missing userId
- `404` - User not found
- `500` - Server error

---

### 10. Add Connection
**Endpoint:** `POST /users/{userId}/connections`  
**Description:** Create connection request between users  
**Authentication:** Not required

**Request Body:**
```json
{
  "senderId": "sender-uuid",
  "receiverId": "receiver-uuid"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Connection added",
  "connection": {
    "connectionId": "uuid",
    "senderId": "sender-uuid",
    "receiverId": "receiver-uuid",
    "chatId": "chat-uuid",
    "connectionStatus": "pending",
    "connectedAt": "2024-01-29T10:30:00Z"
  },
  "user": { ...updated user object }
}
```

**Error Responses:**
- `400` - Missing required fields / Missing userId
- `404` - User not found
- `500` - Server error

---

### 11. Search Users
**Endpoint:** `GET /users/search?q=query&type=category&limit=10`  
**Description:** Search users by category, skills, or username  
**Authentication:** Not required

**Query Parameters:**
- `q` (required) - Search query
- `type` (optional, default: category) - Search type: "category", "skills", or "username"
- `limit` (optional, default: 10) - Number of results

**Example Requests:**
```
GET /users/search?q=Actor&type=category&limit=10
GET /users/search?q=john_artist&type=username&limit=5
GET /users/search?q=Photography&type=skills&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "query": "Actor",
  "type": "category",
  "count": 5,
  "items": [ ...user objects ]
}
```

**Error Responses:**
- `400` - Missing query parameter / Invalid search type
- `500` - Server error

---

## Implementation Notes

### Type Safety
A TypeScript type definition file is available at `src/types/user.types.ts` for type-safe implementations.

### Response Headers
All responses include CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
Content-Type: application/json
```

### Timestamps
All date fields use ISO 8601 format: `2024-01-29T10:30:00Z`

### Pagination
The `listUsers` endpoint returns a `lastKey` token that can be used for pagination:
```
GET /users?limit=10&lastKey={base64encodedkey}
```

### Search Performance
The search endpoint uses DynamoDB Scan with filters. For production with large datasets, consider:
- Using ElasticSearch
- Creating additional Global Secondary Indexes
- Implementing a dedicated search service

### UUID Generation
User IDs and nested item IDs (portfolio, connections, etc.) are auto-generated using UUID v4.

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error message",
  "details": "Additional error details"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict (duplicate username, etc.)
- `500` - Server Error

## Deployment

Install dependencies:
```bash
npm install
```

Deploy to AWS:
```bash
serverless deploy --stage dev
```

## Environment Variables

Required:
- `REGION` - AWS region (default: ap-south-1)
- `USERS_TABLE` - DynamoDB Users table name (auto-set)

Optional:
- `STAGE` - Deployment stage (dev, prod, etc.)
