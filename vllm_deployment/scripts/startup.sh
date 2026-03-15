#!/bin/bash
# GCE startup script: authenticates to Artifact Registry, pulls the vLLM container,
# and runs Qwen3.5-27B across both L4 GPUs.
# Rule 24: device_map equivalent is --tensor-parallel-size 2 in vLLM.
set -e

# Fetch project metadata from GCE metadata server
PROJECT_ID=$(curl -s "http://metadata.google.internal/computeMetadata/v1/project/project-id" -H "Metadata-Flavor: Google")
REGION="europe-west1"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/vibeos/vllm-qwen:latest"

echo "Authenticating Docker to Artifact Registry..."
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

echo "Pulling latest image: $IMAGE"
docker pull "$IMAGE"

# Stop and remove any previously running container
docker stop vibeos-qwen 2>/dev/null || true
docker rm vibeos-qwen 2>/dev/null || true

# Run vLLM container with access to both L4 GPUs
# --gpus all: exposes both L4s to the container (tensor-parallel-size 2 handles the split)
echo "Starting vLLM container on 2x L4..."
docker run -d \
  --name vibeos-qwen \
  --gpus all \
  --restart unless-stopped \
  -p 8080:8080 \
  "$IMAGE"

# Cost Protection Kill Switch (GCE Skill Step 4)
# Checks GPU utilisation every 30 minutes -- shuts down if both GPUs are idle.
cat > /usr/local/bin/gpu-idle-check.sh << 'EOF'
#!/bin/bash
UTIL=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | awk '{s+=$1} END {print s}')
if [ "$UTIL" -eq 0 ]; then
  echo "GPUs idle -- initiating shutdown."
  sudo shutdown -h now
fi
EOF
chmod +x /usr/local/bin/gpu-idle-check.sh

# Register idle check as a cron job (runs every 30 minutes)
(crontab -l 2>/dev/null; echo "*/30 * * * * /usr/local/bin/gpu-idle-check.sh") | crontab -

echo "Startup complete. vLLM serving Qwen3.5-27B on port 8080."
