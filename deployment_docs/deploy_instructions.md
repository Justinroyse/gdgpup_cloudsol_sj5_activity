# 🚀 GDG Founder's Edition Shirt Drop - Deployment Guide

Welcome to the layout guide for the GDG Founder's Edition flash sale application. This guide will walk you through setting up a horizontally scalable infrastructure on Google Cloud Platform (GCP) to handle a massive surge of concurrent student traffic while preventing any stock discrepancies.

This guide assumes you are working from **Google Cloud Console Cloud Shell** and starting from the repository root unless a step says otherwise.

> [!IMPORTANT]
> **Prerequisites**
> - Open **Google Cloud Console Cloud Shell** and authenticate there.
> - You have a GCP Project created and billing is enabled.
> - You have set your target project in Cloud Shell using `gcloud config set project YOUR_PROJECT_ID`.

### 0. Clone the Repository
If the repository is not already available in Cloud Shell, clone it first and move into the project root:

```bash
git clone https://github.com/Justinroyse/gdgpup_cloudsol_sj5_activity
cd gdgpup_cloudsol_sj5_activity
```

If Cloud Shell already opened inside the repository, you can skip the clone and just confirm you are at the project root before continuing.

---

## 💾 1. Database Setup (Cloud SQL)

To ensure we never oversell the 500 shirts, we will use Cloud SQL (PostgreSQL) as our single source of truth. By utilizing a Postgres Native Data constraint along with an atomic SQL Update, the database will handle concurrency row-locking natively without complex app scaling rules.

### Provision the Database Instance
Run the following commands to create your PostgreSQL instance and database:

```bash
# Create a Cloud SQL instance (this takes a few minutes)
gcloud sql instances create gdg-inventory-db --database-version=POSTGRES_15 --cpu=1 --memory=3840MB --region=us-central1


# Create the database inside the instance
gcloud sql databases create gdg_shirt_drop --instance=gdg-inventory-db
```

> [!NOTE]
> **Cloud Shell note**
> Use the commands exactly as shown in Cloud Shell. If you paste them into another shell, make sure multiline backslashes stay at the ends of the lines.

### Initialize the Schema
Connect to your new database instance to set up the inventory table.

Before connecting, set a password for the default `postgres` user. Cloud SQL does not provide a usable default password.

```bash
gcloud sql users set-password postgres --instance=gdg-inventory-db --prompt-for-password
```

When prompted, enter the password you want to use for this database account.

```bash
# Connect to the cloud database
gcloud sql connect gdg-inventory-db --user=postgres
```

> [!IMPORTANT]
> **Cloud SQL connect dependency**
> If `gcloud sql connect` fails with `Cloud SQL Proxy (v2) couldn't be found in PATH`, install the required component first:
>
> ```bash
> gcloud components install cloud-sql-proxy
> ```
>
> Then rerun:
>
> ```bash
> gcloud sql connect gdg-inventory-db --user=postgres
> ```
>
> If you then get a `psql` not found error, install the PostgreSQL client for your OS and ensure `psql` is available on your `PATH`.
>
> If `psql` prompts for `Password:` and then shows `fe_sendauth: no password supplied`, the `postgres` password has not been set yet or you pressed Enter without typing one. Run the password command above again, then reconnect and enter that password when prompted.

Once you are loaded into the interactive PostgreSQL prompt, paste these SQL commands:

```sql
CREATE TABLE inventory (
    id VARCHAR(50) PRIMARY KEY, 
    stock INT CHECK (stock >= 0)
);

CREATE TABLE customer_orders (
    email VARCHAR(255) PRIMARY KEY,
    total_quantity INT NOT NULL DEFAULT 0
);

INSERT INTO inventory (id, stock) VALUES ('founders-edition', 500);

-- Type \q to exit the interactive prompt and return to Cloud Shell
\q
```

---

## ⚙️ 2. Backend API Deployment (Cloud Run)

The backend is a high-speed, lightweight Vanilla Node.js API that connects to Cloud SQL. Cloud Run will automatically build and deploy it directly from your source code using Buildpacks without requiring a Dockerfile.

First, navigate to the backend directory:

```bash
cd ~/gdgpup_cloudsol_sj5_activity
cd backend
```

Deploy the API service. Make sure to replace `YOUR_DB_PASSWORD` and `YOUR_PROJECT_ID`:

```bash
gcloud run deploy gdg-api \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars="DB_USER=postgres,DB_PASSWORD=YOUR_DB_PASSWORD,DB_NAME=gdg_shirt_drop" \
    --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:gdg-inventory-db \
    --set-env-vars="DB_HOST=/cloudsql/YOUR_PROJECT_ID:us-central1:gdg-inventory-db"
```

> [!NOTE]
> **Updating the API URL**
> Take note of the **Service URL** link outputted by the final deployment step command above. 
> Update the `API_URL` constant found inside `frontend/script.js` in Cloud Shell with this URL link *before* you execute the final step 3 to deploy the frontend.

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

> [!NOTE]
> The bucket update command must use the `gs://...` bucket URL exactly. Do not replace it with a `file://` path.

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

# Add a host rule and path matcher for your real domain so /api/* routes to the API backend
gcloud compute url-maps add-path-matcher gdg-app-url-map \
    --default-backend-bucket=gdg-frontend-backend \
    --path-matcher-name=api-matcher \
    --path-rules="/api/*=gdg-api-backend" \
    --new-hosts=YOUR_DOMAIN

# If you are testing with a custom domain, replace YOUR_DOMAIN with that fully qualified domain name.
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
