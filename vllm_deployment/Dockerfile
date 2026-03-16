# Qwen3.5-9B on vLLM (Cloud Run, single L4 GPU)
# BitsAndBytes 8-bit quantization -- ~9GB weights, fits on L4 with headroom
FROM vllm/vllm-openai:latest

ENV MODEL_NAME="Qwen/Qwen3.5-9B"

# --model: Qwen3.5-9B (post-trained, instruction-following + vision-language)
# --quantization bitsandbytes: 8-bit quantization (no W8A8 pre-quantized variant available)
# --dtype float16: mandatory for bitsandbytes (does not support bfloat16)
# --enforce-eager: REQUIRED for VL models -- disables CUDA graph capture which causes vision encoder crashes
# --limit-mm-per-prompt: Caps image inputs to 2 per request -- each high-res image = up to 16K visual tokens (OOM prevention)
# --max-model-len: 8192 -- conserves KV cache on single L4; model natively supports 262K
# --gpu-memory-utilization: 0.90 = ~21.6GB of L4's 24GB -- leaves buffer for vision spikes
# --max-num-seqs: 16 -- matches Cloud Run containerConcurrency
# --trust-remote-code: Required for all Qwen architectures
ENTRYPOINT ["python3", "-m", "vllm.entrypoints.openai.api_server"]
CMD ["--model", "Qwen/Qwen3.5-9B", \
     "--quantization", "bitsandbytes", \
     "--dtype", "float16", \
     "--port", "8080", \
     "--trust-remote-code", \
     "--enforce-eager", \
     "--max-model-len", "8192", \
     "--gpu-memory-utilization", "0.90", \
     "--max-num-seqs", "16", \
     "--limit-mm-per-prompt", "{\"image\":2,\"video\":0}"]
