import pandas as pd
from sqlalchemy import create_engine
import matplotlib.pyplot as plt
import seaborn as sns
import re
from collections import Counter
import nltk
from nltk.corpus import stopwords
import matplotlib.dates as mdates
import os
from dotenv import load_dotenv


nltk.download('stopwords')
stop_words = set(stopwords.words('english'))


load_dotenv()
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD') 
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'postgres')
APP_ID = os.getenv('TARGET_APP', 'com.instagram.android')
TABLE_NAME = f"reviews_{APP_ID.replace('.', '_')}"

db_url = f'postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
engine = create_engine(db_url)
query = f"SELECT * FROM {TABLE_NAME} ORDER BY review_at DESC;"

try:
    df = pd.read_sql(query, engine)

    print(f"---------------------\n")
    print(f"Table: {TABLE_NAME}")
    print(f"Loaded {len(df)} data\n")
except Exception as e:
    print(f"Error! Can't load {TABLE_NAME}.")
    print(f"{e}")
    exit()

df['review_at'] = pd.to_datetime(df['review_at'], utc=True)
print("---Basic dataset statistics---")
print(f"Total reviews: {len(df)}")
print(f"Unique users: {df['user_name'].nunique()}")
if not df.empty:
    print(f"Time: From {df['review_at'].min().strftime('%Y-%m-%d')} to {df['review_at'].max().strftime('%Y-%m-%d')}")


duplicates = df.duplicated(subset=['review_id']).sum()
print(f"Number of repeated reviews: {duplicates}")


print("\nMissing values:")
print(df.isnull().sum()[df.isnull().sum() > 0])


df['review_text'] = df['review_text'].fillna('')
df['text_length'] = df['review_text'].apply(len)

print("\n---Review length analysis---")
print(f"Average length: {df['text_length'].mean():.2f}")
print(f"Median length: {df['text_length'].median():.2f}")

df['word_count'] = df['review_text'].apply(lambda x: len(str(x).split()))
short_reviews = len(df[df['word_count'] < 3])
print(f"short reviews with fewer than 3: {short_reviews} ( {short_reviews/len(df)*100:.2f}%)")



sns.set_theme(style="whitegrid")
plt.figure(figsize=(18, 5))

# Pic 1: Rating distribution
plt.subplot(1, 3, 1)
ax = sns.countplot(data=df, x='score', hue='score', palette='viridis', legend=False)
plt.title('Rating Distribution (1-5 Stars)')
plt.xlabel('Star Rating')
plt.ylabel('Count')

for p in ax.patches:
    percentage = f'{100 * p.get_height() / len(df):.1f}%'
    ax.annotate(percentage, (p.get_x() + p.get_width() / 2., p.get_height()), 
                ha='center', va='bottom')

# Pic 2: Review length analysis
plt.subplot(1, 3, 2)
sns.histplot(df['text_length'], bins=50, kde=True, color='skyblue')
plt.xlim(0, 500)
plt.title('Review Length Distribution')
plt.xlabel('Review Length (Characters)')

# Pic 3: Time-based patterns (Per week)
ax3 = plt.subplot(1, 3, 3)
df['review_at'] = pd.to_datetime(df['review_at'], utc=True)
time_series = df.set_index('review_at').resample('W').size()
ax3.plot(time_series.index, time_series.values, color='coral', marker='o', markersize=4)
ax3.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
plt.setp(ax3.xaxis.get_majorticklabels(), rotation=45, ha="right")
plt.title('Review Volume Over Time (Weekly)')
plt.xlabel('Date')
plt.ylabel('Number of Reviews')

plt.tight_layout()



print("\n---Simple text observations---")
def clean_and_tokenize(text):
    text = re.sub(r'[^a-zA-Z\s]', '', text.lower())
    words = text.split()
    return [w for w in words if w not in stop_words and len(w) > 2]

all_words = []
for text in df['review_text']:
    all_words.extend(clean_and_tokenize(text))

# Collect common words
word_counts = Counter(all_words)
common_words = word_counts.most_common(20)

print("The 20 most frequently used words:")
for word, count in common_words:
    print(f"{word}: {count}")

plt.show()

# bad_reviews = df[df['score'] <= 2]
# bad_words = []
# for text in bad_reviews['review_text']:
#     bad_words.extend(clean_and_tokenize(text))
# print("\nThe 10 most frequently occurring words in the 1-2 star reviews:")
# print(Counter(bad_words).most_common(10))