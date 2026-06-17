require('dotenv').config();
const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// ---------------------------------------------------------------------------
// Static frontend
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ---------------------------------------------------------------------------
// Multer: keep the uploaded file in memory, then stream it straight to Blob
// Storage. Nothing is ever written to local disk, which matters because
// App Service instances are stateless and disposable behind the load
// balancer / autoscale rules.
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ---------------------------------------------------------------------------
// MySQL connection pool (Azure Database for MySQL Flexible Server)
// ---------------------------------------------------------------------------
const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: { rejectUnauthorized: true }, // Azure MySQL requires TLS by default
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ---------------------------------------------------------------------------
// Azure Blob Storage client
// ---------------------------------------------------------------------------
if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  console.error('Missing AZURE_STORAGE_CONNECTION_STRING environment variable');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'images';
const containerClient = blobServiceClient.getContainerClient(containerName);

async function ensureContainer() {
  // 'blob' access lets anyone read the individual blob URL directly
  // (needed so <img src="..."> works without extra signing). The container
  // listing itself stays private.
  await containerClient.createIfNotExists();
}

// ---------------------------------------------------------------------------
// Health check
// Point both the App Service health check feature and any Load Balancer /
// Application Gateway probe at this route.
// ---------------------------------------------------------------------------
app.get('/health', async (req, res) => {
  try {
    await dbPool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(503).json({ status: 'unhealthy' });
  }
});

// ---------------------------------------------------------------------------
// Upload an image
// ---------------------------------------------------------------------------
app.post('/upload', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    try {
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const blobName = `${uuidv4()}-${safeName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype }
      });

      const blobUrl = blockBlobClient.url;

      const [result] = await dbPool.execute(
        `INSERT INTO images (original_name, blob_name, blob_url, content_type, size_bytes, uploaded_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [req.file.originalname, blobName, blobUrl, req.file.mimetype, req.file.size]
      );

      res.status(201).json({
        id: result.insertId,
        filename: req.file.originalname,
        url: blobUrl
      });
    } catch (uploadErr) {
      console.error('Upload error:', uploadErr);
      res.status(500).json({ error: 'Upload failed' });
    }
  });
});

// ---------------------------------------------------------------------------
// List recent images
// ---------------------------------------------------------------------------
app.get('/images', async (req, res) => {
  try {
    const [rows] = await dbPool.execute(
      `SELECT id, original_name, blob_url, content_type, size_bytes, uploaded_at
       FROM images ORDER BY uploaded_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// ---------------------------------------------------------------------------
// Delete an image (removes both the blob and the DB row)
// ---------------------------------------------------------------------------
app.delete('/images/:id', async (req, res) => {
  try {
    const [rows] = await dbPool.execute('SELECT blob_name FROM images WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const blockBlobClient = containerClient.getBlockBlobClient(rows[0].blob_name);
    await blockBlobClient.deleteIfExists();
    await dbPool.execute('DELETE FROM images WHERE id = ?', [req.params.id]);

    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
ensureContainer()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize blob container:', err);
    process.exit(1);
  });
