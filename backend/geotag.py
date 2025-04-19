# geo_enrichment.py

import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_anthropic import ChatAnthropic 
from dotenv import load_dotenv
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "climate_risk_intelligence"  
load_dotenv()

llm= ChatAnthropic(model='claude-3-7-sonnet-20250219')

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

HEADERS = {"User-Agent": "ClimateRiskIntelligence/1.0 (contact@example.com)"}


async def extract_location_from_article(article):
    content_snippet = article.get("content", "")[:500]
    title = article.get("title", "")

    prompt = [
SystemMessage(content="""
You are a helpful assistant that extracts a meaningful real-world location **only if the article strongly relates to a geographic event** (e.g. natural disaster, regulation, regional insurance change).

If the article is vague or global in scope, reply with: "N/A".

When appropriate, respond with a single location in the format: City, State or Region, Country.
"""),
        HumanMessage(content=f"""Extract the most relevant real-world location being discussed.

Title: "{title}"

Content:
{content_snippet}

Respond with a single location in the format: City, State (if applicable), Country.""")
    ]

    response = await llm.ainvoke(prompt)
    location = response.content.strip()
    return location


async def geocode_location(location_name):
    async with httpx.AsyncClient(headers=HEADERS) as client:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": location_name, "format": "json", "limit": 1}
        resp = await client.get(url, params=params)
        data = resp.json()
        if not data:
            return None, None, None
        result = data[0]
        return float(result["lat"]), float(result["lon"]), result["display_name"]


async def enrich_article(article):
    location_name = await extract_location_from_article(article)
    if not location_name or location_name.lower() == "n/a":
        print(f"⚠️ No relevant location found.")
        return


    location_name = await extract_location_from_article(article)
    if not location_name:
        print(f"❌ No location found for article {article['_id']}")
        return

    lat, lng, display_name = await geocode_location(location_name)
    if not lat or not lng:
        print(f"❌ Could not geocode location: {location_name}")
        return

    print(f"✅ Geocoded: {location_name} → ({lat}, {lng})")

    await db.articles.update_one(
        {"_id": article["_id"]},
        {
            "$set": {
                "location_name": display_name,
                "lat": lat,
                "lng": lng,
                "geo_source": "nominatim"
            }
        }
    )


async def enrich_all_articles():
    cursor = db.articles.find({
        "lat": {"$exists": False},
        "total_relevance": {"$gte": 8}
    }).limit(100)

    tasks = []
    async for article in cursor:
        tasks.append(enrich_article(article))
    await asyncio.gather(*tasks)



if __name__ == "__main__":
    asyncio.run(enrich_all_articles())
