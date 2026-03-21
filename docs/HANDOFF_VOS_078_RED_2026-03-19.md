# HANDOFF — VOS-078: Qwen3-Coder-30B Deployment (COMPLETE)
**Agent:** Mr. Red
**Date:** 2026-03-19
**Status:** ✅ COMPLETE — Ready for Mr. Pink Audit

---

## Summary

Successfully migrated the SuperCyan Cloud Run inference service from `unsloth/Qwen3.5-35B-A3B-GGUF` to `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF` (Q4_K_S quantization). The Coder-Instruct variant provides superior logical reasoning, tool-calling, and agentic capability alignment — the intended AI backbone for SuperCyan.

The final deployment uses a **32768-token context window** with `q4_0` KV cache quantization and runs stably on the single L4 GPU (24GB VRAM).

---

## Cloud Run Revisions Deployed Today

| Revision | Context | KV Cache | Status |
|----------|---------|----------|--------|
| `supercyan-qwen-00020-xxx` | 4096 | none | ✅ Initial Coder model migration |
| `supercyan-qwen-00022-mpc` | 8192 | q4_0 | ✅ KV optimisation pass |
| `supercyan-qwen-00023-xxx` | **32768** | q4_0 | ✅ **Final production revision** |

- **Service URL:** `https://supercyan-qwen-599152061719.europe-west1.run.app`
- **Cloud Build (final):** `fdf864b6-e53a-4558-ae48-f3b4d78e6f30` — SUCCESS

---

## Files Changed

| File | Change |
|------|--------|
| `vllm_deployment/Dockerfile` | Model → `Qwen3-Coder-30B-A3B-Instruct-Q4_K_S.gguf`; `--ctx-size 32768`; `--parallel 8`; `--cache-type-k q4_0`; `--cache-type-v q4_0` |
| `vllm_deployment/service.yaml` | `MODEL_NAME` → `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF`; `containerConcurrency: 8` |
| `vllm_deployment/deploy.sh` | Fixed `cd "$SCRIPT_DIR"` path bug; `--timeout 600`; `--concurrency 16` |
| `mobile/src/screens/ChatScreen.jsx` | Header label updated from `Qwen2.5 Assistant` → `Qwen3-Coder-30B` |
| `GEMINI.md` | Model reference updated throughout |
| `CLAUDE.md` | Model reference updated throughout |

---

## Architecture Reference

- **Runtime image:** `ghcr.io/ggml-org/llama.cpp:server-cuda`
- **Model alias (API contract):** `unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF`
- **GPU:** Single L4 (24GB VRAM) — all layers offloaded via `-ngl 999`
- **Context window:** `--ctx-size 32768`
- **KV cache:** `q4_0` quantisation (both K and V)
- **Parallel slots:** `--parallel 8` (to fit within 24GB VRAM budget)
- **Request timeout:** 600s (up from 300s — needed for 32K context heavy prompts)

---

## VRAM Budget (Verified in Logs)

```
| CUDA0 (L4) | 22491 MiB total = 5005 free + 17159 used (model: 16474, context: 384, compute: 300) |
```

The 32768 context window with q4_0 KV fits comfortably within the 24GB envelope.

---

## Verification Steps for Mr. Pink

```bash
# 1. Confirm model alias contract is intact
gcloud run services describe supercyan-qwen --region europe-west1 \
  --format="value(spec.template.spec.containers[0].env[MODEL_NAME])"
# Expected: unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF

# 2. Confirm live model load in service logs
gcloud run services logs read supercyan-qwen --region europe-west1 --limit 30
# Expected: "main: model loaded" + "server is listening on http://0.0.0.0:8080"

# 3. Test inference (requires identity token)
TOKEN=$(gcloud auth print-identity-token)
curl -s -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF","messages":[{"role":"user","content":"Hello"}],"max_tokens":64}' \
  https://supercyan-qwen-599152061719.europe-west1.run.app/v1/chat/completions | jq .choices[0].message.content
```

---

## Boundary Confirmation

Mr. Red operated strictly within:
- `vllm_deployment/` — Dockerfile, deploy.sh, cloudbuild.yaml
- `mobile/src/screens/ChatScreen.jsx` — header label update only (no logic changes)
- `GEMINI.md`, `CLAUDE.md` — documentation sync only

No Supabase migrations, FastAPI route changes, or web frontend logic was modified.

---

## Next Steps for Team

| Agent | Task | Issue |
|-------|------|-------|
| **Mr. Pink** | Audit this handoff, close VOS-078 | — |
| **Mr. Green** | Implement tool-execution loop in `/chat` | [#98](https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/98) |
| **Mr. Blue** | Add media upload UI + model label polish | [#99](https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/99) |
| **Mr. Red** | VOS-073: CUDA graph optimisation (remove `--enforce-eager`) | [#91](https://github.com/MarcoMcAlindin/Personal-AI-Assistant/issues/91) |
