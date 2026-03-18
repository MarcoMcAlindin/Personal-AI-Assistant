# Qwen3.5-9B-Instruct on vLLM (Cloud Run, single L4 GPU)
# Rule 23: W8A8 pre-quantized -- ~7-9GB weights, fits on L4 with 6-11GB headroom
FROM vllm/vllm-openai:latest

RUN python3 -m pip install huggingface_hub
RUN python3 -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen3.5-9B-Instruct')"
ENV MODEL_NAME="Qwen/Qwen3.5-9B-Instruct"

# --quantization compressed-tensors: Explicitly activates W8A8 compressed-tensors kernels (auto-detect is unreliable)
# --enforce-eager: REQUIRED for VL models -- disables CUDA graph capture which causes vision encoder crashes
#   NOTE(VOS-perf): Removing --enforce-eager would enable CUDA graphs (2-5x faster decode) but risks vision encoder
#   OOM crashes. Future optimisation task should test text-only path without this flag. See Pink handoff VOS-064.
# --limit-mm-per-prompt: Caps image inputs to 2 per request -- each high-res image = up to 16K visual tokens (OOM prevention)
# --max-model-len: 8192 -- conserves KV cache on single L4; model natively supports 32K
# --gpu-memory-utilization: 0.90 = ~21.6GB of L4's 24GB -- leaves buffer for vision spikes
# --max-num-seqs: 16 -- matches Cloud Run containerConcurrency
# --trust-remote-code: Required for all Qwen architectures
ENTRYPOINT ["python3", "-m", "vllm.entrypoints.openai.api_server"]
CMD ["--model", "Qwen/Qwen3.5-9B-Instruct", \
     "--port", "8080", \
     "--trust-remote-code", \
     "--quantization", "compressed-tensors", \
     "--enforce-eager", \
     "--max-model-len", "8192", \
     "--gpu-memory-utilization", "0.90", \
     "--max-num-seqs", "16", \
     "--limit-mm-per-prompt", "{\"image\":2,\"video\":0}"]
