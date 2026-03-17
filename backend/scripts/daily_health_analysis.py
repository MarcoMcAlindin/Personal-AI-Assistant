# VibeOS — Health Analysis Script
# Called by GitHub Actions at 8:00 AM GMT daily
# 1. Pull latest synced watch data from Supabase
# 2. Send to Qwen3.5-9B-Instruct for personalized analysis
# 3. Store the analysis back in Supabase health_metrics table
