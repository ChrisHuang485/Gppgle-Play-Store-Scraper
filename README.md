# Google Play Store Scraper 

An automated scraper designed to extract historical and incremental app reviews from the Google Play Store and store them in a database.

## Overview

- **Incremental Upsert:** Allowing the script to run repeatedly without data contamination.
- **Auto-Pagination & Resume:** Automatically saves the pagination token to the local file system. If the script is interrupted or stopped, it resumes exactly where it left off.
- **Throttling:** Utilizes official library throttling to limit request rates, preventing IP bans and 503 errors from Google servers.


## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v12 or higher)

- **Database Setup:**
  - Use the init.sql in PostgreSQL client to create the init table.
  
- **Configuration:**
  - Create a `.env` file in the root directory of the project with the following content:
    ```
    # Database Credentials
    DB_USER=postgres
    DB_PASSWORD=your_database_password
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=postgres

    # Target App Configuration
    TARGET_APP=com.instagram.android
    TARGET_COUNTRY=us
    TARGET_LANG=en
    ```

## Installation

1. node.js and PostgreSQL should be installed and running on your machine.
2. Clone the repository and navigate to the project directory.:
   ```bash
   npm install pg google-play-scraper dotenv
   ```

## Usage
1. Run the scraper:
   ```bash
   node Scraper.js
   ```