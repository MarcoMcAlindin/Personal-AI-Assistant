# Start with the official vLLM OpenAI-compatible server image
FROM vllm/vllm-openai:latest

# The model name as an environment variable (can be overridden)
ENV MODEL_NAME="Qwen/Qwen3.5-27B"

# Set reasonable defaults for Cloud Run
# 8080 is the standard port for Cloud Run
ENV PORT=8080

# Use the vllm-openai entrypoint with optimized parameters
# --model: The Hugging Face model ID
# --port: The port to serve on
# --max-model-len: Adjust based on L4 GPU memory (24GB) to prevent OOM
# --gpu-memory-utilization: Reserve enough memory for the engine
# --quantization: Use FP8 for L4 GPUs (Ada Lovelace) to fit 27B model in 24GB VRAM
# --max-num-seqs: Limit concurrency to maintain stability on single GPU
# --trust-remote-code: Required for Qwen models
ENTRYPOINT ["python3", "-m", "vllm.entrypoints.openai.api_server"]
CMD ["--model", "Qwen/Qwen3.5-27B", "--port", "8080", "--trust-remote-code", "--max-model-len", "8192", "--gpu-memory-utilization", "0.90", "--quantization", "fp8", "--max-num-seqs", "16"]
