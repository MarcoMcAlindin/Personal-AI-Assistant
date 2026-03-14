from datetime import datetime, timedelta
from supabase import create_client, Client
import os

class RAGService:
    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if self.supabase_url and self.supabase_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

    async def get_10_day_history(self, user_id: str) -> str:
        """Fetch chat and health context for the last 10 days."""
        ten_days_ago = (datetime.now() - timedelta(days=10)).isoformat()
        
        try:
            # Fetch Chat History
            chat_resp = self.supabase.table("chat_history") \
                .select("role, message, timestamp") \
                .eq("user_id", user_id) \
                .gt("timestamp", ten_days_ago) \
                .order("timestamp", desc=False) \
                .execute()
            
            # Fetch Health Metrics
            health_resp = self.supabase.table("health_metrics") \
                .select("date, avg_heart_rate, sleep_duration, ai_analysis") \
                .eq("user_id", user_id) \
                .gt("date", ten_days_ago) \
                .order("date", desc=False) \
                .execute()
            
            context = "### 10-DAY CONTEXT\n"
            context += "-- Recent Interactions --\n"
            for msg in chat_resp.data[-5:]: # Last 5 messages for brevity
                context += f"[{msg['role']}]: {msg['message']}\n"
            
            context += "\n-- Recent Health --\n"
            for h in health_resp.data[-3:]: # Last 3 days
                context += f"Date: {h['date']} | HR: {h['avg_heart_rate']} | Sleep: {h['sleep_duration']}m | Analysis: {h['ai_analysis']}\n"
                
            return context
        except Exception as e:
            print(f"Error fetching RAG history: {e}")
            return "No historical context available."

    async def search_pinned_wisdom(self, user_id: str, query: str) -> str:
        """Search for 'Pinned' messages related to the query."""
        # Note: In a full production app, we would use pgvector similarity search here.
        # For this phase, we fetch the 3 most recently pinned 'wisdom' messages.
        try:
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
