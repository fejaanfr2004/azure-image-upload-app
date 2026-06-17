# Image Vault — Azure Image Upload App

A small Node.js/Express app for uploading images to **Azure Blob Storage**, with
metadata tracked in **Azure Database for MySQL**, deployed to **Azure App
Service**.

```
public/        Frontend (drag-and-drop upload + gallery)
server.js      Express API: /upload, /images, /images/:id, /health
db/schema.sql  MySQL table definition
.env.example   Required environment variables
```

## 1. Run it locally

```bash
npm install
cp .env.example .env   # then fill in real values
npm start               # http://localhost:8080
```

## 2. Create the Azure resources

These commands assume the [Azure CLI](https://learn.microsoft.com/cli/azure/)
is installed and you've run `az login`. Replace the placeholder names.

```bash
RG=image-vault-rg
LOCATION=eastus

az group create -n $RG -l $LOCATION

# --- Storage account + container -------------------------------------------------
az storage account create -n imagevaultstorage -g $RG -l $LOCATION --sku Standard_LRS
az storage container create -n images \
  --account-name imagevaultstorage --public-access blob

# Grab the connection string for AZURE_STORAGE_CONNECTION_STRING
az storage account show-connection-string -n imagevaultstorage -g $RG

# --- Azure Database for MySQL Flexible Server -------------------------------------
az mysql flexible-server create -g $RG -n imagevault-mysql \
  --location $LOCATION --admin-user mysqladmin --admin-password "<strong-password>" \
  --sku-name Standard_B1ms --tier Burstable --version 8.0 \
  --public-access 0.0.0.0   # allow Azure services; tighten this in production

# Load the schema
mysql -h imagevault-mysql.mysql.database.azure.com -u mysqladmin -p \
  < db/schema.sql

# --- App Service plan + Web App -----------------------------------------------
az appservice plan create -n image-vault-plan -g $RG --sku B1 --is-linux

az webapp create -n image-vault-app -g $RG --plan image-vault-plan \
  --runtime "NODE:20-lts"

# App settings (these become process.env in server.js)
az webapp config appsettings set -n image-vault-app -g $RG --settings \
  DB_HOST="imagevault-mysql.mysql.database.azure.com" \
  DB_USER="mysqladmin" \
  DB_PASSWORD="<strong-password>" \
  DB_NAME="imagedb" \
  AZURE_STORAGE_CONNECTION_STRING="<connection-string-from-above>" \
  AZURE_STORAGE_CONTAINER="images" \
  WEBSITE_RUN_FROM_PACKAGE="1"

# Deploy the code (zip deploy)
zip -r app.zip . -x "node_modules/*" ".git/*"
az webapp deploy -n image-vault-app -g $RG --src-path app.zip --type zip
```

Open `https://image-vault-app.azurewebsites.net` once deployment finishes.

## 3. Load balancing

App Service already load-balances for you — this is the part most setups get
wrong by trying to bolt on an extra Load Balancer resource that isn't needed:

- **Default behavior:** every App Service Plan runs behind Azure's internal
  load balancer automatically. Scale the plan to more than one instance and
  traffic is distributed across them with no config required:

  ```bash
  az appservice plan update -n image-vault-plan -g $RG --number-of-workers 3
  # or enable autoscale rules on CPU/memory via az monitor autoscale
  ```

  Point the health probe at `/health` (Azure Monitor → App Service →
  Diagnose and solve problems → Health check, or `az webapp config set
  --health-check-path /health`) so unhealthy instances get pulled out of
  rotation automatically.

- **If you specifically need a standalone Azure Load Balancer (Layer 4)**
  in front of compute — this is the typical pattern for VMs/VM Scale Sets,
  not for PaaS App Service. App Service only sits behind one if it's deployed
  into an **App Service Environment (ASE)** with an internal load balancer,
  which is an isolated/dedicated-capacity tier mainly used for strict network
  compliance requirements. Most teams don't need this for a standard web app.

- **If the goal is multi-region failover, a WAF, or path-based routing,**
  reach for **Azure Front Door** or **Application Gateway** in front of the
  App Service instead — they understand HTTP/HTTPS (Layer 7), unlike Azure
  Load Balancer, which makes them the right tool for a web app like this one.

## 4. Notes on the code

- Uploaded files are streamed straight from memory to Blob Storage — never
  written to local disk — since App Service instances are stateless and can
  be recycled or load-balanced across at any time.
- MySQL connects over TLS (`ssl: { rejectUnauthorized: true }`), which Azure
  Database for MySQL requires by default.
- The container is created with `access: 'blob'` so individual image URLs
  are publicly readable (needed for `<img src="...">`), while the container
  listing itself stays private. For private images instead, switch to SAS
  tokens generated per-request.
- `/health` checks the DB connection, not just that the process is alive —
  point both App Service's health check and any external probe at it.
