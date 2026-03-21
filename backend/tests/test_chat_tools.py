import pytest
import json
import os
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai_service import chat_with_tools

@pytest.mark.asyncio
async def test_chat_with_tools_no_loops(monkeypatch):
    """Test standard chat response without tool calls."""
    monkeypatch.setenv("QWEN_ENDPOINT_URL", "https://api.supercyan.ai/v1")
    monkeypatch.setenv("QWEN_MODEL_NAME", "test-model")

    mock_services = {
        "email": MagicMock(),
        "task": MagicMock(),
        "health": MagicMock(supabase=MagicMock())
    }
    
    # Mock vLLM response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{
            "message": {
                "role": "assistant",
                "content": "<think>Thinking...</think> Hello! How can I help you today?"
            }
        }]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with patch("google.oauth2.id_token.fetch_id_token", return_value="fake-token"):
            response = await chat_with_tools(
                message="Hi",
                context="",
                user_id="user-123",
                attachments=[],
                services=mock_services
            )
            
            assert response == "Hello! How can I help you today?"
            assert mock_services["health"].supabase.table("chat_history").insert.called

@pytest.mark.asyncio
async def test_chat_with_tools_single_loop():
    """Test a single tool execution loop (add_task)."""
    mock_services = {
        "email": MagicMock(),
        "task": AsyncMock(),
        "health": MagicMock(supabase=MagicMock())
    }
    mock_services["task"].create_task.return_value = {"id": "task-1", "title": "Buy milk"}
    
    # Mock sequence: 1. Tool Call, 2. Final Response
    mock_response_1 = MagicMock()
    mock_response_1.status_code = 200
    mock_response_1.json.return_value = {
        "choices": [{
            "message": {
                "role": "assistant",
                "tool_calls": [{
                    "id": "call_1",
                    "function": {
                        "name": "add_task",
                        "arguments": '{"title": "Buy milk"}'
                    }
                }]
            }
        }]
    }
    
    mock_response_2 = MagicMock()
    mock_response_2.status_code = 200
    mock_response_2.json.return_value = {
        "choices": [{
            "message": {
                "role": "assistant",
                "content": "I've added the task 'Buy milk' to your planner."
            }
        }]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [mock_response_1, mock_response_2]
        with patch("os.environ.get", side_effect=lambda k, d=None: "https://api.supercyan.ai/v1" if k == "QWEN_ENDPOINT_URL" else d):
            with patch("google.oauth2.id_token.fetch_id_token", return_value="fake-token"):
                response = await chat_with_tools(
                    message="Add task buy milk",
                    context="",
                    user_id="user-123",
                    attachments=[],
                    services=mock_services
                )
                
                assert response == "I've added the task 'Buy milk' to your planner."
                mock_services["task"].create_task.assert_called_once_with("user-123", {"title": "Buy milk"})

@pytest.mark.asyncio
async def test_chat_with_tools_image_payload():
    """Test that image attachments are correctly formatted in the request."""
    mock_services = {
        "email": MagicMock(),
        "task": MagicMock(),
        "health": MagicMock(supabase=MagicMock())
    }
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"role": "assistant", "content": "I see an image."}}]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with patch("os.environ.get", side_effect=lambda k, d=None: "https://api.supercyan.ai/v1" if k == "QWEN_ENDPOINT_URL" else d):
            with patch("google.oauth2.id_token.fetch_id_token", return_value="fake-token"):
                await chat_with_tools(
                    message="What is this?",
                    context="",
                    user_id="user-123",
                    attachments=[{"type": "image", "data": "base64data"}],
                    services=mock_services
                )
                
                # Check the call arguments
                call_args = mock_post.call_args[1]
                messages = call_args["json"]["messages"]
                user_content = messages[1]["content"]
                
                assert any(item.get("type") == "image_url" for item in user_content)
