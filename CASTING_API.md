# Casting/Job Management API Documentation

## Overview
The Casting Management API provides comprehensive CRUD operations for casting jobs in the ArtistHub platform. It integrates with DynamoDB for persistent storage and supports complex job postings with applications, documents, and recruiter information.

## Database Schema

### Casting Table
- **Primary Key:** `jobId` (UUID)
- **Table Name:** `task-api-v1-casting-{stage}`
- **Billing:** PAY_PER_REQUEST (auto-scaling)

### Casting Job Object Structure

```typescript
{
  jobId: string (UUID),                     // Unique identifier
  userId: string (UUID),                    // Casting director/recruiter ID
  jobTitle: string,                         // Job title
  jobDescription: string,                   // Detailed description
  jobCategory: string,                      // Category (Acting, Singing, etc.)
  jobType: "Online|Offline",                // Job type
  jobLocation: string[],                    // Locations (for offline jobs)
  tags: string[],                           // Search tags
  view: number,                             // View count
  verified: boolean,                        // Verification status
  isExpired: boolean,                       // Expiry status
  isCollab: boolean,                        // Collaboration flag
  isWishlisted: boolean,                    // Wishlist flag
  imageUrl: string,                         // Poster/image URL
  expiryDate: ISO date,                     // Job expiry date
  applicationStatus: 0|1|2,                 // Status (0=Not Applied, 1=Applied, 2=Shortlisted)
  appliedBy: [{
    userId: string (UUID),
    appId: string (UUID),
    avatarUrl: string,
    status: 0|1|2
  }],
  recruiter: [{
    name: string,
    productionHouse: string,
    url: string
  }],
  requirements: [{
    gender: "Male|Female|Any",
    minAge: number,
    maxAge: number
  }],
  documents: [{
    id: string (UUID),
    url: string,
    type: "pdf|image|video|script"
  }],
  createdAt: ISO date,
  updatedAt: ISO date
}
```

## API Endpoints

### 1. Create Casting Job
**Endpoint:** `POST /casting`  
**Description:** Create a new casting job  
**Authentication:** Not required

**Request Body:**
```json
{
  "userId": "recruiter-uuid",
  "jobTitle": "Lead Actor for Short Film",
  "jobDescription": "Looking for experienced actor for lead role",
  "jobCategory": "Acting",
  "jobType": "Offline",
  "jobLocation": ["Mumbai", "Delhi"],
  "tags": ["drama", "short-film", "lead"],
  "imageUrl": "https://example.com/poster.jpg",
  "expiryDate": "2024-03-31T23:59:59Z",
  "isCollab": false,
  "recruiter": [{
    "name": "John Productions",
    "productionHouse": "ABC Films",
    "url": "https://abc-films.com"
  }],
  "requirements": [{
    "gender": "Male",
    "minAge": 25,
    "maxAge": 40
  }]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Casting job created successfully",
  "job": { ...job object }
}
```

---

### 2. Get Job by ID
**Endpoint:** `GET /casting/{jobId}`  
**Description:** Retrieve casting job by jobId  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "job": { ...job object }
}
```

---

### 3. List All Casting Jobs (Paginated)
**Endpoint:** `GET /casting?limit=10&lastKey={lastKey}&category=Acting`  
**Description:** Retrieve paginated list of all casting jobs  
**Authentication:** Not required

**Query Parameters:**
- `limit` (optional, default: 10)
- `lastKey` (optional) - Base64-encoded pagination token
- `category` (optional) - Filter by job category

**Success Response (200):**
```json
{
  "success": true,
  "items": [ ...job objects ],
  "count": 10,
  "lastKey": "base64encodedkey"
}
```

---

### 4. Update Casting Job
**Endpoint:** `PUT /casting/{jobId}`  
**Description:** Update job details (partial update)  
**Authentication:** Not required

**Request Body:** (All fields optional)
```json
{
  "jobTitle": "Updated Title",
  "jobDescription": "Updated description",
  "verified": true,
  "isExpired": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job updated successfully",
  "job": { ...updated job object }
}
```

---

### 5. Delete Casting Job
**Endpoint:** `DELETE /casting/{jobId}`  
**Description:** Permanently delete casting job  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job deleted successfully",
  "deletedJobId": "job-uuid"
}
```

---

### 6. Apply for Job
**Endpoint:** `POST /casting/{jobId}/apply`  
**Description:** Submit application for a casting job  
**Authentication:** Not required

**Request Body:**
```json
{
  "userId": "applicant-uuid",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "application": {
    "userId": "applicant-uuid",
    "appId": "app-uuid",
    "avatarUrl": "https://example.com/avatar.jpg"
  },
  "job": { ...job object }
}
```

**Error Responses:**
- `409` - User has already applied for this job

---

### 7. Get Job Applications
**Endpoint:** `GET /casting/{jobId}/applications`  
**Description:** Retrieve all applications for a specific job  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "jobId": "job-uuid",
  "applications": [ ...application objects ],
  "count": 15
}
```

---

### 8. Update Application Status
**Endpoint:** `PUT /casting/{jobId}/applications/{userId}`  
**Description:** Update application status (recruiter action)  
**Authentication:** Not required

**Request Body:**
```json
{
  "status": 2
}
```

**Status Codes:**
- `0` - Not Applied
- `1` - Applied
- `2` - Shortlisted

**Success Response (200):**
```json
{
  "success": true,
  "message": "Application status updated",
  "job": { ...job object }
}
```

---

### 9. Increment Job View Count
**Endpoint:** `PUT /casting/{jobId}/view`  
**Description:** Increment view counter for a job  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job view incremented",
  "view": 42
}
```

---

### 10. Add Document to Job
**Endpoint:** `POST /casting/{jobId}/documents`  
**Description:** Add document (script, photos, etc.) to job posting  
**Authentication:** Not required

**Request Body:**
```json
{
  "url": "https://example.com/script.pdf",
  "type": "pdf"
}
```

**Document Types:** `pdf`, `image`, `video`, `script`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Document added",
  "document": {
    "id": "doc-uuid",
    "url": "https://example.com/script.pdf",
    "type": "pdf"
  },
  "job": { ...job object }
}
```

---

### 11. Remove Document from Job
**Endpoint:** `DELETE /casting/{jobId}/documents/{docId}`  
**Description:** Remove a document from job posting  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Document removed",
  "job": { ...job object }
}
```

---

### 12. Get User Applications
**Endpoint:** `GET /casting/user/{userId}/applications`  
**Description:** Retrieve all applications submitted by a specific user  
**Authentication:** Not required

**Success Response (200):**
```json
{
  "success": true,
  "userId": "user-uuid",
  "applications": [{
    "userId": "user-uuid",
    "appId": "app-uuid",
    "avatarUrl": "string",
    "jobId": "job-uuid",
    "jobTitle": "Lead Actor for Short Film",
    "jobCategory": "Acting"
  }],
  "count": 5
}
```

---

### 13. Search Casting Jobs
**Endpoint:** `GET /casting/search?q=query&type=category&limit=10`  
**Description:** Search jobs by category, title, location, or tags  
**Authentication:** Not required

**Query Parameters:**
- `q` (required) - Search query
- `type` (optional, default: category) - Search type: "category", "title", "location", or "tags"
- `limit` (optional, default: 10)

**Example Requests:**
```
GET /casting/search?q=Acting&type=category&limit=10
GET /casting/search?q=Lead&type=title&limit=10
GET /casting/search?q=Mumbai&type=location&limit=10
GET /casting/search?q=drama&type=tags&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "query": "Acting",
  "type": "category",
  "count": 5,
  "items": [ ...job objects ]
}
```

---

## Valid Enum Values

### Job Categories
- Acting
- Singing
- Dancing
- Modeling
- Writing
- Editing
- Photography
- Makeup
- Voice Acting
- Comedy
- Production
- Design

### Job Types
- Online
- Offline

### Document Types
- pdf
- image
- video
- script

### Application Status
- 0: Not Applied
- 1: Applied
- 2: Shortlisted

### Gender
- Male
- Female
- Any

---

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
- `409` - Conflict (duplicate application, etc.)
- `500` - Server Error

---

## Best Practices

1. **Job Expiry** - Always set `expiryDate` when creating long-term jobs
2. **Verification** - Only verified recruiters should have `verified: true`
3. **Image URLs** - Use CDN URLs for poster images for better performance
4. **Documents** - Include relevant documents (scripts, reference videos) for better applications
5. **Locations** - Provide specific locations for offline jobs
6. **Requirements** - Set clear gender and age requirements to attract right candidates

---

## Response Headers

All responses include CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
Content-Type: application/json
```

---

## Timestamps

All date fields use ISO 8601 format: `2024-01-29T10:30:00Z`

---

## Deployment

Install dependencies:
```bash
npm install
```

Deploy to AWS:
```bash
serverless deploy --stage dev
```

---

## Environment Variables

Required:
- `REGION` - AWS region (default: ap-south-1)
- `CASTING_TABLE` - DynamoDB Casting table name (auto-set)

Optional:
- `STAGE` - Deployment stage (dev, prod, etc.)
