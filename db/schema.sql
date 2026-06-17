-- Run this once against your Azure Database for MySQL Flexible Server.
-- Example: mysql -h <server>.mysql.database.azure.com -u <admin-user> -p < schema.sql

CREATE DATABASE IF NOT EXISTS imagedb
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE imagedb;

CREATE TABLE IF NOT EXISTS images (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  original_name VARCHAR(255)  NOT NULL,
  blob_name     VARCHAR(255)  NOT NULL,
  blob_url      VARCHAR(1024) NOT NULL,
  content_type  VARCHAR(100),
  size_bytes    BIGINT,
  uploaded_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uploaded_at (uploaded_at)
);
