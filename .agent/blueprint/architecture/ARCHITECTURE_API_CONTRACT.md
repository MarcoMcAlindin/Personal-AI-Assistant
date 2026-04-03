# SuperCyan: API Contract & Response Shapes
**References:** [[ARCHITECTURE_SYSTEM_OVERVIEW|System Architecture]] | [[ARCHITECTURE_DATABASE_SCHEMA|Database Schema]]

This document serves as the binding agreement between [[Mr. Green]] (Cloud Backend implementor) and [[Mr. Blue]] (Frontend consumer). **No implementation agent begins coding against these endpoints until this contract is approved by the CEO.**

All endpoints are prefixed with `/api/v1`.

## 1. Tasks (`/tasks`)

### 1.1 `GET /tasks`
Retrieves a list of tasks for a specified date.
- **Query Params:**
  - `date` (string, required): Format `YYYY-MM-DD` or the literal string `today`.
- **Response (200 OK):**
  ```json
  {
    "tasks": [
      {
        "id": "uuid",
        "date": "2026-03-14",
        "title": "Example task",
        "description": "Task details",
        "duration": 30,
        "time": "14:00",
        "status": "pending",
        "is_archived": false
      }
    ]
  }
  ```

### 1.2 `POST /tasks`
Creates a new task.
- **Request Body:**
  ```json
  {
    "date": "2026-03-14",
    "title": "New Task",
    "description": "Optional text",
    "duration": 60,
    "time": "15:00"
  }
  ```
- **Response (201 Created):** Task object as defined above.

### 1.3 `PATCH /tasks/:id`
Updates an existing task (e.g., marking as complete).
- **Request Body:**
  ```json
  {
    "status": "completed"
  }
  ```
- **Response (200 OK):** Updated task object.


## 2. AI Chat (`/chat`)

### 2.1 `POST /chat`
Sends a message to the AI and establishes a Server-Sent Events (SSE) connection for streaming the response.
- **Request Body:**
  ```json
  {
    "message": "Hello, Qwen"
  }
  ```
- **Response (200 OK, Content-Type: text/event-stream):**
  Streamed text tokens. Concludes with a final JSON event containing the generated `message_id`.

### 2.2 `PATCH /chat/save/:id`
Marks a specific AI response as "saved" (pinned), embedding it permanently into the RAG memory.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "is_saved": true
  }
  ```


## 3. Email Proxy (`/email`)

### 3.1 `GET /email/inbox`
Retrieves a list of recent emails, strictly filtered against the Supabase whitelist.
- **Response (200 OK):**
  ```json
  {
    "emails": [
      {
        "id": "gmail_msg_id",
        "thread_id": "gmail_thread_id",
        "from": "approved@example.com",
        "subject": "Hello",
        "snippet": "Preview text...",
        "date": "ISO8601 string"
      }
    ]
  }
  ```

### 3.2 `GET /email/thread/:id`
Retrieves the full content of an email thread.

### 3.3 `POST /email/send`
Sends an email (Compose, Reply, or Forward).
- **Request Body:**
  ```json
  {
    "to": "approved@example.com",
    "subject": "Hello",
    "body": "HTML or plain text",
    "thread_id": "optional_if_replying"
  }
  ```
- **Response (200 OK):** Success confirmation.


## 4. Feeds (`/feeds`)

### 4.1 `GET /feeds/tech`
Retrieves aggregated AI and tech news.
- **Response (200 OK):** Array of article objects (title, url, source, published_at).

### 4.2 `GET /feeds/concerts`
Retrieves Scottish rock/metal concert listings.
- **Response (200 OK):** Array of concert objects (artist, venue, city, date, ticket_url).


## 5. Health (`/health`)

### 5.1 `POST /health-sync`
Receives raw biometric data from the mobile app (`react-native-health-connect`) on open.
- **Request Body:**
  ```json
  {
    "date": "2026-03-14",
    "water_liters": 2.5,
    "sleep_duration": 480,
    "avg_heart_rate": 65,
    "raw_watch_data": {}
  }
  ```
- **Response (201 Created):** Success confirmation.

### 5.2 `GET /health/daily`
Retrieves today's health metrics and the 8:00 AM AI analysis.
- **Response (200 OK):**
  ```json
  {
    "date": "2026-03-14",
    "metrics": { ... },
    "ai_analysis": "You slept well last night..."
  }
  ```

### 5.3 `GET /health/history`
Retrieves historical trends for charting.
