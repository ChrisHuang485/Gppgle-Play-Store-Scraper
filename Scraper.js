require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

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
        tokenPath: process.env.TOKEN_PATH || './resume_token.txt',
        throttleLimit: 1
    }
};

async function runAdvancedScraper() {
    const gplay = (await import('google-play-scraper')).default;

    const dbClient = new Client(CONFIG.db);

    await dbClient.connect();
    console.log("Connect Success\nStarting scraping ${CONFIG.target.appId} review...\n");

    const insertSQL = `
        INSERT INTO play_store_reviews (
            review_id, app_id, country, lang, 
            user_name, user_image, score, review_text, 
            thumbs_up, app_version, review_at, 
            reply_text, reply_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (review_id) DO NOTHING
        RETURNING review_id;
    `;

    let nextToken = null;      
    let pageCount = 0;         
    let totalNewCount = 0;     
    let stopScraping = false;  

    let isResuming = false;
    if (fs.existsSync(CONFIG.sys.tokenPath)) {
        nextToken = fs.readFileSync(CONFIG.sys.tokenPath, 'utf8');
        isResuming = true;
        console.log(`\nResume Downloading...\n`);
    } else {
        console.log(`\nNormal Scraping...\n`);
    }

    while (!stopScraping) {
        pageCount++;
        console.log(`Asking ${pageCount} page reviews data`);

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
                console.log("No more review. Ending...");
                break; 
            }

            let pageNewCount = 0;

            for (let review of dataList) {
                const values = [
                    review.id, CONFIG.target.appId, CONFIG.target.country, CONFIG.target.lang,
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
                    // console.log(`Getting elder review (ID: ${review.id}), ending...`);
                    // stopScraping = true;
                    // break;
                    if (!isResuming) {
                        console.log(`Getting elder review (ID: ${review.id}), ending...`);
                        stopScraping = true;
                        break; 
                    }
                }
            }

            console.log(` ${pageCount} page done, new reviews: ${pageNewCount}.`);

            if (stopScraping) {
                break; 
            }

            if (!nextToken) {
                console.log("No more token...");
                if (fs.existsSync(path)) {
                    fs.unlinkSync(path); 
                }
                break;
            }


        } catch (error) {
            console.error(`Error, ${pageCount} page`, error.message);
            break; 
        }
    }

    console.log(`\nSuccess. Adding ${totalNewCount}  new reviews`);
    await dbClient.end();
    console.log("Database closed");
}

runAdvancedScraper();