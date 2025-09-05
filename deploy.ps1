# TopDeck - Google Cloud Run Deployment Script (PowerShell)
# This script deploys the application to Google Cloud Run

param(
    [string]$Region = "us-central1"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

Write-Host "🚀 TopDeck - Google Cloud Run Deployment" -ForegroundColor $Blue
Write-Host "=================================================="

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
} catch {
    Write-Host "❌ Google Cloud CLI is not installed." -ForegroundColor $Red
    Write-Host "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Check if user is authenticated
$authStatus = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $authStatus) {
    Write-Host "⚠️  You are not authenticated with Google Cloud." -ForegroundColor $Yellow
    Write-Host "Running: gcloud auth login"
    gcloud auth login
}

# Get project ID
$ProjectId = gcloud config get-value project 2>$null
if (-not $ProjectId) {
    Write-Host "❌ No project ID set." -ForegroundColor $Red
    Write-Host "Please set a project ID: gcloud config set project YOUR_PROJECT_ID"
    exit 1
}

Write-Host "✅ Using project: $ProjectId" -ForegroundColor $Green

# Enable required APIs
Write-Host "📋 Enabling required APIs..." -ForegroundColor $Blue
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

Write-Host "✅ Using region: $Region" -ForegroundColor $Green

# Build and deploy
Write-Host "🔨 Building and deploying to Cloud Run..." -ForegroundColor $Blue

# Build the container
Write-Host "Building container image..."
gcloud builds submit --tag "gcr.io/$ProjectId/topdeck"

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..."
gcloud run deploy topdeck `
    --image "gcr.io/$ProjectId/topdeck" `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --memory 1Gi `
    --cpu 1 `
    --max-instances 10 `
    --timeout 300 `
    --set-env-vars FLASK_ENV=production

# Get the service URL
$ServiceUrl = gcloud run services describe topdeck --region=$Region --format="value(status.url)"

Write-Host ""
Write-Host "🎉 Deployment successful!" -ForegroundColor $Green
Write-Host "=================================================="
Write-Host "Service URL: $ServiceUrl" -ForegroundColor $Blue
Write-Host "Health Check: $ServiceUrl/health" -ForegroundColor $Blue
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor $Yellow
Write-Host "1. Visit the service URL to access your application"
Write-Host "2. Test the health endpoint to ensure it's running"
Write-Host "3. Start scraping some cards!"
Write-Host ""
Write-Host "💡 Useful commands:" -ForegroundColor $Yellow
Write-Host "• View logs: gcloud run services logs read topdeck --region=$Region"
Write-Host "• Update service: gcloud run services update topdeck --region=$Region"
Write-Host "• Delete service: gcloud run services delete topdeck --region=$Region"
Write-Host ""
Write-Host "Happy scraping! 🃏" -ForegroundColor $Green
