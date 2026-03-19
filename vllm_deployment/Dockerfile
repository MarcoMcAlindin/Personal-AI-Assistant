# Qwen3.5-35B-A3B Q4_K_M GGUF on llama.cpp server (Cloud Run, single L4 GPU)
# Rule 23: GGUF Q4_K_M -- ~19.5GB weights, fits on L4 24GB with ~4.5GB KV cache headroom
#
# Two-stage build:
#   Stage 1 (downloader): Python slim -- downloads single GGUF file via hf_hub_download.
#     DO NOT use snapshot_download -- it pulls all quant variants (200+ GB).
#   Stage 2 (runtime):    Official llama.cpp CUDA server image (ggml-org registry, pre-built binary).
#     No compilation required. Cloud Build is CPU-only; compile-from-source CUDA builds fail.

# Stage 1: download the single GGUF file
FROM python:3.12-slim AS downloader
RUN pip install --no-cache-dir huggingface_hub
RUN mkdir -p /models && \
    python3 -c "\
from huggingface_hub import hf_hub_download; \
hf_hub_download(\
  repo_id='unsloth/Qwen3.5-35B-A3B-GGUF', \
  filename='Qwen3.5-35B-A3B-Q4_K_M.gguf', \
  local_dir='/models'\
)"

# Stage 2: official llama.cpp CUDA server image (ggml-org = current maintained registry)
# Tag format: server-cuda (rolling latest) or server-cuda-b<build> for pinned versions
FROM ghcr.io/ggml-org/llama.cpp:server-cuda

COPY --from=downloader /models /models

# --model:    GGUF file path
# -ngl 999:   offload all layers to GPU (L4 24GB)
# --ctx-size: KV cache budget -- safe within ~4.5GB headroom after Q4_K_M weights (~19.5GB)
# --parallel: concurrent sequences, matches Cloud Run containerConcurrency
# --host:     0.0.0.0 required for Cloud Run to receive traffic
# --alias:    sets the model ID returned by /v1/models (llama.cpp ignores model in completions)
EXPOSE 8080
CMD ["--model", "/models/Qwen3.5-35B-A3B-Q4_K_M.gguf", \
     "--host", "0.0.0.0", \
     "--port", "8080", \
     "-ngl", "999", \
     "--ctx-size", "4096", \
     "--parallel", "16", \
     "--alias", "Qwen/Qwen3.5-35B-A3B-GGUF"]
