# Qwen Model Test: Supabase Manual
**Date:** 2026-03-16
**Model:** RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8 (live deployment)
**Prompt:** "write me a manual on how to use supabase"
**Tokens:** 54 prompt / 1,313 completion | **Time:** ~170s (incl. cold start)

---

# Supabase User Manual

## Introduction to Supabase

Supabase is a cloud-based PostgreSQL database with a GraphQL API that allows you to build web and mobile applications quickly. It provides a simple way to store and query data, as well as authentication and authorization features.

## Prerequisites

Before you start, ensure you have:

- A Supabase account (free tier available).
- Basic knowledge of JavaScript or TypeScript.
- Familiarity with PostgreSQL concepts.

## Setting Up Your Supabase Project

1. **Sign Up or Log In**: Go to the Supabase website and sign up for an account if you haven't already.
2. **Create a New Project**: Navigate to your dashboard and create a new project.
3. **Install Supabase CLI**: Install the Supabase CLI globally by running:
   ```bash
   npm install -g @supabase/cli
   ```
4. **Initialize Supabase in Your Project**: Run the following command in your project directory:
   ```bash
   npx supabase init
   ```

## Connecting to Supabase

To connect to your Supabase instance, you need to provide it with your `SUPABASE_URL` and `SUPABASE_KEY`.

1. **Environment Variables**: Set these environment variables in your project's `.env` file:
   ```plaintext
   SUPABASE_URL=https://your-supabase-url.supabase.co
   SUPABASE_KEY=your-supabase-key
   ```

2. **Node.js Example**: Use the Supabase client to interact with your database:
   ```javascript
   const { createClient } = require('@supabase/supabase-js');

   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

   async function fetchData() {
     const { data, error } = await supabase.from('users').select('*');
     if (error) {
       throw error;
     }
     console.log(data);
   }

   fetchData();
   ```

## Authentication

Supabase supports multiple authentication methods including OAuth 2.0, JWT, and local authentication.

### Local Authentication

1. **Enable Local Authentication**:
   - Go to your Supabase dashboard and navigate to the "Authentication" section.
   - Enable "Local Authentication".
   - Generate a secret key for local authentication.

2. **Add Authentication to Your Client**:
   ```javascript
   const { createClient } = require('@supabase/supabase-js');

   const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_KEY,
     {
       auth: {
         autoRefreshToken: true,
         refreshInterval: 60 * 60 * 1000, // Refresh token every hour
       },
     }
   );

   async function login(email, password) {
     const { data, error } = await supabase.auth.signIn({
       email,
       password,
     });
     if (error) {
       throw error;
     }
     console.log(data);
   }

   login('user@example.com', 'password');
   ```

### OAuth 2.0 Authentication

1. **Enable OAuth 2.0**:
   - Go to your Supabase dashboard and navigate to the "Authentication" section.
   - Enable "OAuth 2.0".
   - Choose the providers you want to enable (e.g., GitHub, Google).

2. **Add OAuth 2.0 Authentication to Your Client**:
   ```javascript
   const { createClient } = require('@supabase/supabase-js');

   const supabase = createClient(
     process.env.SUPABASE_URL,
     process.env.SUPABASE_KEY,
     {
       auth: {
         autoRefreshToken: true,
         refreshInterval: 60 * 60 * 1000, // Refresh token every hour
       },
     }
   );

   async function loginWithGitHub() {
     const { data, error } = await supabase.auth.signIn({
       provider: 'github',
     });
     if (error) {
       throw error;
     }
     console.log(data);
   }

   loginWithGitHub();
   ```

## Querying Data

Supabase allows you to query data using SQL-like queries through its PostgreSQL interface.

### Simple Query

```javascript
const { data, error } = await supabase.from('users').select('*');
if (error) {
  throw error;
}
console.log(data);
```

### Advanced Query

```javascript
const { data, error } = await supabase
  .from('users')
  .select('id, name, email')
  .eq('email', 'user@example.com');
if (error) {
  throw error;
}
console.log(data);
```

## Updating Data

You can update records in your database using Supabase.

### Update a Single Record

```javascript
const { error } = await supabase
  .from('users')
  .update({ name: 'New Name' })
  .eq('id', 1);
if (error) {
  throw error;
}
```

### Update Multiple Records

```javascript
const { error } = await supabase
  .from('users')
  .update({ name: 'Updated Name' })
  .in('id', [1, 2, 3]);
if (error) {
  throw error;
}
```

## Deleting Data

Delete records from your database.

### Delete a Single Record

```javascript
const { error } = await supabase
  .from('users')
  .delete()
  .eq('id', 1);
if (error) {
  throw error;
}
```

### Delete Multiple Records

```javascript
const { error } = await supabase
  .from('users')
  .delete()
  .in('id', [1, 2, 3]);
if (error) {
  throw error;
}
```

## Conclusion

This manual covers the basics of setting up and interacting with Supabase. For more advanced usage, refer to the official Supabase documentation. Happy coding!
