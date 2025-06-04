# Morse Learn API Service

This is the API service for the Morse Learn application. It handles analytics data collection and storage in a MySQL database.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on the `.env.example` file:
   ```
   cp .env.example .env
   ```

3. Set up the database:
   ```
   mysql -h acecentreorguk-do-user-1044927-0.b.db.ondigitalocean.com -u morselearn -p -P 25060 --ssl-mode=REQUIRED morselearn < setup-database.sql
   ```

4. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Health Check
- `GET /api/health`
  - Returns a 200 status code with a JSON response: `{ "status": "ok" }`

### Analytics
- `POST /api/analytics`
  - Accepts analytics data from the client
  - Stores the data in the MySQL database
  - Returns a 200 status code with a JSON response: `{ "message": "Successfully logged progress for {userIdentifier}" }`

### Public Data Export
- `GET /data-export` (🆓 Public Access)
  - Serves a public HTML interface for accessing data dumps and statistics
  - Provides download links and live statistics display
  - No password required for viewing the interface

- `GET /api/data-dump` (🔒 Password Protected, Paginated)
  - Returns anonymized training data in JSON format
  - Supports pagination: `?page=1&limit=1000` (max 10,000 per request)
  - Includes metadata about the export and pagination info
  - User identifiers are anonymized for privacy

- `GET /api/data-dump/csv` (🔒 Password Protected, Paginated)
  - Returns anonymized training data in CSV format
  - Supports pagination: `?page=1&limit=5000` (max 50,000 per request)
  - Suitable for spreadsheet applications and data analysis tools
  - Automatically downloads as a file with page number

- `GET /api/data-sample` (🆓 Free Access)
  - Returns a sample of 100 records for evaluation
  - No password required
  - Perfect for testing and small-scale analysis

- `GET /api/stats` (🆓 Free Access, Cached)
  - Returns comprehensive statistics about Morse Learn usage
  - Includes user counts, progress distributions, settings preferences
  - Provides time-based analytics and completion rates
  - Cached for 10 minutes to reduce database load

### Password Protection
Set the `DATA_EXPORT_PASSWORD` environment variable to enable password protection for data exports. Password can be provided via:
- Query parameter: `?password=YOUR_PASSWORD`
- HTTP header: `X-Data-Export-Password: YOUR_PASSWORD`

## Deployment

### DigitalOcean App Platform

#### Using the App Spec YAML

1. Create your `app-spec.yaml` file from the template:
   ```
   cp app-spec.template.yaml app-spec.yaml
   ```

2. Edit the `app-spec.yaml` file to include your actual database credentials:
   - Replace `your-db-host.example.com` with your actual database host
   - Replace `your_db_user` with your actual database username
   - Replace `your_db_name` with your actual database name
   - Replace `your_db_password` with your actual database password

3. Deploy the app using the DigitalOcean CLI:
   ```
   doctl apps create --spec app-spec.yaml
   ```

4. To update an existing app:
   ```
   doctl apps update YOUR_APP_ID --spec app-spec.yaml
   ```

> **IMPORTANT SECURITY NOTE**: The `app-spec.yaml` file contains sensitive database credentials. It has been added to `.gitignore` to prevent it from being committed to the repository. Always keep your credentials secure and never commit them to version control.

#### Manual Deployment

1. Create a new app on DigitalOcean App Platform
2. Connect your GitHub repository
3. Configure the app:
   - Type: Web Service
   - Source Directory: `/api-service`
   - Build Command: `npm install`
   - Run Command: `npm start`
   - Environment Variables: Add all variables from `.env` file

4. Deploy the app
