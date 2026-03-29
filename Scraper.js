require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const CONFIG = {
    db: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'postgres',
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT) || 5432,
    },

    target: {
        appId: process.env.TARGET_APP || 'com.instagram.android',
        country: process.env.TARGET_COUNTRY || 'us',
        lang: process.env.TARGET_LANG || 'en',
    },

    sys: {
        tokenPath: `./tokens/resume_token_${process.env.TARGET_APP.replace(/\./g, '_')}.txt`,
        throttleLimit: 1
    }
};

const TABLE_NAME = `reviews_${CONFIG.target.appId.replace(/\./g, '_')}`;
async function setupDatabase(dbClient) {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            review_id VARCHAR(255) PRIMARY KEY, 
            country VARCHAR(10) NOT NULL,
            lang VARCHAR(10) NOT NULL,
            user_name VARCHAR(255),
            user_image TEXT,
            score INTEGER CHECK (score >= 1 AND score <= 5),
            review_text TEXT,
            thumbs_up INTEGER DEFAULT 0,
            app_version VARCHAR(100),
            review_at TIMESTAMP WITH TIME ZONE NOT NULL, 
            reply_text TEXT,
            reply_at TIMESTAMP WITH TIME ZONE,
            fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_date ON ${TABLE_NAME}(review_at);
        CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_score ON ${TABLE_NAME}(score);
    `;
    await dbClient.query(createTableSQL);
    console.log(`Table Checked/Created: ${TABLE_NAME}`);
}


async function runAdvancedScraper() {
    const gplay = (await import('google-play-scraper')).default;

    const dbClient = new Client(CONFIG.db);

    try{
        await dbClient.connect();
        await setupDatabase(dbClient);
        console.log(`Connect Success\nStarting scraping ${CONFIG.target.appId} review into [${TABLE_NAME}]\n`);
        const insertSQL = `
            INSERT INTO ${TABLE_NAME} (
                review_id, country, lang, 
                user_name, user_image, score, review_text, 
                thumbs_up, app_version, review_at, 
                reply_text, reply_at
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (review_id) DO NOTHING
            RETURNING review_id;
        `;
        let nextToken = null;      
        let pageCount = 0;         
        let totalNewCount = 0;     
        let stopScraping = false;  

        if (!fs.existsSync('./tokens')) fs.mkdirSync('./tokens');

        if (fs.existsSync(CONFIG.sys.tokenPath)) {
            nextToken = fs.readFileSync(CONFIG.sys.tokenPath, 'utf8');
            console.log(`Resume from token found at ${CONFIG.sys.tokenPath}`);
        }

        while (!stopScraping) {
            pageCount++;
            console.log(`Fetching page ${pageCount}...`);
            try {
                const response = await gplay.reviews({
                    appId: CONFIG.target.appId,
                    sort: gplay.sort.NEWEST, //2 
                    paginate: true,
                    nextPaginationToken: nextToken,
                    lang: CONFIG.target.lang,
                    country: CONFIG.target.country,
                    throttle: CONFIG.sys.throttleLimit
                });

                const dataList = response.data;
                nextToken = response.nextPaginationToken;

                if (nextToken) {
                    fs.writeFileSync(CONFIG.sys.tokenPath, nextToken);
                }

                if (!dataList || dataList.length === 0) {
                    console.log("No more reviews found.");
                    break; 
                }

                let pageNewCount = 0;

                for (let review of dataList) {
                    const values = [
                        review.id, CONFIG.target.country, CONFIG.target.lang,
                        review.userName, review.userImage, review.score, review.text,
                        review.thumbsUp, review.version || 'unknown',
                        new Date(review.date),
                        review.replyText || null,
                        review.replyDate ? new Date(review.replyDate) : null
                    ];

                    const result = await dbClient.query(insertSQL, values);

                    if (result.rowCount > 0) {
                        pageNewCount++;
                        totalNewCount++;
                    } else {
                        if (!fs.existsSync(CONFIG.sys.tokenPath)) {
                            console.log(`Reached existing review (ID: ${review.id}), ending...`);
                            stopScraping = true;
                            break; 
                        }
                    }
                }

                console.log(` ${pageCount} page done, new reviews: ${pageNewCount}.`);

                if (stopScraping || !nextToken) {
                    if(!nextToken && fs.existsSync(CONFIG.sys.tokenPath)){
                        fs.unlinkSync(CONFIG.sys.tokenPath);
                    }
                    break; 
                }


            } catch (error) {
                console.error(`Error, ${pageCount} page`, error.message);
                break; 
            }
    }
    console.log(`\nSuccess. Adding ${totalNewCount}  new reviews`);
    




    } catch (error) {
        console.error(`Fatal Error:`, error.message);
    } finally {
        await dbClient.end();
        console.log("Database closed.");
    }
}

runAdvancedScraper();