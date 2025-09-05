# Google Cloud Run Deployment Guide

This guide will help you deploy TopDeck to Google Cloud Run, a serverless platform that automatically scales your application.

## Prerequisites

1. **Google Cloud Account**
   - Sign up at [cloud.google.com](https://cloud.google.com)
   - Enable billing (Cloud Run has a generous free tier)

2. **Google Cloud CLI**
   - Install from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
   - Authenticate: `gcloud auth login`

3. **Docker** (optional, for local testing)
   - Install from [docker.com](https://docker.com)

## Quick Deployment

### Option 1: Automated Script (Recommended)

**For Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**For Windows PowerShell:**
```powershell
.\deploy.ps1
```

### Option 2: Manual Deployment

1. **Set up your project:**
   ```bash
   # Set your project ID
   gcloud config set project YOUR_PROJECT_ID
   
   # Enable required APIs
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

2. **Build and deploy:**
   ```bash
   # Build the container
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/topdeck
   
   # Deploy to Cloud Run
   gcloud run deploy topdeck \
     --image gcr.io/YOUR_PROJECT_ID/topdeck \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --memory 1Gi \
     --cpu 1 \
     --max-instances 10 \
     --timeout 300
   ```

## Configuration Options

### Environment Variables

You can set environment variables during deployment:

```bash
gcloud run services update topdeck \
  --region us-central1 \
  --set-env-vars FLASK_ENV=production,REQUEST_DELAY=2,MAX_PAGES_PER_SESSION=20
```

### Resource Limits

- **Memory**: 1Gi (recommended for scraping operations)
- **CPU**: 1 (sufficient for most use cases)
- **Timeout**: 300 seconds (5 minutes max per request)
- **Max Instances**: 10 (prevents runaway costs)

### Regions

Popular regions for Cloud Run:
- `us-central1` (Iowa) - Lowest latency for US
- `us-east1` (South Carolina)
- `europe-west1` (Belgium)
- `asia-southeast1` (Singapore)

## Cost Optimization

### Free Tier
- 2 million requests per month
- 400,000 GB-seconds of memory
- 200,000 vCPU-seconds

### Cost Management
- Set `--max-instances` to limit scaling
- Use `--cpu` and `--memory` efficiently
- Monitor usage in Cloud Console

## Database Considerations

### Current Setup (SQLite)
- ✅ Simple and works out of the box
- ❌ Data is lost when container restarts
- ❌ Not suitable for production with multiple users

### For Production (Recommended)
Consider using Cloud SQL (PostgreSQL):

1. **Create Cloud SQL instance:**
   ```bash
   gcloud sql instances create tcgplayer-db \
     --database-version=POSTGRES_13 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. **Create database:**
   ```bash
   gcloud sql databases create cards --instance=tcgplayer-db
   ```

3. **Update topdeck.py to use PostgreSQL:**
   - Install `psycopg2-binary` in requirements.txt
   - Update database connection code
   - Set `DATABASE_URL` environment variable

## Monitoring and Logs

### View Logs
```bash
# Real-time logs
gcloud run services logs tail topdeck --region us-central1

# Historical logs
gcloud run services logs read topdeck --region us-central1
```

### Cloud Console
- Visit [console.cloud.google.com](https://console.cloud.google.com)
- Navigate to Cloud Run
- Select your service for detailed metrics

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to git
   - Use Cloud Secret Manager for sensitive data

2. **Network Security**
   - Use `--no-allow-unauthenticated` for private services
   - Set up IAM policies for access control

3. **Container Security**
   - Use non-root user (already configured in Dockerfile)
   - Keep base images updated
   - Scan for vulnerabilities

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   gcloud builds log --stream
   ```

2. **Service Won't Start**
   ```bash
   # Check service logs
   gcloud run services logs read topdeck --region us-central1
   ```

3. **Memory Issues**
   - Increase memory allocation
   - Optimize scraping code
   - Reduce concurrent operations

4. **Timeout Errors**
   - Increase timeout setting
   - Optimize scraping performance
   - Reduce page range per request

### Health Checks

Test your deployment:
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe topdeck --region=us-central1 --format="value(status.url)")

# Test health endpoint
curl $SERVICE_URL/health
```

## Advanced Configuration

### Custom Domain
```bash
# Map custom domain
gcloud run domain-mappings create \
  --service topdeck \
  --domain your-domain.com \
  --region us-central1
```

### CI/CD with Cloud Build
The included `cloudbuild.yaml` enables automatic deployments:

1. Connect your repository to Cloud Build
2. Push changes to trigger automatic deployment
3. Monitor builds in Cloud Console

### Load Balancing
For high-traffic applications:
```bash
# Create load balancer
gcloud compute backend-services create tcgplayer-backend \
  --global \
  --load-balancing-scheme=EXTERNAL
```

## Scaling Considerations

### Automatic Scaling
- Cloud Run scales to zero when not in use
- Scales up automatically based on traffic
- No manual intervention required

### Performance Tuning
- Adjust memory and CPU based on usage
- Optimize scraping algorithms
- Use connection pooling for databases
- Implement caching strategies

## Backup and Recovery

### Database Backups
If using Cloud SQL:
```bash
# Create backup
gcloud sql backups create --instance=tcgplayer-db
```

### Application Data
- SQLite files are ephemeral in Cloud Run
- Consider external storage for persistent data
- Implement data export functionality

## Support and Resources

- **Documentation**: [cloud.google.com/run/docs](https://cloud.google.com/run/docs)
- **Community**: [Google Cloud Community](https://cloud.google.com/community)
- **Support**: Available through Google Cloud Console

## Example Deployment Commands

```bash
# Complete deployment example
gcloud config set project my-tcgplayer-project
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
gcloud builds submit --tag gcr.io/my-tcgplayer-project/topdeck
gcloud run deploy topdeck \
  --image gcr.io/my-tcgplayer-project/topdeck \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 5 \
  --timeout 300 \
  --set-env-vars FLASK_ENV=production,REQUEST_DELAY=2
```

Your TopDeck will be available at the provided Cloud Run URL!
