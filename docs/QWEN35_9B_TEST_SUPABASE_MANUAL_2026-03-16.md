# Qwen3.5-9B Model Test: Supabase Manual
**Date:** 2026-03-16
**Model:** Qwen/Qwen3.5-9B (BitsAndBytes 8-bit, Cloud Run L4 GPU)
**Prompt:** "write me a manual on how to use supabase"
**Tokens:** 55 prompt / 2,048 completion (hit max_tokens limit) | **Time:** ~259s (warm instance)
**Finish Reason:** `length` (would have produced more if allowed)

---

*Note: Qwen3.5-9B uses thinking mode by default. The reasoning chain has been omitted below -- only the final output is shown.*

---

# Supabase Operational Manual

## 1. Infrastructure Setup

### 1.1 Project Initialization
1.  **Create Project:**
    *   Navigate to `dashboard.supabase.com`.
    *   Click `New Project`.
    *   Enter Project Name, Database Password, and Region.
2.  **Retrieve Credentials:**
    *   Navigate to `Settings > API`.
    *   Copy `Project ID` and `Anon/Public Key`.
    *   Copy `Service Role Key` (Required for server-side operations).

### 1.2 CLI Installation (Optional)
```bash
npm install -g supabase
supabase link --project-ref <your-project-ref>
```

## 2. Database Configuration

### 2.1 Schema Definition
1.  **Table Creation:**
    *   Navigate to `Table Editor > New Table`.
    *   Define columns (e.g., `id` [UUID], `username` [Text], `created_at` [Timestamp]).
2.  **Row Level Security (RLS):**
    *   Navigate to `Table Editor > Row Level Security`.
    *   Enable RLS.
    *   Create Policy for `SELECT` (e.g., `auth.uid() = user_id`).
    *   Create Policy for `INSERT` (e.g., `auth.uid() = auth.uid()`).

### 2.2 SQL Management
*   **Raw SQL Editor:** Access via `Table Editor > SQL Editor`.
*   **Migration:**
    *   Create `seed.sql` file.
    *   Execute via CLI: `supabase db push`.

## 3. Authentication Setup

### 3.1 Provider Configuration
1.  **Navigate:** `Authentication > Providers`.
2.  **Email/Password:** Enable by default.
3.  **Third-Party:**
    *   Click `Add Provider`.
    *   Follow OAuth flow (Google, GitHub, etc.).
    *   Input `Name` and `Redirect URI`.

### 3.2 Environment Variables
Create `.env` file for client-side usage:
```env
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
```

## 4. API & Edge Functions

### 4.1 REST API
*   Access endpoints via `Project URL`.
*   Use Standard HTTP verbs (GET, POST, PUT, DELETE).
*   Include `Authorization: Bearer <token>` header.

### 4.2 Edge Functions (Serverless)
1.  **Create Function:**
    *   Navigate to `Edge Functions > New Function`.
    *   Select Runtime (e.g., Node.js, Go, Python).
    *   Select Directory.
2.  **Code Example (Node.js/Edge):**
    ```javascript
    import { serve } from 'https://deno.land/x/serve/mod.ts';
    import { createClient } from 'https://esm.sh/@supabase/supabase-js';

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ROLE_KEY);

    serve(async (request) => {
      const { body } = await request.json();
      const { data, error } = await supabase.from('users').insert(body);
      return new Response(JSON.stringify(data), { status: 200 });
    });
    ```
3.  **Deploy:**
    *   Click `Deploy`.

## 5. Storage Management

### 5.1 Bucket Creation
1.  **Navigate:** `Storage > New Bucket`.
2.  **Configuration:**
    *   Name: `public-assets`.
    *   Policy: `Public` (Read-only) or `Private` (Authenticated).

### 5.2 File Upload
*   **Client:** Use `@supabase/storage-js`.
*   **Command:** `supabase storage.from(bucket).upload(path, file)`.

## 6. Client Integration (SDK Usage)

### 6.1 JavaScript/TypeScript Initialization
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
```

### 6.2 Authentication Flow
```javascript
// Sign Up
const { data: user, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword'
});

// Sign In
const { data: session, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});

// Real-time Subscription
const { data: realTimeData } = supabase
  .channel('users')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
    console.log('New User:', payload.new);
  });
```

## 7. Deployment & Monitoring

### 7.1 CI/CD
1.  **Connect GitHub:**
    *   Navigate to `Settings > General`.
    *   Select GitHub Provider.
    *   Authorize Repository.
2.  **Configure Secrets:**
    *   Navigate to `Settings > Environment Variables`.
    *   Add `DATABASE_URL`, `SUPABASE_KEY`, etc.

### 7.2 Monitoring
*   **Dashboard:** `Settings > Usage Limits`.
*   **Logs:** *(output truncated -- hit 2048 max_tokens)*
