# AI Infrastructure Domain

**Agent Owner:** Mr. Red (Cloud Intelligence & Automation Ops)
**Tech Stack:** Docker, Google Cloud Run, vLLM

This directory contains the deployment configuration for the private Qwen3.5-9B-Instruct model.

Responsibilities involve allocating GPU resources, scaling-to-zero parameters on Cloud Run, and tuning the system prompt configuration (`system_prompts/`) to enforce the AI's persona across chat and health analysis functions.

---

## Model Name Contract

**Critical:** The `QWEN_MODEL_NAME` environment variable on the `supercyan-backend` Cloud Run service **must exactly match** the model ID reported by the vLLM service's `/v1/models` endpoint.

vLLM validates the `model` field in every `/v1/chat/completions` request against its loaded model IDs. A mismatch returns HTTP 404 `{"message": "The model X does not exist."}` — breaking all AI chat functionality.

### How to verify the live model ID

```bash
TOKEN=$(gcloud auth print-identity-token)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://supercyan-qwen-599152061719.europe-west1.run.app/v1/models" | python3 -m json.tool
# Look for: "id": "..."  <-- this is the canonical model name
```

### How to patch the backend if there is a mismatch

```bash
gcloud run services update supercyan-backend \
  --region europe-west1 \
  --update-env-vars QWEN_MODEL_NAME="<exact-id-from-above>"
```

No Docker rebuild is required. The new revision deploys in ~60 seconds.

### Why the mismatch happens

The vLLM entrypoint `--model` flag value does not always equal the served model ID. Different vLLM versions normalise HuggingFace Hub paths differently (e.g., `Qwen/Qwen3.5-9B-Instruct` loaded but served as `Qwen/Qwen3.5-9B`). **Always trust `/v1/models` over any config assumption** after a vLLM redeployment.
