# Cost Audit: Cloud NAT Bill Shock — 2026-03-16

## Incident Summary

| Metric | Value |
|--------|-------|
| **Charge** | £4.62 ($6.24 USD) |
| **Data Processed** | 138.84 GB through Cloud NAT |
| **Rate** | $0.045/GB |
| **NAT Gateway** | `vibeos-nat` (always-on when configured) |
| **Gateway Hourly Cost** | ~$0.30/hour = **$220/month if left running** |
| **Affected Service** | `vibeos-qwen` (vLLM GPU Cloud Run) |

## Root Cause

This is a classic case of GCP "bill shock." When you put a service inside a secure, private Virtual Private Cloud (VPC) to protect it, it loses direct access to the public internet. To let it talk to the outside world, you have to set up a Cloud NAT gateway. Google charges a flat rate of **$0.045 per Gigabyte** for every byte of data that goes *in or out* of that NAT gateway.

The vLLM service (`service.yaml`) is configured with:

```yaml
run.googleapis.com/network-interfaces: '[{"network":"default","subnetwork":"default"}]'
run.googleapis.com/vpc-access-egress: all-traffic
```

**`all-traffic` egress** means ALL outbound traffic — including Google-to-Google service calls — routes through Cloud NAT and incurs per-GB charges. This is the most expensive egress mode.

### Traffic Sources (138 GB breakdown estimate)

| Source | Est. Size | Frequency | Monthly GB |
|--------|-----------|-----------|------------|
| Model download on cold start (~9GB W8A8) | ~9 GB | Every cold start | 9-90 GB (depending on frequency) |
| Inference payloads (chat, health, email rewrite) | ~1-5 MB/request | Daily | ~1 GB |
| HuggingFace Hub metadata/tokenizer downloads | ~500 MB | Every cold start | 5-50 GB |
| Google internal API calls routed through NAT | Variable | Per request | Unknown |

**Key insight:** Model re-downloads on every cold start are likely the #1 cost driver. Each scale-to-zero → cold start cycle downloads ~9GB through NAT.

## Current Architecture (Cost Problem)

```
vLLM Container (Cold Start)
    ├→ HuggingFace Hub (model download ~9GB) ──→ Cloud NAT ──→ Internet ($0.045/GB)
    ├→ Google APIs (Secret Manager, etc.)     ──→ Cloud NAT ──→ Internet ($0.045/GB)
    └→ Inference responses                    ──→ Cloud NAT ──→ Internet ($0.045/GB)
```

**Backend Gateway:** Does NOT use VPC/NAT (inconsistent but cheaper).

## Fixes Required (Priority Order)

### Fix 1: Change Egress to `private-ranges-only` [IMMEDIATE]

```yaml
# BEFORE (expensive):
run.googleapis.com/vpc-access-egress: all-traffic

# AFTER (only VPC-internal traffic uses NAT):
run.googleapis.com/vpc-access-egress: private-ranges-only
```

**Impact:** Public internet traffic (HuggingFace, inference responses) bypasses NAT entirely. Only VPC-internal traffic uses NAT. Saves ~90% of NAT data charges.

### Fix 2: Enable Private Google Access (PGA) [IMMEDIATE]

```bash
gcloud compute networks subnets update default \
  --region=europe-west1 \
  --enable-private-google-access
```

**Impact:** Google-to-Google traffic (Secret Manager, Cloud Storage, Artifact Registry) uses Google's free internal network instead of routing through NAT.

### Fix 3: Audit NAT Gateway Necessity [THIS WEEK]

If no external API requires a static IP whitelist, the Cloud NAT gateway can be **deleted entirely**:

```bash
# Check if NAT exists
gcloud compute routers nats list --router=vibeos-router --region=europe-west1

# If no static IP needed, delete it
gcloud compute routers nats delete vibeos-nat --router=vibeos-router --region=europe-west1
```

**Impact:** Eliminates $0.30/hour gateway fee (~$220/month) + all per-GB charges.

### Fix 4: Cache Model in Container Image [THIS WEEK]

Bake the model weights into the Docker image instead of downloading on every cold start:

```dockerfile
# Download model at build time (one-time Artifact Registry storage cost)
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('RedHatAI/Qwen3.5-9B-Instruct-quantized.w8a8', local_dir='/models')"
```

**Impact:** Eliminates ~9GB NAT egress per cold start. Trades for ~$0.10/month Artifact Registry storage.

### Fix 5: Fix Resource Mismatches [THIS WEEK]

| Config | deploy.sh | service.yaml | Recommended |
|--------|-----------|-------------|-------------|
| CPU | 4 | 8 | 4 (sufficient for 9B) |
| Memory | 16Gi | 32Gi | 16Gi (W8A8 needs ~9-11GB) |
| Timeout | 300s | 3600s | 300s |

### Fix 6: Compress API Payloads [THIS WEEK]

If we are sending raw JSON or base64 images back and forth to the frontend or LLM, ensure **GZIP compression is enabled in FastAPI**. This is critical because sending large context windows or receiving massive responses multiplies the data flowing through the network. Enabling GZIP reduces the size of these payloads dramatically.

## Spot Instances Assessment

**Not applicable to current architecture.** Cloud Run does not support spot/preemptible instances. Spot instances are a GCE (Compute Engine) feature.

**However**, if we wanted to explore GCE spot for the GPU workload:
- L4 GPU spot price: ~$0.12/hour (vs $0.35/hour on-demand) = **65% savings**
- Tradeoff: Spot instances can be preempted with 30s notice
- For a personal assistant with low SLA requirements, this is viable
- Would require re-architecting from Cloud Run to GCE with a managed instance group
- The deprecated `.agent/skills/gce-spot-gpu-manager/SKILL.md` already has blueprints for this

**Recommendation:** Fix the NAT issue first (immediate ~$220/month savings). Revisit GCE spot only if GPU compute costs exceed $50/month after optimization.

## Projected Monthly Savings

| Fix | Current Cost | After Fix | Savings |
|-----|-------------|-----------|---------|
| Egress → `private-ranges-only` | ~$6/month NAT data | ~$0.50/month | ~$5.50/month |
| Delete Cloud NAT gateway | ~$220/month | $0 | ~$220/month |
| Cache model in image | ~$4/month (cold start downloads) | ~$0.10/month | ~$3.90/month |
| **Total** | **~$230/month** | **~$0.60/month** | **~$229/month** |

---

*Mr. Pink — Scout & Auditor*
*Audit generated 2026-03-16*
