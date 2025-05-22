# Morse Learn Deployment Guide

This guide explains how to deploy the Morse Learn application to DigitalOcean App Platform as a single app with both the static site and API service.

## Overview

The Morse Learn application consists of two components:

1. **Static Site**: The main frontend application built with Parcel
2. **API Service**: A Node.js Express server that handles analytics data

Both components are deployed as a single application on DigitalOcean App Platform, with proper routing to direct requests to the appropriate component.

## Deployment Steps

### Using the App Spec YAML

1. Make sure you have the DigitalOcean CLI installed and authenticated:
   ```
   doctl auth init
   ```

2. Review the `app-spec.yaml` file in the root directory to ensure it has the correct configuration:
   - The API service is configured to handle requests to `/api/*`
   - The static site is configured to handle all other requests
   - Database credentials are correctly set

3. Deploy the app using the DigitalOcean CLI:
   ```
   doctl apps create --spec app-spec.yaml
   ```

4. To update an existing app:
   ```
   doctl apps update YOUR_APP_ID --spec app-spec.yaml
   ```

### Manual Deployment

If you prefer to deploy through the DigitalOcean web interface:

1. Create a new app on DigitalOcean App Platform
2. Connect your GitHub repository
3. Add two components:

   #### Component 1: API Service
   - Type: Web Service
   - Source Directory: `/api-service`
   - Build Command: `npm install`
   - Run Command: `npm start`
   - HTTP Port: 3000
   - Routes: `/api`
   - Environment Variables: Add all variables from the `api-service/.env` file

   #### Component 2: Static Site
   - Type: Static Site
   - Source Directory: `/` (root)
   - Build Command: `npm install && npm run build`
   - Output Directory: `dist`
   - Routes: `/`

4. Deploy the app

## Important Notes

1. **Database Credentials**: The `app-spec.yaml` file contains sensitive database credentials. It has been added to `.gitignore` to prevent it from being committed to the repository. Always keep your credentials secure and never commit them to version control.

2. **CORS Configuration**: The API service is configured to accept requests only from the frontend URL. Make sure the `FRONTEND_URL` environment variable is set correctly.

3. **SSL Certificate**: The API service is configured to use SSL for database connections. The certificate path is set to `/etc/ssl/certs/ca-certificates.crt`, which is the standard location on DigitalOcean App Platform.

## Troubleshooting

### API Endpoints Not Working

If the API endpoints are not working, check the following:

1. Make sure the API service is running correctly by checking the logs in the DigitalOcean App Platform dashboard.
2. Verify that the routes are configured correctly in the `app-spec.yaml` file.
3. Check that the CORS configuration is correct and the `FRONTEND_URL` environment variable is set to the correct value.

### Static Site Not Loading

If the static site is not loading, check the following:

1. Make sure the build command is correct and the output directory is set to `dist`.
2. Check the build logs in the DigitalOcean App Platform dashboard for any errors.
3. Verify that the routes are configured correctly in the `app-spec.yaml` file.

### Database Connection Issues

If there are issues connecting to the database, check the following:

1. Verify that the database credentials are correct in the `app-spec.yaml` file.
2. Make sure the SSL certificate path is correct.
3. Check that the database is accessible from the DigitalOcean App Platform.
