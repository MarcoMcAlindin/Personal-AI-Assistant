#!/bin/bash

# VibeOS Cloud Run Deployment Script
# Managed by Mr. Green

PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="vibeos-backend"
REGION="europe-west1" # Adjust as needed

echo "🚀 Deploying VibeOS Backend to Google Cloud Run..."

# Build the container
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
# Mr Pink Scouting: min-instances=0 for cost efficiency
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --min-instances 0 \
    --allow-unauthenticated \
    --set-env-vars "ENVIRONMENT=production"

echo "✅ Deployment Complete!"
