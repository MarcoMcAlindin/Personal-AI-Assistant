# Qwen2.5-VL-7B-Instruct on vLLM (Cloud Run, single L4 GPU)
# Rule 23: W8A8 pre-quantized -- ~7-9GB weights, fits on L4 with 6-11GB headroom
FROM vllm/vllm-openai:latest

ENV MODEL_NAME="RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8"

# --model: W8A8 pre-quantized variant -- no --quantization flag needed (embedded in weights)
# --enforce-eager: REQUIRED for VL models -- disables CUDA graph capture which causes vision encoder crashes
# --limit-mm-per-prompt: Caps image inputs to 2 per request -- each high-res image = up to 16K visual tokens (OOM prevention)
# --max-model-len: 8192 -- conserves KV cache on single L4; model natively supports 32K
# --gpu-memory-utilization: 0.90 = ~21.6GB of L4's 24GB -- leaves buffer for vision spikes
# --max-num-seqs: 16 -- matches Cloud Run containerConcurrency
# --trust-remote-code: Required for all Qwen architectures
ENTRYPOINT ["python3", "-m", "vllm.entrypoints.openai.api_server"]
CMD ["--model", "RedHatAI/Qwen2.5-VL-7B-Instruct-quantized.w8a8", \
     "--port", "8080", \
     "--trust-remote-code", \
     "--enforce-eager", \
     "--max-model-len", "8192", \
     "--gpu-memory-utilization", "0.90", \
     "--max-num-seqs", "16", \
     "--limit-mm-per-prompt", "{\"image\":2,\"video\":0}"]
