import os
import sys
import json
import subprocess
from datetime import datetime, timedelta
from supabase import create_client, Client
import httpx


def get_identity_token(audience: str) -> str:
    """Fetch a GCP identity token for authenticated Cloud Run invocation."""
    result = subprocess.run(
        ["gcloud", "auth", "print-identity-token", f"--audiences={audience}"],
        capture_output=True, text=True, check=True
    )
    return result.stdout.strip()


import time

def call_ai_with_retry(client, url, payload, headers, retries=3, backoff=[0, 30, 60]):
    """Call vLLM with retry for cold-start 503s or rate limit 429s."""
    last_error = None
    for attempt, delay in enumerate(backoff[:retries]):
        if delay > 0:
            print(f"Retry {attempt}/{retries - 1} after {delay}s...")
            time.sleep(delay)
        try:
            r = client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (503, 429, 502):
                last_error = e
                continue  # Cold start, gateway, or rate limit — retry
            raise  # 404, 401, etc. — don't retry
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            last_error = e
            continue
    raise RuntimeError(f"AI call failed after {retries} attempts: {last_error}")

def analyze_health():
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().strip('"') or None
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip().strip('"') or None
    qwen_endpoint_url = os.environ.get("QWEN_ENDPOINT_URL", "").strip().strip('"') or None
    qwen_model_name = os.environ.get("QWEN_MODEL_NAME", "").strip().strip('"') or None

    if not all([supabase_url, supabase_key, qwen_endpoint_url, qwen_model_name]):
        print("Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QWEN_ENDPOINT_URL, QWEN_MODEL_NAME).")
        sys.exit(1)

    supabase: Client = create_client(supabase_url, supabase_key)

    yesterday = (datetime.now() - timedelta(days=1)).date().isoformat()
    print(f"Fetching health metrics for: {yesterday}")

    response = supabase.table("health_metrics").select("*").eq("date", yesterday).execute()
    metrics_list = response.data

    if not metrics_list:
        print(f"No metrics found for {yesterday}. Failing workflow -- silent pass is not acceptable.")
        sys.exit(1)

    prompt_path = os.path.join(os.path.dirname(__file__), "../system_prompts/health_scout.md")
    with open(prompt_path, "r") as f:
        system_prompt = f.read()

    failed_users = []

    for metrics in metrics_list:
        user_id = metrics["user_id"]
        record_id = metrics["id"]

        data_summary = {
            "sleep_duration": metrics.get("sleep_duration"),
            "avg_heart_rate": metrics.get("avg_heart_rate"),
            "water_liters": metrics.get("water_liters"),
            "raw_summary": "Data present" if metrics.get("raw_watch_data") else "No raw data"
        }

        print(f"Prompting Qwen for user: {user_id}")

        try:
            # Audience must be the bare Cloud Run service URL (no /v1 path suffix)
            # Cloud Run rejects identity tokens whose audience includes a path component
            qwen_audience = qwen_endpoint_url.rstrip("/v1").rstrip("/")
            identity_token = get_identity_token(qwen_audience)
            # 300s timeout: cold start ~15-30s for 9B, large buffer for safety
            with httpx.Client(timeout=300.0) as client:
                # Normalize URL: ensure /v1 is always present regardless of what QWEN_ENDPOINT_URL contains
                qwen_base = qwen_endpoint_url.rstrip('/')
                if not qwen_base.endswith('/v1'):
                    qwen_base = f"{qwen_base}/v1"
                
                payload = {
                    "model": qwen_model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Analyze this biometric data: {json.dumps(data_summary)}"}
                    ],
                    "max_tokens": 512,
                    "temperature": 0.7
                }
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {identity_token}"
                }
                
                ai_response_json = call_ai_with_retry(client, f"{qwen_base}/chat/completions", payload, headers)
                analysis_text = ai_response_json["choices"][0]["message"]["content"]

                print(f"Analysis complete. Updating record {record_id}")
                supabase.table("health_metrics").update({"ai_analysis": analysis_text}).eq("id", record_id).execute()

        except Exception as e:
            print(f"Error during AI analysis for user {user_id}: {e}")
            failed_users.append(user_id)

    if failed_users:
        print(f"FAILED for {len(failed_users)} user(s): {failed_users}")
        sys.exit(1)

    print("All analyses complete.")


if __name__ == "__main__":
    analyze_health()
