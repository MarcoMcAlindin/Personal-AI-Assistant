import os
import sys
import json
from datetime import datetime, timedelta
from supabase import create_client, Client
import httpx

def analyze_health():
    # Configuration from environment (lazily loaded for testing)
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    qwen_endpoint_url = os.environ.get("QWEN_ENDPOINT_URL")

    if not all([supabase_url, supabase_key, qwen_endpoint_url]):
        print("❌ Missing environment variables.")
        sys.exit(1)

    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Calculate yesterday's date
    yesterday = (datetime.now() - timedelta(days=1)).date().isoformat()
    print(f"🔍 Fetching health metrics for: {yesterday}")

    # Fetch health metrics
    response = supabase.table("health_metrics").select("*").eq("date", yesterday).execute()
    metrics_list = response.data

    if not metrics_list:
        print(f"⚠️ No metrics found for {yesterday}. Skipping analysis.")
        return

    # Load health scout prompt
    prompt_path = os.path.join(os.path.dirname(__file__), "../system_prompts/health_scout.md")
    with open(prompt_path, "r") as f:
        system_prompt = f.read()

    for metrics in metrics_list:
        user_id = metrics["user_id"]
        record_id = metrics["id"]
        
        # Prepare data for AI
        data_summary = {
            "sleep_duration": metrics.get("sleep_duration"),
            "avg_heart_rate": metrics.get("avg_heart_rate"),
            "water_liters": metrics.get("water_liters"),
            "raw_summary": "Data present" if metrics.get("raw_watch_data") else "No raw data"
        }

        print(f"🧠 Prompting Qwen for user: {user_id}")
        
        try:
            with httpx.Client(timeout=60.0) as client:
                ai_response = client.post(
                    f"{qwen_endpoint_url}/v1/chat/completions",
                    json={
                        "model": "Qwen/Qwen3.5-27B",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Analyze this biometric data: {json.dumps(data_summary)}"}
                        ],
                        "max_tokens": 512,
                        "temperature": 0.7
                    },
                    headers={"Content-Type": "application/json"}
                )
                ai_response.raise_for_status()
                analysis_text = ai_response.json()["choices"][0]["message"]["content"]
                
                # Update Supabase
                print(f"✅ Analysis complete. Updating record {record_id}")
                supabase.table("health_metrics").update({"ai_analysis": analysis_text}).eq("id", record_id).execute()
                
        except Exception as e:
            print(f"❌ Error during AI analysis for user {user_id}: {e}")

if __name__ == "__main__":
    analyze_health()
