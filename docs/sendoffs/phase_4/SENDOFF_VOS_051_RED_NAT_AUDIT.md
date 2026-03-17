# SENDOFF: VOS-051 — Audit Cloud NAT & Enable Private Google Access

## 1. Objective
To potentially eliminate the ~$220/month fixed fee for the Cloud NAT gateway and enable free internal routing for Google services.

## 2. Technical Domain: Mr. Red (Cloud Intelligence & Automation Ops)
**Codebase Territory:** GCP Infrastructure & Networking.

## 3. Implementation Steps

1. **Audit NAT Requirement:** 
   Verify if any external services currently used by VibeOS require a static whitelisted IP. If not, the NAT gateway is redundant.

2. **Enable Private Google Access (PGA):**
   ```bash
   gcloud compute networks subnets update default \
     --region=europe-west1 \
     --enable-private-google-access
   ```

3. **Delete NAT Gateway & Router (If redundant):**
   ```bash
   gcloud compute routers nats delete vibeos-nat --router=vibeos-router --region=europe-west1
   gcloud compute routers delete vibeos-router --region=europe-west1
   ```

## 4. Verification Checklist
- [ ] PGA is confirmed active on the subnet.
- [ ] vLLM and Backend services can still reach Secret Manager and Artifact Registry.
- [ ] Monthly fixed charges for `vibeos-nat` cease in the GCP Billing Console.
