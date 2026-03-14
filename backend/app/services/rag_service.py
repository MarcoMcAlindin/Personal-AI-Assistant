import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
from supabase import create_client, Client
from pydantic import BaseModel

class RAGService:
    def __init__(self):
        # Supabase client setup
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        self.mock_mode = os.environ.get("MOCK_RAG") == "true"
        
        if self.supabase_url and self.supabase_key and not self.mock_mode:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        else:
            self.supabase = None

    async def get_10_day_history(self, user_id: str) -> str:
        """Fetch 10 days of chat history and health metrics to build a context string."""
        if self.mock_mode:
            return "MOCK CONTEXT: Recent Chat [User: Feeling good, AI: Great!] Health [2026-03-14: 8h sleep]"
        
        if not self.supabase:
            return "Context unavailable (Supabase not initialized)."

        ten_days_ago = (datetime.now() - timedelta(days=10)).isoformat()
        
        # 1. Fetch Chat History (last 10 days)
        chat_resp = self.supabase.table("chat_history") \
            .select("role, message, timestamp") \
            .eq("user_id", user_id) \
            .gte("timestamp", ten_days_ago) \
            .order("timestamp", desc=False) \
            .execute()
        
        # 2. Fetch Health Metrics (last 10 days)
        health_resp = self.supabase.table("health_metrics") \
            .select("date, water_liters, sleep_duration, avg_heart_rate, ai_analysis") \
            .eq("user_id", user_id) \
            .gte("date", ten_days_ago.split("T")[0]) \
            .order("date", desc=False) \
            .execute()

        # Format Context Block
        context = "### RECENT CHAT HISTORY (Last 10 Days)\n"
        for msg in chat_resp.data:
            context += f"[{msg['timestamp']}] {msg['role'].upper()}: {msg['message']}\n"
        
        context += "\n### RECENT HEALTH METRICS (Last 10 Days)\n"
        for entry in health_resp.data:
            context += f"- {entry['date']}: {entry['water_liters']}L water, {entry['sleep_duration']}h sleep, {entry['avg_heart_rate']} bpm avg. AI Analysis: {entry['ai_analysis'] or 'N/A'}\n"
            
        return context

    async def search_pinned_wisdom(self, user_id: str, query: str) -> str:
        """Perform a pgvector similarity search on pinned messages."""
        if self.mock_mode:
            return "\n### PINNED WISDOM (MOCK)\n- Drink more water.\n- Keep practicing Git."
        
        if not self.supabase:
            return ""

        # Placeholder: Embedding generation for the query.
        # In a real scenario, we'd call an embedding model here.
        # For now, we'll use a RPC call to a supabase function if it exists,
        # or return a "Recent Pinned" fallback if we can't embed.
        
        try:
            # Attempt to use the 'match_chat_history' RPC which should handle vector similarity
            # This RPC must be created in Supabase with pgvector.
            # For now, we fetch the 3 most recently pinned messages as a fallback.
            pinned_resp = self.supabase.table("chat_history") \
                .select("message, timestamp") \
                .eq("user_id", user_id) \
                .eq("is_saved", True) \
                .order("timestamp", desc=True) \
                .limit(3) \
                .execute()
            
            if not pinned_resp.data:
                return ""
                
            wisdom = "\n### PINNED WISDOM (RELEVANT CONTEXT)\n"
            for p in pinned_resp.data:
                wisdom += f"- {p['message']}\n"
            return wisdom
        except Exception as e:
            print(f"Error searching pinned wisdom: {e}")
            return ""

    async def build_context_block(self, user_id: str, user_query: str) -> str:
        """Orchestrate the full RAG context block."""
        history = await self.get_10_day_history(user_id)
        wisdom = await self.search_pinned_wisdom(user_id, user_query)
        
        return f"{history}\n{wisdom}"
