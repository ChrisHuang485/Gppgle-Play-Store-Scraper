# Google Play Store Scraper

An automated scraper designed to extract historical and incremental app reviews from the Google Play Store. It features database isolation and incremental synchronization capailities.

## Overview

- **One App one table:** Automatically create a SQL table for each unique APP to ensure data isolation and high query performance.
- **Incremental Upsert:** Allowing the script to run repeatedly without data contamination.
- **Auto-Pagination & Resume:** Automatically saves the pagination token to the local file system. If the script is interrupted or stopped, it resumes exactly where it left off.
- **Throttling:** Utilizes official library throttling to limit request rates, preventing IP bans and 503 errors from Google servers.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Python](https://www.python.org/) (v3.8 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v12 or higher)

- **Configuration:**
  - Create a `.env` file in the root directory of the project with the following content:

    ```env
    # Database Credentials
    DB_USER=postgres
    DB_PASSWORD=your_database_password
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=postgres

    # Target App Configuration
    TARGET_APP=APPNAME_ON_GOOGLE_PLAY
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

1. Data Ingestion
   - Run the scraper to start extracting reviews from the Google Play Store and storing them in the PostgreSQL database. The script will automatically handle table creation:

```bash
   node Scraper.js
   ```

2. Data Analysis & Visualization:
   - Ensure the TARGET_APP in your .env matches the data you wish to analyze, then run:

   ```bash
   python review.py
   ```

   - This will generate rating distributions, review length histograms, and time-series volume charts.
