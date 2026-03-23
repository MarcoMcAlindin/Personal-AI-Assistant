import os
from datetime import date
from typing import List, Dict
from supabase import create_client, Client


class TaskService:
    def __init__(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if url and key:
            self.supabase: Client = create_client(url, key)
        else:
            self.supabase = None

    async def get_tasks(self, user_id: str, task_date: str = None, include_archived: bool = False) -> List[Dict]:
        """Fetch tasks for a given date (defaults to today)."""
        if not self.supabase:
            return []

        target_date = task_date or date.today().isoformat()
        query = self.supabase.table("tasks") \
            .select("id, date, title, description, duration, time, status, is_archived") \
            .eq("user_id", user_id) \
            .eq("date", target_date)

        if not include_archived:
            query = query.eq("is_archived", False)

        result = query.order("time", desc=False).execute()
        return result.data

    async def create_task(self, user_id: str, data: dict) -> Dict:
        """Create a new task. Defaults to today if no date provided."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        row = {
            "user_id": user_id,
            "date": data.get("date") or date.today().isoformat(),
            "title": data["title"],
            "description": data.get("description"),
            "duration": data.get("duration"),
            "time": data.get("time"),
            "urgency": data.get("urgency", "medium"),
            "status": "pending",
            "is_archived": False,
        }

        result = self.supabase.table("tasks").insert(row).execute()
        return result.data[0] if result.data else {"error": "Insert failed"}

    async def update_task(self, user_id: str, task_id: str, updates: dict) -> Dict:
        """Update a task's fields. Only non-None fields are applied."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        filtered = {k: v for k, v in updates.items() if v is not None}
        if not filtered:
            return {"error": "No fields to update"}

        result = self.supabase.table("tasks") \
            .update(filtered) \
            .eq("id", task_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            return {"error": "Task not found"}
        return result.data[0]

    async def delete_task(self, user_id: str, task_id: str) -> Dict:
        """Delete a task by ID."""
        if not self.supabase:
            return {"error": "Supabase not initialized"}

        result = self.supabase.table("tasks") \
            .delete() \
            .eq("id", task_id) \
            .eq("user_id", user_id) \
            .execute()

        if not result.data:
            return {"error": "Task not found"}
        return {"deleted": True, "id": task_id}
