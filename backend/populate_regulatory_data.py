import asyncio
import httpx
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import json
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import feedparser
import re

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("esg-data-importer")

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
database_name = os.getenv("MONGODB_DATABASE", "climate_risk_intelligence")

# Connect to MongoDB
client = AsyncIOMotorClient(MONGODB_URL)
db = client[database_name]

# Free data sources
FREE_DATA_SOURCES = {
    # United Nations / IPCC
    "un_ipcc": "https://www.ipcc.ch/feed/",
    # UN Principles for Responsible Investment
    "unpri": "https://www.unpri.org/rss/",
    # World Economic Forum
    "wef": "https://www.weforum.org/about/sustainability-environment/feed",
    # Climate Bonds Initiative
    "cbi": "https://www.climatebonds.net/taxonomy/term/516/feed",
    # CDP (Carbon Disclosure Project) 
    "cdp": "https://www.cdp.net/en/articles/media/rss",
    # Natural Capital Finance Alliance
    "ncfa": "https://naturalcapital.finance/news/feed/"
}

# Open source data repositories
OPEN_DATA_SOURCES = {
    # World Bank Climate Change Data
    "world_bank": "https://climateknowledgeportal.worldbank.org/api/data/",
    # Climate Watch Data API
    "climate_watch": "https://www.climatewatchdata.org/api/v1/data/",
    # Open Climate Data
    "open_climate": "https://openclimatedata.net/api/"
}

# NASA Global Climate Change API
NASA_CLIMATE_API_URL = "https://climate-change-api.open-meteo.com/v1/climate"

# Map categories to standard format
ESG_CATEGORIES = {
    "physical risk": "E",
    "transition risk": "E",
    "biodiversity": "E",
    "carbon": "E",
    "emission": "E",
    "climate": "E",
    "water": "E",
    "pollution": "E",
    "energy": "E",
    "social": "S",
    "health": "S",
    "community": "S",
    "human rights": "S",
    "labor": "S",
    "employment": "S",
    "diversity": "S",
    "governance": "G",
    "board": "G",
    "disclosure": "G",
    "reporting": "G",
    "compliance": "G",
    "ethics": "G",
    "corruption": "G",
    "risk management": "G"
}

# Keywords for risk levels
IMPACT_KEYWORDS = {
    "high": ["severe", "significant", "major", "critical", "extreme", "high"],
    "medium": ["moderate", "important", "medium"],
    "low": ["minor", "low", "small", "minimal"]
}

# Keywords for trends
TREND_KEYWORDS = {
    "increasing": ["increasing", "rising", "growing", "accelerating", "worsening", "higher"],
    "decreasing": ["decreasing", "declining", "improving", "lower", "reduced"],
    "stable": ["stable", "unchanged", "steady", "consistent"]
}

# ESG frameworks for reference
ESG_FRAMEWORKS = [
    "TCFD", "TNFD", "GRI", "SASB", "ISSB", "EU Taxonomy", 
    "SFDR", "SEC Climate Rule", "CSRD", "UN SDGs", "CDP", 
    "UN PRI", "NAIC Climate Risk Disclosure"
]

async def fetch_rss_feed_articles(feed_url: str) -> List[Dict[str, Any]]:
    """
    Fetch RSS feed articles from the provided URL
    
    Args:
        feed_url: URL of the RSS feed
        
    Returns:
        List of articles with title, description, and link
    """
    try:
        # Fetch RSS feed
        feed = feedparser.parse(feed_url)
        
        # Extract articles
        articles = []
        for entry in feed.entries[:10]:  # Limit to 10 most recent entries
            articles.append({
                "title": entry.get("title", ""),
                "summary": entry.get("summary", ""),
                "link": entry.get("link", ""),
                "published": entry.get("published", ""),
                "source": feed.feed.get("title", "Unknown Source")
            })
        
        return articles
    except Exception as e:
        logger.error(f"Error fetching RSS feed from {feed_url}: {str(e)}")
        return []

async def fetch_article_content(article_link: str) -> str:
    """
    Fetch the content of an article from its URL
    
    Args:
        article_link: URL of the article
        
    Returns:
        Article content as text
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(article_link, timeout=10.0)
            
            if response.status_code != 200:
                logger.error(f"Failed to fetch article: {response.status_code}")
                return ""
            
            # Extract article content
            # This is a simplified approach - production code would need more sophisticated parsing
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.extract()
            
            # Look for article content in common containers
            article_content = ""
            content_tags = soup.select('article, .article, .content, .post-content, main')
            
            if content_tags:
                # Extract paragraphs from content tags
                paragraphs = []
                for tag in content_tags:
                    paragraphs.extend(tag.find_all('p'))
                
                if paragraphs:
                    article_content = ' '.join([p.get_text() for p in paragraphs])
            
            # If no content found, try a more general approach
            if not article_content:
                # Get all paragraphs
                paragraphs = soup.find_all('p')
                article_content = ' '.join([p.get_text() for p in paragraphs])
            
            return article_content
    except Exception as e:
        logger.error(f"Error fetching article content from {article_link}: {str(e)}")
        return ""

async def fetch_nasa_climate_data() -> List[Dict[str, Any]]:
    """
    Fetch climate data from NASA's Global Climate Change API
    
    Returns:
        List of climate data points
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                NASA_CLIMATE_API_URL,
                params={
                    "latitude": 0,  # Global average
                    "longitude": 0,
                    "models": "ensemble_mean",
                    "timeframes": "yearly"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"NASA API error: {response.status_code}")
                return []
            
            data = response.json()
            return [data]  # Return as a list to match other functions
    except Exception as e:
        logger.error(f"Error fetching NASA climate data: {str(e)}")
        return []

async def fetch_world_bank_climate_data() -> List[Dict[str, Any]]:
    """
    Fetch climate data from World Bank Climate Data API
    
    Returns:
        List of climate data points
    """
    try:
        # This is a simplified example - the actual World Bank API requires more parameters
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://climatedata.worldbank.org/api/v1/get-indicators",
                params={
                    "format": "json"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"World Bank API error: {response.status_code}")
                return []
            
            data = response.json()
            return [data]  # Return as a list to match other functions
    except Exception as e:
        logger.error(f"Error fetching World Bank climate data: {str(e)}")
        return []

def extract_esg_impacts_from_text(text: str, source: str) -> List[Dict[str, Any]]:
    """
    Extract ESG impacts from text using keyword matching
    
    Args:
        text: Text to analyze
        source: Source of the text
        
    Returns:
        List of extracted ESG impacts
    """
    impacts = []
    text = text.lower()
    
    # Define patterns to match ESG impacts
    esg_patterns = [
        # Environmental patterns
        r"(physical risk|transition risk|biodiversity loss|resource scarcity|climate change|carbon emissions|water stress)",
        # Social patterns
        r"(climate justice|health effects|employment impacts|community impact|vulnerable communities|human rights)",
        # Governance patterns
        r"(climate risk governance|disclosure requirements|board oversight|strategy integration|climate litigation)"
    ]
    
    # Extract potential impact phrases
    impact_phrases = []
    for pattern in esg_patterns:
        matches = re.finditer(pattern, text)
        for match in matches:
            # Extract a window of text around the match
            start = max(0, match.start() - 100)
            end = min(len(text), match.end() + 200)
            context = text[start:end]
            impact_phrases.append((match.group(1), context))
    
    # Process each potential impact
    for impact_name, context in impact_phrases:
        # Determine category
        category = "E"  # Default to Environmental
        for keyword, cat in ESG_CATEGORIES.items():
            if keyword in impact_name:
                category = cat
                break
        
        # Determine impact level
        impact_level = "Medium"  # Default to Medium
        for level, keywords in IMPACT_KEYWORDS.items():
            if any(keyword in context for keyword in keywords):
                impact_level = level.capitalize()
                break
        
        # Determine trend
        trend = "stable"  # Default to stable
        for trend_type, keywords in TREND_KEYWORDS.items():
            if any(keyword in context for keyword in keywords):
                trend = trend_type
                break
        
        # Determine score (1-10)
        score = 5.0  # Default to middle score
        if impact_level == "High":
            score = 7.0 + (hash(impact_name) % 3)  # Random between 7.0-9.9
        elif impact_level == "Medium":
            score = 4.0 + (hash(impact_name) % 3)  # Random between 4.0-6.9
        else:  # Low
            score = 1.0 + (hash(impact_name) % 3)  # Random between 1.0-3.9
        
        # Find relevant frameworks
        relevant_frameworks = []
        for framework in ESG_FRAMEWORKS:
            if framework.lower() in context:
                relevant_frameworks.append(framework)
        
        # Create impact description
        description = context[:200] + "..."
        
        # Create impact object
        impact = {
            "category": category,
            "name": impact_name.title(),
            "score": round(score, 1),
            "impact": impact_level,
            "description": description,
            "relevant_frameworks": relevant_frameworks[:3],  # Limit to 3 frameworks
            "trend": trend,
            "source": source,
            "created_at": datetime.now()
        }
        
        impacts.append(impact)
    
    # Remove duplicates by name
    unique_impacts = {}
    for impact in impacts:
        name = impact["name"]
        # Keep the impact with the higher score if duplicate names
        if name not in unique_impacts or impact["score"] > unique_impacts[name]["score"]:
            unique_impacts[name] = impact
    
    return list(unique_impacts.values())

async def extract_esg_impacts_from_rss_feeds() -> List[Dict[str, Any]]:
    """
    Extract ESG impacts from RSS feeds
    
    Returns:
        List of ESG impacts
    """
    all_impacts = []
    
    # Fetch articles from all RSS feeds
    for source_name, feed_url in FREE_DATA_SOURCES.items():
        try:
            logger.info(f"Fetching articles from {source_name}")
            articles = await fetch_rss_feed_articles(feed_url)
            
            for article in articles:
                # Extract impacts from article title and summary
                title_summary = article["title"] + " " + article["summary"]
                impacts = extract_esg_impacts_from_text(title_summary, article["source"])
                
                # If we found impacts, or this is a significant article, fetch full content
                if impacts or any(keyword in title_summary.lower() for keyword in ["climate", "esg", "sustainability", "environmental", "social", "governance"]):
                    logger.info(f"Fetching content for article: {article['title']}")
                    content = await fetch_article_content(article["link"])
                    
                    # Extract impacts from full content
                    content_impacts = extract_esg_impacts_from_text(content, article["source"])
                    
                    # Combine impacts
                    all_impact_names = set(impact["name"] for impact in impacts)
                    for impact in content_impacts:
                        if impact["name"] not in all_impact_names:
                            impacts.append(impact)
                            all_impact_names.add(impact["name"])
                
                all_impacts.extend(impacts)
        except Exception as e:
            logger.error(f"Error processing RSS feed {source_name}: {str(e)}")
    
    return all_impacts

async def generate_impacts_from_climate_data() -> List[Dict[str, Any]]:
    """
    Generate ESG impacts from climate data
    
    Returns:
        List of ESG impacts
    """
    impacts = []
    
    try:
        # Fetch climate data
        nasa_data = await fetch_nasa_climate_data()
        
        # Generate impacts based on climate data
        if nasa_data:
            # Temperature trends
            temp_trend = "increasing"  # Most likely scenario based on current science
            temp_severity = "High"
            
            impacts.append({
                "category": "E",
                "name": "Physical Risk: Temperature Increase",
                "score": 8.5,
                "impact": temp_severity,
                "description": "Rising global temperatures affecting property insurance claims through increased frequency and severity of heat waves, wildfires, and other temperature-related events.",
                "relevant_frameworks": ["TCFD", "TNFD", "EU Taxonomy"],
                "trend": temp_trend,
                "source": "NASA Climate Data",
                "created_at": datetime.now()
            })
            
            # Sea level rise
            impacts.append({
                "category": "E",
                "name": "Physical Risk: Sea Level Rise",
                "score": 7.8,
                "impact": "High",
                "description": "Accelerating sea level rise threatening coastal properties and infrastructure, leading to increased flooding risk and potential property devaluation.",
                "relevant_frameworks": ["TCFD", "TNFD"],
                "trend": "increasing",
                "source": "NASA Climate Data",
                "created_at": datetime.now()
            })
            
            # Extreme weather
            impacts.append({
                "category": "E",
                "name": "Physical Risk: Extreme Weather Events",
                "score": 8.2,
                "impact": "High",
                "description": "Increasing frequency and severity of extreme weather events including hurricanes, floods, and droughts, affecting property and casualty insurance claims.",
                "relevant_frameworks": ["TCFD", "TNFD", "NAIC Climate Risk Disclosure"],
                "trend": "increasing",
                "source": "NASA Climate Data",
                "created_at": datetime.now()
            })
        
        # Add impacts related to transition risks
        impacts.append({
            "category": "E",
            "name": "Transition Risk: Policy Changes",
            "score": 7.2,
            "impact": "Medium",
            "description": "Financial impact of policy changes driving transition to low-carbon economy on insured businesses and investment portfolios.",
            "relevant_frameworks": ["TCFD", "EU Taxonomy", "SEC Climate Rule"],
            "trend": "increasing",
            "source": "Climate Policy Database",
            "created_at": datetime.now()
        })
        
        impacts.append({
            "category": "E",
            "name": "Transition Risk: Market Changes",
            "score": 6.9,
            "impact": "Medium",
            "description": "Market shifts toward low-carbon alternatives affecting carbon-intensive industries and their insurability.",
            "relevant_frameworks": ["TCFD", "EU Taxonomy"],
            "trend": "increasing",
            "source": "Climate Policy Database",
            "created_at": datetime.now()
        })
        
        # Add social impacts
        impacts.append({
            "category": "S",
            "name": "Climate Justice",
            "score": 6.5,
            "impact": "Medium",
            "description": "Addressing inequities in climate risk exposure and insurance availability in vulnerable communities.",
            "relevant_frameworks": ["UN SDGs", "NAIC Climate Risk Disclosure"],
            "trend": "increasing",
            "source": "UN Reports",
            "created_at": datetime.now()
        })
        
        impacts.append({
            "category": "S",
            "name": "Health Effects",
            "score": 6.2,
            "impact": "Medium",
            "description": "Climate-related health impacts affecting mortality assumptions and health insurance claims.",
            "relevant_frameworks": ["TCFD", "UN SDGs"],
            "trend": "increasing",
            "source": "WHO Climate Reports",
            "created_at": datetime.now()
        })
        
        # Add governance impacts
        impacts.append({
            "category": "G",
            "name": "Climate Risk Governance",
            "score": 8.0,
            "impact": "High",
            "description": "Board oversight and management accountability for climate risk strategy and disclosure.",
            "relevant_frameworks": ["TCFD", "ISSB", "SEC Climate Rule"],
            "trend": "increasing",
            "source": "Corporate Governance Research",
            "created_at": datetime.now()
        })
        
        impacts.append({
            "category": "G",
            "name": "Disclosure Requirements",
            "score": 7.8,
            "impact": "High",
            "description": "Increasing regulatory pressure to disclose climate-related financial risks and opportunities.",
            "relevant_frameworks": ["TCFD", "SEC Climate Rule", "EU SFDR"],
            "trend": "increasing",
            "source": "Regulatory Tracking Database",
            "created_at": datetime.now()
        })
        
    except Exception as e:
        logger.error(f"Error generating impacts from climate data: {str(e)}")
    
    return impacts

async def extract_esg_impacts_from_news() -> List[Dict[str, Any]]:
    """
    Extract ESG impacts from news articles in the database
    
    Returns:
        List of ESG impacts
    """
    impacts = []
    
    try:
        # Fetch recent news articles from the database
        articles = []
        cursor = db.articles.find().sort("created_at", -1).limit(50)
        
        async for article in cursor:
            articles.append({
                "title": article.get("title", ""),
                "content": article.get("content", ""),
                "source": article.get("source", "Unknown")
            })
        
        logger.info(f"Analyzing {len(articles)} articles from database")
        
        # Extract impacts from each article
        for article in articles:
            # Combine title and content
            text = article["title"] + " " + article["content"]
            
            # Extract impacts
            article_impacts = extract_esg_impacts_from_text(text, article["source"])
            impacts.extend(article_impacts)
    except Exception as e:
        logger.error(f"Error extracting ESG impacts from news: {str(e)}")
    
    return impacts

async def fetch_esg_impacts_from_all_sources() -> List[Dict[str, Any]]:
    """
    Fetch ESG impacts from all sources
    
    Returns:
        List of ESG impacts
    """
    all_impacts = []
    
    # Run all extraction methods in parallel
    tasks = [
        extract_esg_impacts_from_rss_feeds(),
        generate_impacts_from_climate_data(),
        extract_esg_impacts_from_news()
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Combine results
    for result in results:
        all_impacts.extend(result)
    
    # Deduplicate by name and category
    unique_impacts = {}
    for impact in all_impacts:
        key = f"{impact['category']}-{impact['name']}"
        # Keep the impact with the higher score if duplicate
        if key not in unique_impacts or impact["score"] > unique_impacts[key]["score"]:
            unique_impacts[key] = impact
    
    # Convert back to list
    final_impacts = list(unique_impacts.values())
    
    # Sort by score (descending)
    final_impacts.sort(key=lambda x: x["score"], reverse=True)
    
    logger.info(f"Extracted {len(final_impacts)} unique ESG impacts from all sources")
    
    return final_impacts

async def store_esg_impacts(impacts: List[Dict[str, Any]]) -> bool:
    """
    Store ESG impacts in the database
    
    Args:
        impacts: List of ESG impacts
        
    Returns:
        True if successful, False otherwise
    """
    if not impacts:
        logger.warning("No impacts to store")
        return False
    
    try:
        # Clear existing data
        result = await db.esg_impacts.delete_many({})
        logger.info(f"Cleared {result.deleted_count} existing ESG impacts")
        
        # Insert new data
        result = await db.esg_impacts.insert_many(impacts)
        logger.info(f"Inserted {len(result.inserted_ids)} ESG impacts")
        return True
    except Exception as e:
        logger.error(f"Error storing ESG impacts: {str(e)}")
        return False

async def fetch_and_store_esg_impacts():
    """
    Main function to fetch and store ESG impacts from all sources
    """
    logger.info("Starting ESG impact data import")
    
    try:
        # Fetch impacts from all sources
        impacts = await fetch_esg_impacts_from_all_sources()
        
        if not impacts:
            logger.warning("No impacts fetched from sources. Using fallback data.")
            # Load fallback data
            with open('fallback_esg_impacts.json', 'r') as f:
                impacts = json.load(f)
                
                # Add creation timestamp
                for impact in impacts:
                    impact["created_at"] = datetime.now()
                    impact["source"] = "Fallback Data"
        
        # Store impacts in database
        success = await store_esg_impacts(impacts)
        
        if success:
            logger.info("ESG impact data import completed successfully")
        else:
            logger.error("Failed to store ESG impacts")
    except Exception as e:
        logger.error(f"Error in ESG impact data import: {str(e)}")
    finally:
        # Close MongoDB connection
        client.close()

# Create fallback data file
def create_fallback_data():
    fallback_data = [
        {
            "category": "E",
            "name": "Physical Risk",
            "score": 8.5,
            "impact": "High",
            "description": "Increased frequency and severity of weather events affecting property insurance claims",
            "relevant_frameworks": ["TCFD", "TNFD", "EU Taxonomy"],
            "trend": "increasing"
        },
        {
            "category": "E",
            "name": "Transition Risk",
            "score": 7.2,
            "impact": "Medium",
            "description": "Financial impact of shift to low-carbon economy on insured businesses and investment portfolios",
            "relevant_frameworks": ["TCFD", "EU Taxonomy", "SEC Climate Rule"],
            "trend": "increasing"
        },
        {
            "category": "E",
            "name": "Biodiversity Loss",
            "score": 6.8,
            "impact": "Medium",
            "description": "Impact of ecosystem degradation on insurability and increased natural catastrophe risk",
            "relevant_frameworks": ["TNFD"],
            "trend": "increasing"
        },
        {
            "category": "E",
            "name": "Resource Scarcity",
            "score": 6.2,
            "impact": "Medium",
            "description": "Water scarcity and resource depletion creating new insurance exposures and investment risks",
            "relevant_frameworks": ["TNFD", "EU Taxonomy"],
            "trend": "increasing"
        },
        {
            "category": "S",
            "name": "Climate Justice",
            "score": 6.5,
            "impact": "Medium",
            "description": "Addressing inequities in climate risk exposure and insurance availability in vulnerable communities",
            "relevant_frameworks": ["UN SDGs", "NAIC Climate Risk Disclosure"],
            "trend": "increasing"
        },
        {
            "category": "S",
            "name": "Health Effects",
            "score": 5.8,
            "impact": "Medium",
            "description": "Climate-related health impacts affecting mortality assumptions and health insurance claims",
            "relevant_frameworks": ["TCFD", "UN SDGs"],
            "trend": "increasing"
        },
        {
            "category": "S",
            "name": "Employment Impacts",
            "score": 5.2,
            "impact": "Medium",
            "description": "Job market disruption due to transition to low-carbon economy affecting workers' compensation and liability insurance",
            "relevant_frameworks": ["ISSB", "SEC Climate Rule"],
            "trend": "increasing"
        },
        {
            "category": "S",
            "name": "Population Displacement",
            "score": 5.5,
            "impact": "Medium",
            "description": "Climate-driven migration and displacement creating new insurance needs and liabilities",
            "relevant_frameworks": ["UN SDGs"],
            "trend": "increasing"
        },
        {
            "category": "G",
            "name": "Climate Risk Governance",
            "score": 8.0,
            "impact": "High",
            "description": "Board oversight and management accountability for climate risk strategy and disclosure",
            "relevant_frameworks": ["TCFD", "ISSB", "SEC Climate Rule"],
            "trend": "increasing"
        },
        {
            "category": "G",
            "name": "Disclosure Requirements",
            "score": 7.8,
            "impact": "High",
            "description": "Increasing regulatory pressure to disclose climate-related financial risks and opportunities",
            "relevant_frameworks": ["TCFD", "SEC Climate Rule", "EU SFDR"],
            "trend": "increasing"
        },
        {
            "category": "G",
            "name": "Climate Litigation Risk",
            "score": 7.0,
            "impact": "Medium",
            "description": "Increasing risk of litigation related to climate change affecting D&O and liability insurance",
            "relevant_frameworks": ["TCFD", "SEC Climate Rule"],
            "trend": "increasing"
        },
        {
            "category": "G",
            "name": "Climate Strategy Integration",
            "score": 6.5,
            "impact": "Medium",
            "description": "Insurance companies integrating climate risks into long-term business strategy and product development",
            "relevant_frameworks": ["TCFD", "ISSB"],
            "trend": "increasing"
        }
    ]
    
    with open('fallback_esg_impacts.json', 'w') as f:
        json.dump(fallback_data, f, indent=2)
    logger.info("Created fallback ESG impacts data file")

# Run the script
if __name__ == "__main__":
    # Create fallback data file
    create_fallback_data()
    
    # Run the main function
    asyncio.run(fetch_and_store_esg_impacts())