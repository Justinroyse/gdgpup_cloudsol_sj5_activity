# 🚀 GDG Founder's Edition Shirt Drop - Deployment Guide

Welcome to the layout guide for the GDG Founder's Edition flash sale application. This guide will walk you through setting up a horizontally scalable infrastructure on Google Cloud Platform (GCP) to handle a massive surge of concurrent student traffic while preventing any stock discrepancies.

> [!IMPORTANT]
> **Prerequisites**
> - You have the `gcloud` CLI installed and authenticated (`gcloud auth login`).
> - You have a GCP Project created and billing is enabled.
> - You have set your target project locally using `gcloud config set project YOUR_PROJECT_ID`.

---

## 💾 1. Database Setup (Cloud SQL)

To ensure we never oversell the 500 shirts, we will use Cloud SQL (PostgreSQL) as our single source of truth. By utilizing a Postgres Native Data constraint along with an atomic SQL Update, the database will handle concurrency row-locking natively without complex app scaling rules.

### Provision the Database Instance
Run the following commands to create your PostgreSQL instance and database:

```bash
# Create a Cloud SQL instance (this takes a few minutes)
gcloud sql instances create gdg-inventory-db \
    --database-version=POSTGRES_15 \
    --cpu=1 \
    --memory=3840MB \
    --region=us-central1

# Create the database inside the instance
gcloud sql databases create gdg_paskuhan --instance=gdg-inventory-db
```

### Initialize the Schema
Connect to your new database instance to set up the inventory table.

```bash
# Connect to the cloud database
gcloud sql connect gdg-inventory-db --user=postgres
```

Once you are loaded into the interactive PostgreSQL prompt, paste these SQL commands:

```sql
CREATE TABLE inventory (
    id VARCHAR(50) PRIMARY KEY, 
    stock INT CHECK (stock >= 0)
);

INSERT INTO inventory (id, stock) VALUES ('founders-edition', 500);

-- Type \q to exit the interactive prompt and return to powershell/bash
\q
```

---

## ⚙️ 2. Backend API Deployment (Cloud Run)

The backend is a high-speed, lightweight Vanilla Node.js API that connects to Cloud SQL. Cloud Run will automatically build and deploy it directly from your source code using Buildpacks without requiring a Dockerfile.

First, navigate to the backend directory:

```bash
cd backend
```

Deploy the API service. Make sure to replace `YOUR_DB_PASSWORD` and `YOUR_PROJECT_ID`:

```bash
gcloud run deploy gdg-api \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars="DB_USER=postgres,DB_PASSWORD=YOUR_DB_PASSWORD,DB_NAME=gdg_paskuhan" \
    --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:gdg-inventory-db \
    --set-env-vars="DB_HOST=/cloudsql/YOUR_PROJECT_ID:us-central1:gdg-inventory-db"
```

> [!NOTE]
> **Updating the API URL**
> Take note of the **Service URL** link outputted by the final deployment step command above. 
> You **must** update the `API_URL` constant found inside `frontend/script.js` directly with this URL link *before* you execute the final step 3 to deploy the frontend.

Once you have grabbed the URL and updated your `frontend/script.js`, return to the main root directory:

```bash
cd ..
```

---

## 🌐 3. Frontend Deployment (Cloud Storage)

We operate under an ultra-cache-heavy design for the client facing portal. We will host the static frontend (HTML, CSS, JS, and Images) globally via a Cloud Storage Web Bucket endpoint.

### Create and Configure the Bucket
Replace `YOUR_ID` with something globally unique, like your project ID suffix, as buckets govern universal namespaces across the internet.

```bash
# Create the bucket (must be globally unique)
gcloud storage buckets create gs://gdg-shirt-drop-frontend-YOUR_ID --location=us-central1

# Make the bucket public so users can load the website freely without authentication limits
gcloud storage buckets add-iam-policy-binding gs://gdg-shirt-drop-frontend-YOUR_ID \
    --member="allUsers" \
    --role="roles/storage.objectViewer"
```

### Upload the Website Files
Upload the contents of your newly linked `frontend` directory directly to the bucket, and configure it strictly as a static web property:

```bash
# Upload all the local frontend folder files identically
gcloud storage cp -r frontend/* gs://gdg-shirt-drop-frontend-YOUR_ID/

# Configure the bucket to parse and resolve requests over to index.html natively as the main page lookup
gcloud storage buckets update gs://gdg-shirt-drop-frontend-YOUR_ID \
    --web-main-page-suffix=index.html \
    --web-error-page=index.html
```

---

## 🛣️ 4. Networking (Global Load Balancer)

To route users seamlessly matching URL criteria dynamically between the static frontend storage bucket mapping (`/`) and the Node API backend server processes (`/api/*`), we need an overarching intelligent HTTP Load Balancer.

### Connect the Backend API
Map our Cloud Run containers directly over:

```bash
# Create a Serverless Network Endpoint Group (NEG) for the Backend Node.js Engine
gcloud compute network-endpoint-groups create gdg-api-neg \
    --region=us-central1 \
    --network-endpoint-type=serverless \
    --cloud-run-service=gdg-api

# Create a master Backend Service handling cluster policies
gcloud compute backend-services create gdg-api-backend \
    --global

# Attach the NEG group explicitly to the Backend Service policy layer
gcloud compute backend-services add-backend gdg-api-backend \
    --global \
    --network-endpoint-group=gdg-api-neg \
    --network-endpoint-group-region=us-central1
```

### Connect the Frontend Bucket
Map our frontend HTML logic source over:

```bash
# Set up a Backend Bucket profile instructing the Load Balancer to fetch our bucket
gcloud compute backend-buckets create gdg-frontend-backend \
    --gcs-bucket-name=gdg-shirt-drop-frontend-YOUR_ID
```

### Configure the URL Maps
Let the Load Balancer make smart traffic routing splits based on prefix filters:

```bash
# Create a root URL Map falling back specifically onto the frontend as the default master catch-all handler
gcloud compute url-maps create gdg-app-url-map \
    --default-backend-bucket=gdg-frontend-backend

# Override the rule exclusively for catching /api/ endpoints to redirect completely to the API Backend Server Node.js cluster
gcloud compute url-maps add-path-matcher gdg-app-url-map \
    --default-backend-bucket=gdg-frontend-backend \
    --path-matcher-name=api-matcher \
    --path-rules="/api/*=gdg-api-backend"
```

### Expose Globally to the Open Internet Network
Finally assign an actual dedicated IP.

```bash
# Create the global HTTP Proxy parser linking to the URL intelligent Map
gcloud compute target-http-proxies create gdg-http-proxy \
    --url-map=gdg-app-url-map

# Open the global ports exposing Port 80
gcloud compute forwarding-rules create gdg-http-rule \
    --global \
    --target-http-proxy=gdg-http-proxy \
    --ports=80
```

---

## 🎉 5. Verify Your Master Deployment Target

Everything routing-related is functionally deployed! Retrieve your final exclusive Global Load Balancer IP address pointer by resolving this configuration command:

```bash
gcloud compute forwarding-rules describe gdg-http-rule --global --format="value(IPAddress)"
```

**Success!** You can now freely share the IP address URL outputted above via the main branch out to thousands of test students allowing your massive drop phase test environment safely without dropping below 0 shirt inventory variables.
