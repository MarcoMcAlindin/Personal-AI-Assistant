# Start with the official vLLM OpenAI-compatible server image
FROM vllm/vllm-openai:latest

# Rule 24: Qwen3.5-27B at 8-bit (~27GB weights) exceeds a single L4 (24GB).
# Deployed on GCE g2-standard-24 (2x L4 = 48GB VRAM) via deploy.sh.
# --tensor-parallel-size 2: splits model weights evenly across both L4s
# --quantization bitsandbytes: INT8 quantization -- 27B model fits with ~21GB VRAM headroom
# --dtype float16: required; bitsandbytes 8-bit does not support bfloat16
# --max-model-len 8192: caps context window to preserve KV cache buffer (Rule 24 buffer zone)
# --gpu-memory-utilization 0.90: ~43GB functional VRAM, 5GB+ buffer across both GPUs
# --max-num-seqs 16: limits concurrency for stability
# --trust-remote-code: required for Qwen models
ENV MODEL_NAME="Qwen/Qwen3.5-27B"

ENTRYPOINT ["python3", "-m", "vllm.entrypoints.openai.api_server"]
CMD ["--model", "Qwen/Qwen3.5-27B", "--port", "8080", "--trust-remote-code", "--tensor-parallel-size", "2", "--quantization", "bitsandbytes", "--dtype", "float16", "--max-model-len", "8192", "--gpu-memory-utilization", "0.90", "--max-num-seqs", "16"]
