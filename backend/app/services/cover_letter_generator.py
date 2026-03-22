import os
import httpx
from typing import Dict, Any

class CoverLetterGenerator:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.qwen_url = os.environ.get("QWEN_ENDPOINT_URL")
        # Explicit target per VOS-103 SKILL constraints
        self.model_name = os.environ.get("QWEN_MODEL_NAME", "unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF")

    def _get_gcp_headers(self) -> dict:
        headers = {"Content-Type": "application/json"}
        if not self.qwen_url:
            return headers
        try:
            import google.auth.transport.requests
            import google.oauth2.id_token
            auth_req = google.auth.transport.requests.Request()
            qwen_base = self.qwen_url.rstrip("/v1").rstrip("/")
            identity_token = google.oauth2.id_token.fetch_id_token(auth_req, qwen_base)
            headers["Authorization"] = f"Bearer {identity_token}"
        except Exception:
            pass
        return headers

    async def generate(self, cv_text: str, job_description: str) -> str:
        """
        Engineers a highly strict, plain-text ATS-optimized Cover Letter connecting a candidate CV 
        to a specific parsed Job Description. Connects explicitly into the local Qwen3-vLLM node.
        """
        if not self.qwen_url:
            return "AI Generation Error: QWEN_ENDPOINT_URL is not configured. Local generation halted."
            
        system_prompt = (
            "You are an expert executive ATS-optimized cover letter writer.\n"
            "Output EXACTLY the plain text of the cover letter. Do not include introductory conversational filler.\n"
        )
        
        user_prompt = (
            "Generate a professional, highly targeted cover letter based on the following context.\n\n"
            "<context>\n"
            f"CANDIDATE CV:\n{cv_text}\n\n"
            f"JOB POSTING:\n{job_description}\n"
            "</context>"
        )

        headers = self._get_gcp_headers()

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{self.qwen_url.rstrip('/')}/chat/completions",
                    headers=headers,
                    json={
                        "model": self.model_name,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "stream": False,
                        "max_tokens": 2048,
                        "temperature": 0.2, # Extremely strict temperature logic to avoid hallucinated experiences
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                return f"AI Generation Failed: {str(e)}"
