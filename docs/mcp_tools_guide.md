# VibeOS — MCP Tools Guide

This guide covers how to use the available MCP (Model Context Protocol) tools during VibeOS development. These tools allow direct interaction with Supabase and Google Cloud Run from your development environment.

---

## Supabase MCP Tools

### Project Management

| Tool | Purpose |
|------|---------|
| `mcp_supabase_list_projects` | List all Supabase projects |
| `mcp_supabase_get_project` | Get project details by ID |
| `mcp_supabase_list_organizations` | List your organizations |
| `mcp_supabase_get_project_url` | Get the API URL for a project |
| `mcp_supabase_get_publishable_keys` | Get anon/publishable API keys |

### Database Operations

| Tool | Purpose |
|------|---------|
| `mcp_supabase_list_tables` | List tables in schema (set `verbose: true` for columns) |
| `mcp_supabase_execute_sql` | Run raw SQL queries (SELECT, INSERT, etc.) |
| `mcp_supabase_apply_migration` | Run DDL operations (CREATE TABLE, ALTER, etc.) |
| `mcp_supabase_list_migrations` | View applied migrations |
| `mcp_supabase_list_extensions` | List enabled PostgreSQL extensions |

### Edge Functions

| Tool | Purpose |
|------|---------|
| `mcp_supabase_list_edge_functions` | List deployed edge functions |
| `mcp_supabase_deploy_edge_function` | Deploy a new edge function |
| `mcp_supabase_get_edge_function` | Get function source code |

### Monitoring & Security

| Tool | Purpose |
|------|---------|
| `mcp_supabase_get_logs` | Get logs by service (api, postgres, auth, etc.) |
| `mcp_supabase_get_advisors` | Check for security/performance issues |
| `mcp_supabase_generate_typescript_types` | Generate types from schema |

---

## Cloud Run MCP Tools

### Deployment

| Tool | Purpose |
|------|---------|
| `mcp_cloudrun_deploy_local_folder` | Deploy a local folder directly |
| `mcp_cloudrun_deploy_container_image` | Deploy from a container image URL |
| `mcp_cloudrun_deploy_file_contents` | Deploy by providing file contents inline |

### Service Management

| Tool | Purpose |
|------|---------|
| `mcp_cloudrun_list_projects` | List GCP projects |
| `mcp_cloudrun_list_services` | List Cloud Run services in a project |
| `mcp_cloudrun_get_service` | Get service details |
| `mcp_cloudrun_get_service_log` | Get service logs |

---

## Typical Development Workflows

### 1. Setting Up Supabase Schema (Phase 1)

```
1. mcp_supabase_list_projects → get your project_id
2. mcp_supabase_list_extensions → verify pgvector and pg_cron
3. mcp_supabase_apply_migration → create tables from schema_reference.md
4. mcp_supabase_get_advisors (type: "security") → check RLS policies
```

### 2. Deploying the FastAPI Backend (Phase 2)

```
1. mcp_cloudrun_list_projects → confirm GCP project
2. mcp_cloudrun_deploy_local_folder (folderPath: backend/) → deploy
3. mcp_cloudrun_get_service_log → check for errors
```

### 3. Testing Database Queries

```
1. mcp_supabase_execute_sql → run test queries
2. mcp_supabase_list_tables (verbose: true) → verify schema
3. mcp_supabase_get_logs (service: "postgres") → check DB logs
```

### 4. Deploying Edge Functions (if needed)

```
1. mcp_supabase_deploy_edge_function (name, files, verify_jwt: true)
2. mcp_supabase_get_logs (service: "edge-function") → check logs
```
