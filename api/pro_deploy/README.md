# Sunbox Pro Site – Deployment Package

This ZIP contains the PHP backend for your white-label Sunbox Pro site.

## Requirements
- PHP 8.0+
- MySQL 5.7+ / MariaDB 10.3+
- Apache with mod_rewrite (or Nginx with equivalent config)

## Installation Steps

### 1. Create your database
Create a new MySQL database for your pro site (separate from Sunbox's main DB).

### 2. Import the SQL schema
Import `database/pro_site_schema.sql` into your new database.

### 3. Configure your environment
Copy `.env.example` to `.env` and fill in your values:
```
# Your database credentials
DB_HOST=localhost
DB_NAME=your_database_name
DB_USER=your_db_user
DB_PASS=your_db_password

# Your Sunbox API credentials (pre-filled)
SUNBOX_API_URL=https://sunbox-mauritius.com/api
SUNBOX_API_TOKEN={{API_TOKEN}}
SUNBOX_DOMAIN={{DOMAIN}}

# Admin password for your pro site portal
ADMIN_PASSWORD_HASH=   # Generate with: php -r "echo password_hash('your_password', PASSWORD_BCRYPT);"
```

### 4. Deploy the React frontend
The React frontend needs to be built with your API URL:

```bash
# Clone the frontend from the repository or download it
# Set environment variables
export VITE_API_URL=/api
export VITE_PRO_MODE=true
export VITE_SUNBOX_API_URL=https://sunbox-mauritius.com/api

# Build
npm install
npm run build

# Upload the contents of dist/ to your web root
```

### 5. Upload files
Upload all PHP files to your server:
- `/api/` → upload to `public_html/api/`
- `.htaccess` → upload to `public_html/`
- React build files → upload to `public_html/`

### 6. Set permissions
```bash
chmod 755 public_html/api/
chmod 644 public_html/api/*.php
chmod 644 public_html/.env
```

## Your Credentials
- **Domain**: {{DOMAIN}}
- **API Token**: {{API_TOKEN}}
- **Company**: {{COMPANY_NAME}}

Keep your API token secret. If compromised, contact Sunbox to reset it.

## Features
- Public site: models catalogue, configurator, quote form
- Pro admin: manage quotes, clients, settings
- Model overrides: adjust prices and hide models per your preferences
- Credit system: managed by Sunbox (10,000 Rs per pack)
- Catalog mode: automatically activates when credits run out

## Support
Contact Sunbox at: info@sunbox-mauritius.com
