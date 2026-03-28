# 🚀 GDG Founder's Edition Shirt Drop - GUI Deployment Guide

Welcome to the layout guide for the GDG Founder's Edition flash sale application. This guide will walk you through setting up a horizontally scalable infrastructure on Google Cloud Platform (GCP) to handle a massive surge of concurrent student traffic while preventing any stock discrepancies using purely the **Google Cloud Console (Web Interface)** instead of the terminal.

> [!IMPORTANT]
> Ensure you are logged into [console.cloud.google.com](https://console.cloud.google.com) and have your target project selected in the top-left dropdown next to the Google Cloud logo.

---

## 💾 1. Database Setup (Cloud SQL)

1. **Navigate to Cloud SQL**: Search for `SQL` in the top search bar and click it.
2. **Create Instance**: Click the blue `CREATE INSTANCE` button.
3. **Choose Engine**: Select `Choose PostgreSQL`.
4. **Configure Instance**:
   - **Instance ID**: `gdg-inventory-db`
   - **Password**: Set a secure password and save it somewhere safe.
   - **Database version**: `PostgreSQL 15`
   - **Region**: `us-central1` (Keep as Default)
   - **Zonal availability**: Single zone (for simplicity/cost).
   - Under *Customize your instance* > *Machine Type*, select `Shared core` > `db-f1-micro` (or larger depending on your load assumptions).
5. **Create**: Click `CREATE INSTANCE` at the bottom. (This takes ~5 minutes).
6. **Create Database**: Once created, click on the instance name. Go to the **Databases** tab on the left. Click `CREATE DATABASE`, name it `gdg_shirt_drop`, and click `CREATE`.
7. **Populate Data**: 
   - Go to the **Cloud SQL Studio** tab on the left menu.
   - Login using the user `postgres` and the password you set.
   - Paste the following into the query editor and click **Run**:
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
     ```

---

## ⚙️ 2. Backend API Deployment (Cloud Run)

For local folders, the fastest GUI-assisted way without setting up a full GitHub repository is using the web browser Cloud Shell Editor.

1. **Open Cloud Shell Editor**: Click the `Activate Cloud Shell` icon (`>_`) in the top right corner of the Cloud Console. Once it opens, click `Open Editor` (the pencil/window icon).
2. **Upload Files**: In the left sidebar of the Editor, right-click the empty space and select `Upload Files/Folders`. Upload your local `backend` folder.
3. **Deploy visually using Cloud Code**:
   - Click the `Cloud Code` icon (the `< >` bracket box) on the bottom or left sidebar.
   - Click **Cloud Run** -> **Deploy to Cloud Run**.
   - Make sure your project is selected. Under "Service Name", type `gdg-api`.
   - Under "Region", select `us-central1`.
   - Under "Authentication", select **Allow unauthenticated invocations**.
   - Under "Environment Variables", click **Add Variable**:
     - `DB_USER` = `postgres`
     - `DB_PASSWORD` = `YOUR_DB_PASSWORD`
     - `DB_NAME` = `gdg_shirt_drop`
   - Under "Connections" -> "Cloud SQL Connections", add your `gdg-inventory-db` instance.
   - **IMPORTANT**: Set an environment variable `DB_HOST` equal to `/cloudsql/YOUR_PROJECT_ID:us-central1:gdg-inventory-db`.
4. **Click Deploy**. 

> [!NOTE]
> **Updating the API URL**
> Once the deployment completes in the right sidebar, it will display a **Service URL**. 
> Open your local `frontend/script.js` file, replace the `API_URL` variable with this new URL link, and save the file loudly before continuing to step 3.

---

## 🌐 3. Frontend Deployment (Cloud Storage)

1. **Navigate to Cloud Storage**: Search for `Storage` in the top search map and select **Buckets**.
2. **Create Bucket**: Click `CREATE`. 
3. **Name**: Enter a globally unique name like `gdg-shirt-drop-frontend-YOUR_ID`.
4. **Location Type**: Select `Region` and choose `us-central1`.
5. Click **CREATE** at the bottom (leave other settings default).
6. **Upload Website**: Inside the bucket overview, click `UPLOAD FILES` / `UPLOAD FOLDER` and upload the raw contents of your `frontend` directory (the `index.html`, `script.js`, `styles.css`, and `shirt.png`).
7. **Make Public**:
   - Click the **PERMISSIONS** tab.
   - Click `GRANT ACCESS`.
   - Under *New principles*, type `allUsers`.
   - Under *Select a role*, choose `Cloud Storage` -> `Storage Object Viewer`. Click **Save** and confirm "Allow public access".
8. **Configure as Website**:
   - Go back to the overarching **Buckets** list view.
   - Find your bucket, click the **Three Dots (⋮)** on the far right.
   - Select **Edit website configuration**.
   - Set *Main page* to `index.html` and *Error page* to `index.html`. Click **Save**.

---

## 🛣️ 4. Networking (Global Load Balancer)

We will set up an HTTP Load Balancer to correctly route requests.

1. **Navigate to Load Balancing**: Search for `Load Balancing` in the top bar.
2. **Create**: Click `CREATE LOAD BALANCER`.
3. Select **Application Load Balancer (HTTP/HTTPS)**. Click `Next`.
4. Select **Public facing (external)**. Click `Next`. 
5. Select **Global external Application Load Balancer**. Click `Next`. 
6. Name the Load Balancer `gdg-app-lb` at the top.
7. **Frontend Configuration** (Left Menu): 
   - Name it `frontend-config`.
   - Protocol: `HTTP`. Port: `80`.
   - IP address: Click the dropdown and select `Create IP Address`. Name it `gdg-lb-ip` and save.
   - Click `DONE`.
8. **Backend Configuration** (Left Menu):
   - **Backend Type 1 (API)**: Click `Backend services & backend buckets` dropdown -> `Create a backend service`. 
     - Name: `gdg-api-backend`.
     - Backend Type: Select `Serverless network endpoint group`.
     - Click `New backend` -> Create a new Serverless NEG -> Select **Cloud Run**, select your `gdg-api` service. Click `CREATE` and save the backend service.
   - **Backend Type 2 (Frontend)**: Click the dropdown again -> `Create a backend bucket`.
     - Name: `gdg-frontend-bucket-backend`.
     - Select your Frontend Cloud Storage bucket. Click `CREATE`.
9. **Routing Rules** (Left Menu):
   - Under **Mode**, select `Advanced host and path rule`.
   - Under the `Backends` column matching the `*` (Any) host, set it to route default traffic to your **frontend bucket backend**.
   - Click `ADD PATH RULE`. 
   - In *Paths*, type `/api/*`. 
   - In *Backend*, select your **API backend service**.
10. Click the big blue **CREATE** button at the bottom.

---

## 🎉 5. Verify Your Master Deployment Target

- Google Cloud will take 5-10 minutes to officially propagate your new Global Load Balancer to the edge nodes worldwide.
- Go back to the **Load Balancing** page. Click on your `gdg-app-lb`.
- Find the **IP Address** listed on the dashboard.
- Paste that IP into your browser. 
- **Success!** You will load the static website from the cloud storage bucket, and when clicking the buy button, the router will push the request to your Cloud Run Node API!
