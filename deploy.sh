#!/bin/bash

# OutDecked - Google Cloud Run Deployment Script
# This script deploys the application to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 OutDecked - Google Cloud Run Deployment${NC}"
echo "=================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  You are not authenticated with Google Cloud.${NC}"
    echo "Running: gcloud auth login"
    gcloud auth login
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No project ID set.${NC}"
    echo "Please set a project ID: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✅ Using project: ${PROJECT_ID}${NC}"

# Enable required APIs
echo -e "${BLUE}📋 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Set default region
REGION=${REGION:-us-central1}
echo -e "${GREEN}✅ Using region: ${REGION}${NC}"

# Build and deploy
echo -e "${BLUE}🔨 Building and deploying to Cloud Run...${NC}"

# Build the container
echo "Building container image..."
gcloud builds submit --tag gcr.io/${PROJECT_ID}/outdecked

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy outdecked \
    --image gcr.io/${PROJECT_ID}/outdecked \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 10 \
    --timeout 300 \
    --set-env-vars FLASK_ENV=production

# Get the service URL
SERVICE_URL=$(gcloud run services describe outdecked --region=${REGION} --format="value(status.url)")

echo ""
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo "=================================================="
echo -e "${BLUE}Service URL: ${SERVICE_URL}${NC}"
echo -e "${BLUE}Health Check: ${SERVICE_URL}/health${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Visit the service URL to access your application"
echo "2. Test the health endpoint to ensure it's running"
echo "3. Start scraping some cards!"
echo ""
echo -e "${YELLOW}💡 Useful commands:${NC}"
echo "• View logs: gcloud run services logs read outdecked --region=${REGION}"
echo "• Update service: gcloud run services update outdecked --region=${REGION}"
echo "• Delete service: gcloud run services delete outdecked --region=${REGION}"
echo ""
echo -e "${GREEN}Happy scraping! 🃏${NC}"
