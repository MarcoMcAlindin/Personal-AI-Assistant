import os
import json
from unittest.mock import MagicMock, patch
import httpx
from analyze_health import analyze_health

def test_mock_analysis():
    print("🧪 Running mock health analysis test...")
    
    # Mock data
    mock_metrics = [{
        "id": "test-uuid",
        "user_id": "user-uuid",
        "date": "2026-03-13",
        "sleep_duration": 7.5,
        "avg_heart_rate": 65,
        "water_liters": 2.0,
        "raw_watch_data": {"test": "data"}
    }]
    
    mock_ai_content = "**Top Insight:** Sleep duration is optimal.\n- **Deep Sleep:** Mock Value\n**Recommendation:** Maintain current routine."
    
    with patch("supabase.create_client") as mock_supabase_client:
        # Configure Mock Supabase
        mock_table = MagicMock()
        mock_supabase_client.return_value.table.return_value = mock_table
        
        # Select returns mock_metrics
        mock_table.select.return_value.eq.return_value.execute.return_value.data = mock_metrics
        
        # Update returns success
        mock_table.update.return_value.eq.return_value.execute.return_value = MagicMock()

        # Mock HTTPlib
        with patch("httpx.Client.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.raise_for_status = MagicMock()
            mock_post.return_value.json.return_value = {
                "choices": [{"message": {"content": mock_ai_content}}]
            }

            # Set environment variables
            os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
            os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock-key"
            os.environ["QWEN_ENDPOINT_URL"] = "https://mock-ai.com"
            
            # Execute
            try:
                analyze_health()
                print("✅ Script executed successfully with mocks.")
                
                # Verify AI response handling
                print(f"📄 Mock AI Output:\n{mock_ai_content}")
                
            except Exception as e:
                print(f"❌ Script failed: {e}")
                raise e

if __name__ == "__main__":
    test_mock_analysis()
