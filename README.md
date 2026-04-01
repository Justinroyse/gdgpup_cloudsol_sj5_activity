# GDG Founder's Edition Shirt Drop

The GDG Founder's Edition Shirt Drop is a flash-sale app built to survive a burst of student traffic without overselling inventory.

## Mission

The deployment is built around five goals:

1. Keep inventory in a transactional Cloud SQL PostgreSQL database.
2. Run the API on Cloud Run so it scales with demand.
3. Host the frontend as a static site on Cloud Storage.
4. Route traffic through a global HTTP Load Balancer.
5. Keep the operator workflow simple enough to run from Google Cloud Console Cloud Shell.

## What’s Included

- `docs/deploy_instructions.md` - the full Cloud Shell-first deployment guide.
- Backend source for the Cloud Run API.
- Frontend source for the static storefront.
- Infrastructure steps for Cloud SQL, Cloud Storage, and Load Balancing.

## Deployment Flow

1. Open **Google Cloud Console Cloud Shell**.
2. Follow `docs/deploy_instructions.md` deploy from the repository root.
3. Set the `postgres` password, deploy the API, update `frontend/script.js` with the API URL, then deploy the frontend and load balancer.

## Operator Notes

- The guide assumes Cloud Shell, not local PowerShell.
- Cloud SQL does not ship with a usable default `postgres` password.
- If `gcloud sql connect` prompts for a password and fails, reset the `postgres` password and try again.

## REQUIRED: Shutdown All Services to avoid additional costs

Run these commands in Cloud Shell if you want to remove everything created by the demo.

```bash
# Delete the load balancer pieces
gcloud compute forwarding-rules delete gdg-http-rule --global
gcloud compute target-http-proxies delete gdg-http-proxy
gcloud compute url-maps delete gdg-app-url-map
gcloud compute backend-services delete gdg-api-backend --global
gcloud compute backend-buckets delete gdg-frontend-backend
gcloud compute network-endpoint-groups delete gdg-api-neg --region=us-central1

# Delete the app services
gcloud run services delete gdg-api --region=us-central1
gcloud storage rm -r gs://gdg-shirt-drop-frontend-YOUR_ID
gcloud sql instances delete gdg-inventory-db
```

If you used a custom domain, remove or update the DNS record separately.
