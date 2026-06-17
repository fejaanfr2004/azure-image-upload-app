# Azure Image Gallery

A cloud-based image upload and management application built using Node.js, Express.js, Azure Blob Storage, Azure App Service, and Azure Database for MySQL.

## Project Overview

Azure Image Gallery allows users to upload image files through a web interface. Uploaded images are stored securely in Azure Blob Storage, while image metadata is stored in Azure Database for MySQL. The application is deployed and hosted on Azure App Service.

## Features

* Upload image files through a web browser
* Store images in Azure Blob Storage
* Save image metadata in MySQL Database
* Retrieve uploaded image information using REST APIs
* Delete images from storage and database
* Health check endpoint for monitoring
* Cloud deployment on Azure App Service

## Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js
* Multer

### Cloud Services

* Azure App Service
* Azure Blob Storage
* Azure Database for MySQL Flexible Server

### Database

* MySQL

## Project Architecture

User → Web Application → Azure Blob Storage

```
                  ↓

         Azure MySQL Database
```

### Workflow

1. User uploads an image.
2. The application validates the file.
3. Image is uploaded to Azure Blob Storage.
4. Image metadata is stored in MySQL.
5. Users can retrieve image information through APIs.

## API Endpoints

### Upload Image

```http
POST /upload
```

Uploads an image and stores metadata.

### Get All Images

```http
GET /images
```

Returns a list of uploaded images.

### Delete Image

```http
DELETE /images/:id
```

Deletes an image from Blob Storage and MySQL.

### Health Check

```http
GET /health
```

Checks application and database connectivity.

## Azure Resources Used

* Azure App Service
* Azure Blob Storage
* Azure Database for MySQL Flexible Server
* Azure Resource Group

## Screenshots

### Application Homepage

<img width="1918" height="972" alt="Screenshot 2026-06-17 194544" src="https://github.com/user-attachments/assets/8bdd2fb7-ec08-4ac2-87df-99e1f05780c8" />


### Azure Blob Storage Container

<img width="1918" height="978" alt="Screenshot 2026-06-17 194602" src="https://github.com/user-attachments/assets/2ed5cf8a-5314-408a-a20c-cf62d26f2ef1" />


### MySQL Database Records

<img width="1917" height="766" alt="Screenshot 2026-06-17 194814" src="https://github.com/user-attachments/assets/97dc6b69-b2b7-4ee2-9bd2-e6df9ee3fc7a" />


### Azure App Service

<img width="1912" height="973" alt="Screenshot 2026-06-17 194708" src="https://github.com/user-attachments/assets/7dcfe3ec-f9cb-4ed1-98d6-966e98e578a5" />


## Learning Outcomes

This project helped in understanding:

* Cloud Application Deployment
* Azure App Service Configuration
* Azure Blob Storage Integration
* Azure Database for MySQL Integration
* REST API Development
* File Upload Handling with Node.js
* Cloud-Based Application Architecture

## Future Enhancements

* User Authentication
* Image Preview Gallery
* Search and Filter Images
* Image Categories
* Role-Based Access Control
* Image Compression and Optimization

## Author

**Fejaan Rathore**

Aspiring Cloud Engineer | Azure Enthusiast | Full Stack Developer

GitHub: https://github.com/fejaanfr2004



This project is developed for learning and educational purposes.
