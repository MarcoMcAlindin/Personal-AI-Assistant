# VibeOS — AI Service
# unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF (cloud llama.cpp) + Qwen3.5-9B-Claude-4.6-HighIQ (home PC Ollama) multi-model router

import os
import httpx
from typing import Optional


async def call_ollama(message: str, rag_context: str, ollama_url: str) -> str:
    """Proxy chat request to a user's Ollama instance with RAG context."""
    base = ollama_url.rstrip('/')
    system_prompt = (
        "You are VibeOS Assistant. Use the following context to answer the user's question.\n\n"
        f"Context:\n{rag_context}"
        if rag_context
        else "You are VibeOS Assistant."
    )
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{base}/v1/chat/completions",
            json={
                "model": os.environ.get("OLLAMA_MODEL_NAME", "qwen2.5:7b"),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message},
                ],
                "stream": False,
            },
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
