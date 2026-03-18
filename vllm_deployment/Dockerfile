# DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT on vLLM (Cloud Run, single L4 GPU)
# Text-only fine-tune -- no vision encoder, no --enforce-eager, no --limit-mm-per-prompt
# ~9B parameters, fits on L4 24GB with headroom for KV cache
FROM vllm/vllm-openai:latest

RUN python3 -m pip install huggingface_hub
ARG HF_TOKEN=""
RUN HUGGING_FACE_HUB_TOKEN="${HF_TOKEN}" python3 -c "from huggingface_hub import snapshot_download; snapshot_download('DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT')"
ENV MODEL_NAME="DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT"

# --max-model-len: 8192 -- conserves KV cache on single L4; model natively supports 32K
# --gpu-memory-utilization: 0.90 = ~21.6GB of L4's 24GB
# --max-num-seqs: 16 -- matches Cloud Run containerConcurrency
# --trust-remote-code: Required for all Qwen architectures
# CUDA graphs enabled (no --enforce-eager) -- 2-5x faster decode on text-only model
ENTRYPOINT ["python3", "-m", "vllm.entrypoints.openai.api_server"]
CMD ["--model", "DavidAU/Qwen3.5-9B-Claude-4.6-HighIQ-INSTRUCT", \
     "--port", "8080", \
     "--trust-remote-code", \
     "--max-model-len", "8192", \
     "--gpu-memory-utilization", "0.90", \
     "--max-num-seqs", "16"]
