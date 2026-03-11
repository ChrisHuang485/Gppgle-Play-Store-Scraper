CREATE TABLE play_store_reviews (
    review_id VARCHAR(255) PRIMARY KEY, 
    
    app_id VARCHAR(255) NOT NULL,
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