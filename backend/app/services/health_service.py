# VibeOS -- Health Service
# Samsung Watch data processing and health metrics API

import os
from datetime import date, datetime
from typing import Optional
from supabase import create_client, Client


class HealthService:
    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if self.supabase_url and self.supabase_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        else:
            self.supabase = None

    async def sync_biometrics(self, user_id: str, payload: dict) -> dict:
        """Upsert biometric data keyed on (user_id, date)."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        timestamp_str = payload.get("timestamp") or payload.get("date")
        if timestamp_str:
            try:
                sync_date = datetime.fromisoformat(
                    timestamp_str.replace("Z", "+00:00")
                ).date().isoformat()
            except (ValueError, AttributeError):
                sync_date = str(timestamp_str)[:10]
        else:
            sync_date = date.today().isoformat()

        row = {
            "user_id": user_id,
            "date": sync_date,
        }

        if payload.get("heart_rate") is not None:
            row["avg_heart_rate"] = int(payload["heart_rate"])
        if payload.get("avg_heart_rate") is not None:
            row["avg_heart_rate"] = int(payload["avg_heart_rate"])
        if payload.get("sleep_duration") is not None:
            row["sleep_duration"] = payload["sleep_duration"]
        if payload.get("water_liters") is not None:
            row["water_liters"] = payload["water_liters"]
        if payload.get("raw_watch_data") is not None:
            row["raw_watch_data"] = payload["raw_watch_data"]

        result = self.supabase.table("health_metrics") \
            .upsert(row, on_conflict="user_id,date") \
            .execute()

        return {"synced": True, "date": sync_date, "rows": len(result.data)}

    async def get_metrics(self, user_id: str, days: int = 10) -> list:
        """Return the most recent N days of health metrics."""
        if not self.supabase:
            return []

        result = self.supabase.table("health_metrics") \
            .select("date, water_liters, sleep_duration, avg_heart_rate, raw_watch_data, ai_analysis") \
            .eq("user_id", user_id) \
            .order("date", desc=True) \
            .limit(days) \
            .execute()

        return result.data

    async def get_analysis(self, user_id: str) -> Optional[str]:
        """Return today's AI analysis, or null if none exists."""
        if not self.supabase:
            return None

        today = date.today().isoformat()

        result = self.supabase.table("health_metrics") \
            .select("ai_analysis") \
            .eq("user_id", user_id) \
            .eq("date", today) \
            .limit(1) \
            .execute()

        if result.data and result.data[0].get("ai_analysis"):
            return result.data[0]["ai_analysis"]

        return None

    async def log_water(self, user_id: str, amount_liters: float) -> dict:
        """Increment today's water_liters. Create row if none exists."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        today = date.today().isoformat()

        existing = self.supabase.table("health_metrics") \
            .select("water_liters") \
            .eq("user_id", user_id) \
            .eq("date", today) \
            .limit(1) \
            .execute()

        if existing.data:
            current = existing.data[0].get("water_liters") or 0
            new_total = float(current) + amount_liters

            self.supabase.table("health_metrics") \
                .update({"water_liters": new_total}) \
                .eq("user_id", user_id) \
                .eq("date", today) \
                .execute()

            return {"water_liters": new_total, "date": today}
        else:
            self.supabase.table("health_metrics") \
                .insert({
                    "user_id": user_id,
                    "date": today,
                    "water_liters": amount_liters,
                }) \
                .execute()

            return {"water_liters": amount_liters, "date": today}
