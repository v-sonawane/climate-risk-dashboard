import os
from typing import List, Dict, Any, Tuple, Optional, TypedDict, Annotated
import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import re
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.schema import Document
import os
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, FunctionMessage
from langchain_anthropic import ChatAnthropic
from langchain.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
from langchain_core.runnables import RunnablePassthrough
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import logging
logger = logging.getLogger(__name__)

load_dotenv()

def load_sample_data():
    """Load sample data for initial dashboard display"""
    return {
        "final_report": {
            "Executive Summary": "Recent climate risk developments show increasing regulatory pressure and physical risks affecting insurers. Property insurance faces rising claims from extreme weather, while casualty insurers see growing liability concerns from climate disclosure requirements. Reinsurance capacity is tightening in high-risk regions, and opportunities are emerging for insurers with sophisticated climate risk modeling capabilities.",
            
            "Key Climate Risk Developments": "1. **TNFD framework adoption accelerating** across financial sectors with major institutions beginning implementation\n\n2. **Record-breaking hurricane season projected** for Atlantic basin with potential increased property damage\n\n3. **EU strengthening climate disclosure requirements** for insurers with new regulations taking effect\n\n4. **New research shows flood risk underestimated** in coastal property portfolios by as much as 30%\n\n5. **Legal precedents emerging** for climate liability claims against corporations and their directors",
            
            "Insurance Domain Impacts": "**Property Insurance:**\nFacing increased frequency and severity of weather-related claims, particularly in coastal and wildfire-prone regions. Catastrophe models require updating with latest climate projections. Premium increases and coverage restrictions likely in high-risk zones.\n\n**Casualty Insurance:**\nGrowing exposure to liability claims related to climate disclosure failures and transition risks. Directors and officers particularly exposed as shareholders demand climate action. Environmental liability coverages seeing increased claims activity.\n\n**Health Insurance:**\nEmerging risks from heat-related illnesses and changing disease patterns affect actuarial assumptions. Healthcare facilities in climate-vulnerable regions facing business continuity challenges.\n\n**Life Insurance:**\nLong-term mortality assumptions need recalibration to account for climate impacts on longevity. Investment portfolios face transition risks from high-carbon assets.\n\n**Reinsurance:**\nCapacity constraints emerging in high-risk zones with corresponding premium increases. Opportunity to develop innovative risk transfer mechanisms for climate resilience.",
            
            "Business Implications": "1. **Risk Assessment Updates:** Pricing models need recalibration for new climate realities, with more granular geographic risk differentiation\n\n2. **Product Innovation:** Opportunity to develop parametric insurance products for climate adaptation and resilience measures\n\n3. **Investment Strategy:** Portfolio diversification away from high-carbon assets toward climate solutions becoming necessary\n\n4. **Regulatory Preparedness:** Compliance costs increasing with new disclosure frameworks; early adopters gain competitive advantage\n\n5. **Competitive Edge:** Insurers with sophisticated climate risk assessment capabilities can identify profitable niches others avoid",
            
            "Recommended Actions": "1. **Enhance catastrophe modeling** with latest climate science and scenario planning\n\n2. **Develop climate stress testing** across all business lines with 10/50/100 year projections\n\n3. **Review underwriting guidelines** for high-risk regions and industries in transition\n\n4. **Increase pricing sophistication** for climate-vulnerable properties with more granular risk factors\n\n5. **Engage proactively with regulators** on emerging disclosure frameworks to shape outcomes\n\n6. **Partner with climate resilience initiatives** to reduce overall risk exposure and develop expertise",
            
            "generated_date": "2024-04-18",
            "sources": ["TNFD", "UNFCCC", "Insurance Journal", "Climate Home News", "Insurance Business Magazine"],
            "article_count": 12
        },
        "relevant_articles": [
            {
                "source": "TNFD",
                "source_type": "regulatory",
                "title": "Financial Institutions Begin Reporting Against TNFD Framework",
                "url": "https://tnfd.global/news/financial-institutions-begin-reporting/",
                "date": "2024-03-15",
                "content": "Major financial institutions have begun reporting against the Taskforce on Nature-related Financial Disclosures (TNFD) framework, marking a significant step in addressing nature and climate risks in financial decision-making. Insurance companies are among early adopters, recognizing the materiality of nature-related risks to their underwriting portfolios and investment strategies. The framework requires assessment of dependencies and impacts on nature, including climate systems, which directly affect property damage claims and liability exposures.",
                "insurance_relevance": 8,
                "climate_relevance": 9,
                "total_relevance": 17
            },
            {
                "source": "Insurance Journal",
                "source_type": "industry",
                "title": "Extreme Weather Driving Property Insurance Market Hardening",
                "url": "https://www.insurancejournal.com/news/national/2024/04/05/extreme-weather-property-market/",
                "date": "2024-04-05",
                "content": "Property insurers are facing unprecedented claims from increasing frequency of extreme weather events, leading to significant market hardening across coastal and wildfire-prone regions. Several major carriers have reduced coverage availability in California, Florida, and Gulf Coast states. Reinsurance rates have increased by an average of 25% in the most affected regions, further pressuring primary insurers. Climate attribution science increasingly links specific events to climate change, complicating traditional catastrophe modeling approaches.",
                "insurance_relevance": 10,
                "climate_relevance": 9,
                "total_relevance": 19
            },
            {
                "source": "Climate Home News",
                "source_type": "news",
                "title": "New Study Shows Coastal Flood Risk Underestimated in Property Valuations",
                "url": "https://www.climatechangenews.com/2024/03/22/coastal-flood-risk-underestimated/",
                "date": "2024-03-22",
                "content": "A comprehensive new study published in Nature Climate Change indicates that flood risk in coastal properties is underestimated by as much as 30% in current valuation models. The research, which incorporated latest sea level rise projections and compound flooding events, suggests that insurance pricing may not adequately reflect true risk in many coastal markets. Property insurers with significant exposure to affected regions may face unexpected losses if pricing models aren't updated to reflect these findings.",
                "insurance_relevance": 9,
                "climate_relevance": 10,
                "total_relevance": 19
            },
            {
                "source": "Insurance Business Magazine",
                "source_type": "industry",
                "title": "Climate Liability Claims on the Rise as Legal Precedents Emerge",
                "url": "https://www.insurancebusinessmag.com/us/news/casualty/climate-liability-claims-rise/",
                "date": "2024-04-01",
                "content": "Casualty insurers are seeing an uptick in climate-related liability claims as new legal precedents emerge holding companies accountable for climate impacts and disclosure failures. Directors and officers insurance in particular faces increasing pressure, with shareholder suits alleging failure to adequately manage and disclose climate risks. Recent court decisions have allowed several high-profile cases to proceed past initial dismissal stages, signaling potential for significant future liability exposures across multiple industry sectors.",
                "insurance_relevance": 8,
                "climate_relevance": 7,
                "total_relevance": 15
            },
            {
                "source": "UNFCCC",
                "source_type": "regulatory",
                "title": "Climate Adaptation Finance Gap Widens Despite Increasing Impacts",
                "url": "https://unfccc.int/news/climate-adaptation-finance-gap-widens/",
                "date": "2024-03-10",
                "content": "The latest UNFCCC report on climate finance indicates that the adaptation funding gap continues to widen despite mounting evidence of climate impacts. This creates both risks and opportunities for insurers, as vulnerable regions face increasing uninsured losses, while demand grows for innovative risk transfer mechanisms. The report specifically highlights the role of insurance in bridging protection gaps in developing economies, suggesting potential for public-private partnerships in creating new climate resilience insurance products.",
                "insurance_relevance": 7,
                "climate_relevance": 8,
                "total_relevance": 15
            },
            {
                "source": "Insurance Journal",
                "source_type": "industry",
                "title": "Health Insurers Begin Accounting for Climate-Related Illness Trends",
                "url": "https://www.insurancejournal.com/news/national/2024/03/18/health-climate-illness/",
                "date": "2024-03-18",
                "content": "Health insurers are increasingly incorporating climate risk factors into their actuarial models as evidence mounts for climate-related health impacts. Rising temperatures have been linked to increased heat-related illnesses, changing patterns of vector-borne diseases, and exacerbation of respiratory conditions. Several major health insurers have established specialized climate health risk teams to model potential impacts on claims across different geographic regions and develop appropriate pricing and coverage strategies.",
                "insurance_relevance": 8,
                "climate_relevance": 6,
                "total_relevance": 14
            },
            {
                "source": "TNFD",
                "source_type": "regulatory",
                "title": "TNFD Releases Supplementary Guidance for Insurance Sector",
                "url": "https://tnfd.global/news/insurance-sector-guidance/",
                "date": "2024-04-10",
                "content": "The Taskforce on Nature-related Financial Disclosures has released insurance sector-specific guidance to help insurers implement the TNFD framework effectively. The guidance addresses the unique challenges insurers face in assessing nature-related risks, including climate impacts on underwriting portfolios and investment assets. It provides specific metrics and methodologies for quantifying exposure to biodiversity loss and ecosystem degradation, which often amplify climate risks like flooding and wildfire through reduced natural buffers.",
                "insurance_relevance": 9,
                "climate_relevance": 7,
                "total_relevance": 16
            },
            {
                "source": "Insurance Business Magazine",
                "source_type": "industry",
                "title": "Reinsurance Capacity Shrinks for Climate-Vulnerable Regions",
                "article_url": "https://www.insurancebusinessmag.com/us/news/catastrophe/reinsurance-capacity-shrinks/",
                "source": "Insurance Business Magazine",
                "date": "2024-03-25"
            }

        ],
        "structured_summaries": [
            {
                "key_event": "TNFD reporting framework adoption accelerating",
                "insurance_domains": ["Property", "Casualty", "Reinsurance"],
                "risk_factors": ["Regulatory compliance", "Disclosure requirements", "Nature-related financial risks"],
                "business_implications": "Increased reporting requirements and potential for regulatory penalties for inadequate disclosure",
                "timeframe": "Short-term",
                "confidence": "High",
                "article_title": "Financial Institutions Begin Reporting Against TNFD Framework",
                "article_url": "https://tnfd.global/news/financial-institutions-begin-reporting/",
                "source": "TNFD",
                "date": "2024-03-15"
            },
            {
                "key_event": "Property insurance market hardening due to extreme weather",
                "insurance_domains": ["Property", "Reinsurance"],
                "risk_factors": ["Hurricanes", "Wildfires", "Flooding", "Climate change"],
                "business_implications": "Increased premiums, reduced coverage availability in high-risk areas",
                "timeframe": "Immediate",
                "confidence": "High",
                "article_title": "Extreme Weather Driving Property Insurance Market Hardening",
                "article_url": "https://www.insurancejournal.com/news/national/2024/04/05/extreme-weather-property-market/",
                "source": "Insurance Journal",
                "date": "2024-04-05"
            },
            {
                "key_event": "Coastal flood risk underestimated in current property valuations",
                "insurance_domains": ["Property", "Reinsurance"],
                "risk_factors": ["Sea level rise", "Coastal flooding", "Inaccurate risk models"],
                "business_implications": "Potential for unexpected losses if pricing models not updated",
                "timeframe": "Short-term",
                "confidence": "Medium",
                "article_title": "New Study Shows Coastal Flood Risk Underestimated in Property Valuations",
                "article_url": "https://www.climatechangenews.com/2024/03/22/coastal-flood-risk-underestimated/",
                "source": "Climate Home News",
                "date": "2024-03-22"
            },
            {
                "key_event": "Rising climate liability claims with emerging legal precedents",
                "insurance_domains": ["Casualty", "Property"],
                "risk_factors": ["Liability litigation", "Disclosure failures", "Director responsibilities"],
                "business_implications": "Increasing exposure to climate-related liability claims, particularly in D&O coverage",
                "timeframe": "Medium-term",
                "confidence": "Medium",
                "article_title": "Climate Liability Claims on the Rise as Legal Precedents Emerge",
                "article_url": "https://www.insurancebusinessmag.com/us/news/casualty/climate-liability-claims-rise/",
                "source": "Insurance Business Magazine",
                "date": "2024-04-01"
            },
            {
                "key_event": "Widening climate adaptation finance gap",
                "insurance_domains": ["Property", "Reinsurance"],
                "risk_factors": ["Uninsured losses", "Vulnerable regions", "Government policy"],
                "business_implications": "Opportunity for new risk transfer products and public-private partnerships",
                "timeframe": "Long-term",
                "confidence": "Medium",
                "article_title": "Climate Adaptation Finance Gap Widens Despite Increasing Impacts",
                "article_url": "https://unfccc.int/news/climate-adaptation-finance-gap-widens/",
                "source": "UNFCCC",
                "date": "2024-03-10"
            },
            {
                "key_event": "Health insurers incorporating climate risk in actuarial models",
                "insurance_domains": ["Health", "Life"],
                "risk_factors": ["Heat-related illness", "Vector-borne diseases", "Respiratory conditions"],
                "business_implications": "Need for updated actuarial models to account for changing health risk patterns",
                "timeframe": "Long-term",
                "confidence": "Medium",
                "article_title": "Health Insurers Begin Accounting for Climate-Related Illness Trends",
                "article_url": "https://www.insurancejournal.com/news/national/2024/03/18/health-climate-illness/",
                "source": "Insurance Journal",
                "date": "2024-03-18"
            },
            {
                "key_event": "TNFD releases insurance sector-specific guidance",
                "insurance_domains": ["Property", "Casualty", "Life", "Health", "Reinsurance"],
                "risk_factors": ["Regulatory compliance", "Nature-related risks", "Biodiversity loss"],
                "business_implications": "New methodologies for quantifying exposure to nature-related risks in insurance portfolios",
                "timeframe": "Short-term",
                "confidence": "High",
                "article_title": "TNFD Releases Supplementary Guidance for Insurance Sector",
                "article_url": "https://tnfd.global/news/insurance-sector-guidance/",
                "source": "TNFD",
                "date": "2024-04-10"
            },
            {
                "key_event": "Reinsurance capacity contracting for climate-vulnerable regions",
                "insurance_domains": ["Reinsurance", "Property"],
                "risk_factors": ["Capacity shortage", "Pricing increases", "Coverage restrictions"],
                "business_implications": "Primary insurers face challenges securing adequate reinsurance protection at affordable rates",
                "timeframe": "Immediate",
                "confidence": "High",
                "article_title": "Reinsurance Capacity Shrinks for Climate-VulnerableRegions",
                "url": "https://www.insurancebusinessmag.com/us/news/catastrophe/reinsurance-capacity-shrinks/",
                "date": "2024-03-25",
                "content": "Reinsurance capacity is contracting significantly for climate-vulnerable regions following several years of elevated catastrophe losses. Major reinsurers have reduced limit availability by up to 40% in some high-risk zones while substantially increasing pricing. Primary insurers are responding by restricting new business, increasing deductibles, and implementing more exclusions. Industry analysts suggest this market hardening may persist as climate model uncertainty makes reinsurers increasingly cautious about tail risk in catastrophe-exposed regions.",
                "insurance_relevance": 9,
                "climate_relevance": 8,
                "total_relevance": 17
            }
        ],
    }
    


# Define our state
class AgentState(TypedDict):
    messages: list[Any]
    sources: list[Dict[str, str]]
    extracted_info: Optional[List[Dict[str, Any]]]
    summaries: Optional[List[Dict[str, Any]]]
    final_report: Optional[Dict[str, Any]]
    next: Optional[str]

# Initialize the LLM
llm= ChatAnthropic(model='claude-3-7-sonnet-20250219')


# Define news sources to scrape
NEWS_SOURCES = [
    {
        "name": "TNFD",
        "url": "https://tnfd.global/news/",
        "type": "regulatory"
    },
    {
        "name": "UNFCCC",
        "url": "https://unfccc.int/news",
        "type": "regulatory"
    },
    {
        "name": "Climate Home News",
        "url": "https://www.climatechangenews.com/category/news/",
        "type": "news"
    },
    {
        "name": "Insurance Business Magazine",
        "url": "https://www.insurancebusinessmag.com/us/news/breaking-news/",
        "type": "industry"
    },
    {
        "name": "Insurance Journal",
        "url": "https://www.insurancejournal.com/news/national/",
        "type": "industry"
    },
    {
        "name": "ClimateWire",
        "url": "https://www.eenews.net/publications/climatewire/",
        "type": "news"
    },

    {
        "name": "Climate Adaptation Platform",
        "url": "https://weadapt.org/articles/",
        "type": "news"
    },
    {
        "name": "UNEP Finance Initiative",
        "url": "https://www.unepfi.org/news/",
        "type": "regulatory"
    },
    {
        "name": "Climate Risk Forum",
        "url": "https://www.genevaassociation.org/news-and-media",
        "type": "industry"
    }
]
# Define a new tool to scrape only specific articles

@tool
def scrape_specific_articles(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Scrape specific articles from their URLs
    
    Args:
        articles: List of article dictionaries with 'url', 'source', and 'source_type' keys
        
    Returns:
        List of dictionaries containing scraped articles with full content
    """
    scraped_articles = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    for article_info in articles:
        url = article_info.get("url")
        source = article_info.get("source", "Unknown")
        source_type = article_info.get("source_type", "news")
        
        try:
            print(f"Scraping article: {url}")
            article_response = requests.get(url, headers=headers, timeout=15)
            article_response.raise_for_status()
            article_soup = BeautifulSoup(article_response.content, 'html.parser')
            
            # Extract title if not already provided
            title = article_info.get("title")
            if not title or title == "Unknown Title":
                # Try multiple strategies to find the title
                title_candidates = []
                
                # Strategy 1: Look for article title in common heading elements
                for heading in ['h1', 'h2']:
                    headings = article_soup.find_all(heading)
                    for h in headings:
                        # Skip very short headings and navigation elements
                        text = h.get_text(strip=True)
                        if len(text) > 10 and text not in ["News & Media", "Learn More", "Navigation"]:
                            title_candidates.append(text)
                
                # Strategy 2: Look for elements with title classes
                title_classes = article_soup.find_all(class_=lambda c: c and ('title' in c.lower() if c else False))
                for t in title_classes:
                    text = t.get_text(strip=True)
                    if len(text) > 10:
                        title_candidates.append(text)
                
                # Strategy 3: Use page title as fallback
                if article_soup.title:
                    title_candidates.append(article_soup.title.string)
                
                # Select the best title (longest, non-generic)
                if title_candidates:
                    # Filter out generic titles
                    filtered_titles = [t for t in title_candidates if t not in ["News & Media", "Learn More", "Home", "Dashboard"]]
                    if filtered_titles:
                        # Select longest remaining title
                        title = max(filtered_titles, key=len)
                    else:
                        title = max(title_candidates, key=len)
                else:
                    # Default to a source-based title if nothing else works
                    title = f"Article from {source}"
            
            # Extract content with source-specific strategies
            content = ""
            
            # Generic content extraction strategies
            # Strategy 1: Look for main content containers
            content_container = article_soup.find(['div', 'article'], 
                                            class_=lambda c: c and ('content' in c.lower() or 
                                                                    'article' in c.lower() or 
                                                                    'body' in c.lower() if c else False))
            if content_container:
                paragraphs = content_container.find_all('p')
                content = " ".join([p.get_text(strip=True) for p in paragraphs])
            
            # Strategy 2: If no content found, try looking for article text in main element
            if not content or len(content) < 100:
                article_element = article_soup.find(['article', 'main'])
                if article_element:
                    paragraphs = article_element.find_all('p')
                    content = " ".join([p.get_text(strip=True) for p in paragraphs])
            
            # Strategy 3: Fallback to all paragraphs
            if not content or len(content) < 100:
                paragraphs = article_soup.find_all('p')
                content = " ".join([p.get_text(strip=True) for p in paragraphs])
                
            # Strategy 4: Last resort - extract all text and clean it up
            if not content or len(content) < 100:
                # Get all text but exclude scripts, styles, and navigation
                for script in article_soup(["script", "style", "nav", "header", "footer"]):
                    script.extract()
                
                content = article_soup.get_text(separator=' ', strip=True)
                # Clean up whitespace
                content = re.sub(r'\s+', ' ', content)
                # Limit length for processing
                content = content[:5000]
            
            # Extract date with multiple strategies
            date = article_info.get("date")
            if not date:
                # Try different date patterns
                date_patterns = [
                    ['time'],  # HTML5 time element
                    ['span', 'div', 'p'], {'class': lambda c: c and ('date' in c.lower() or 'time' in c.lower() if c else False)},
                    ['span', 'div', 'p'], {'itemprop': 'datePublished'},
                    ['meta'], {'property': 'article:published_time'}
                ]
                
                for pattern in date_patterns:
                    if len(pattern) == 1:
                        date_tags = article_soup.find_all(pattern[0])
                    else:
                        date_tags = article_soup.find_all(pattern[0], **pattern[1])
                    
                    if date_tags:
                        # First check for datetime attribute
                        for tag in date_tags:
                            if tag.has_attr('datetime'):
                                date = tag['datetime']
                                break
                            elif tag.has_attr('content'):
                                date = tag['content']
                                break
                        
                        # If no datetime attribute, use text
                        if not date and date_tags[0].text.strip():
                            date = date_tags[0].text.strip()
                        
                        if date:
                            break
            
            # If still no date, use current date
            if not date:
                date = datetime.now().strftime("%Y-%m-%d")
            
            # Ensure content is not empty
            if not content or len(content) < 100:
                # Create relevant fallback content based on source type
                if "TNFD" in source:
                    content = "This article discusses the Taskforce on Nature-related Financial Disclosures framework and its implications for insurance industry risk management related to climate and nature-based risks."
                elif "UNFCCC" in source:
                    content = "This article discusses United Nations climate change initiatives and their implications for insurance markets, particularly regarding adaptation finance and physical risk management."
                elif "Insurance" in source:
                    content = f"This article from {source} discusses insurance industry trends related to climate risk, including potential impacts on underwriting, pricing, and coverage availability in vulnerable regions."
                else:
                    content = f"This article from {source} contains information about climate risks and their implications for insurance markets and risk management practices."
            
            # Add the article to our collection
            scraped_articles.append({
                "source": source,
                "source_type": source_type,
                "title": title,
                "url": url,
                "date": date,
                "content": content[:5000],  # Limit content length
            })
            print(f"Successfully scraped article: {title}")
        except Exception as e:
            print(f"Error scraping article {url}: {str(e)}")
            # Add fallback article with minimal information
            scraped_articles.append({
                "source": source,
                "source_type": source_type,
                "title": f"Climate risk article from {source}",
                "url": url,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "content": f"This article discusses climate risk implications for the insurance industry, particularly regarding physical risks, transition risks, and regulatory frameworks affecting insurance domains.",
            })
    
    print(f"Total articles scraped: {len(scraped_articles)}")
    return scraped_articles
# Tool to scrape news from sources
@tool
def scrape_news_sources(sources: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, Any]]:
    """
    Scrape news from predefined or provided sources
    
    Args:
        sources: Optional list of source dictionaries with 'name' and 'url' keys
        
    Returns:
        List of dictionaries containing scraped articles with source, title, url, and content
    """
    if sources is None:
        sources = NEWS_SOURCES
    
    all_articles = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    for source in sources:
        try:
            print(f"Scraping {source['name']} from {source['url']}")
            response = requests.get(source["url"], headers=headers, timeout=15)
            response.raise_for_status()  # Raise exception for 4XX/5XX status codes
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find article links with source-specific selectors
            article_links = []
            articles_data = []  # For storing additional metadata
            
            # TNFD specific parsing
            if source["name"] == "TNFD":
                # Find all h3 elements with class 'entry-title mb-sm h4' containing links
                title_elements = soup.find_all('h3', class_='entry-title mb-sm h4')
                
                for title_element in title_elements:
                    # Get the anchor tag and its href
                    link = title_element.find('a', href=True)
                    if link:
                        href = link['href']
                        title = link.text.strip()
                        
                        # Make sure URL is absolute
                        if not href.startswith('http'):
                            base_url = '/'.join(source["url"].split('/')[:3])
                            href = base_url + href if href.startswith('/') else base_url + '/' + href
                        
                        # Find associated content in div with class 'post-content'
                        article_container = title_element.find_parent('article')
                        
                        # Get publication time if available
                        posted_time = None
                        if article_container:
                            time_span = article_container.find('span', class_='posted-on')
                            if time_span:
                                time_tag = time_span.find('time')
                                if time_tag:
                                    posted_time = time_tag.get('datetime') or time_tag.text.strip()
                        
                        # Store the collected information
                        article_links.append(href)
                        articles_data.append({
                            "url": href,
                            "title": title,
                            "published_date": posted_time
                        })
            
            # UNFCCC specific parsing
            elif source["name"] == "UNFCCC":
                # Find div elements with class 'news'
                news_divs = soup.find_all('div', class_='news')
                for news_div in news_divs:
                    links = news_div.find_all('a', href=True, attrs={'data-title': True})
                    for link in links:
                        href = link['href']
                        title = link.get('data-title') or link.text.strip()
                        
                        if not href.startswith('http'):
                            base_url = '/'.join(source["url"].split('/')[:3])
                            href = base_url + href if href.startswith('/') else base_url + '/' + href
                        
                        article_links.append(href)
                        articles_data.append({
                            "url": href,
                            "title": title,
                            "published_date": None  # Will try to extract from article page
                        })
            
            # CLIMATE CHANGE NEWS specific parsing
            elif source["name"] == "CLIMATE CHANGE NEWS":
                # Find post headers
                post_headers = soup.find_all('div', class_='header-text')
                for header in post_headers:
                    # Find title and link
                    title_elem = header.find('h3', class_='post__title')
                    if title_elem:
                        link = title_elem.find('a', href=True)
                        if link:
                            href = link['href']
                            title = link.text.strip()
                            
                            if not href.startswith('http'):
                                base_url = '/'.join(source["url"].split('/')[:3])
                                href = base_url + href if href.startswith('/') else base_url + '/' + href
                            
                            # Extract date
                            date_elem = header.find('div', class_='post__date')
                            date = date_elem.text.strip() if date_elem else None
                            
                            # Extract category
                            category_elem = header.find('div', class_='post__categories')
                            category = None
                            if category_elem:
                                cat_link = category_elem.find('a')
                                if cat_link:
                                    category = cat_link.text.strip()
                            
                            article_links.append(href)
                            articles_data.append({
                                "url": href,
                                "title": title,
                                "published_date": date,
                                "category": category
                            })
            
            # Insurance Business Magazine specific parsing
            elif source["name"] == "Insurance Business Magazine":
                # For regular article items
                article_items = soup.find_all('div', class_='article-list__item')
                for item in article_items:
                    title_elem = item.find('h3')
                    if title_elem:
                        link = title_elem.find('a', href=True)
                        if link:
                            href = link['href']
                            title = link.text.strip()
                            
                            if not href.startswith('http'):
                                base_url = '/'.join(source["url"].split('/')[:3])
                                href = base_url + href if href.startswith('/') else base_url + '/' + href
                            
                            article_links.append(href)
                            articles_data.append({
                                "url": href,
                                "title": title
                            })
                
                # For header articles
                header_articles = soup.find_all('div', class_='article-list__head__passage--news')
                for header in header_articles:
                    title_elem = header.find('h2')
                    if title_elem:
                        link = title_elem.find('a', href=True)
                        if link:
                            href = link['href']
                            title = link.text.strip()
                            
                            if not href.startswith('http'):
                                base_url = '/'.join(source["url"].split('/')[:3])
                                href = base_url + href if href.startswith('/') else base_url + '/' + href
                            
                            article_links.append(href)
                            articles_data.append({
                                "url": href,
                                "title": title
                            })
            
            # Insurance Journal specific parsing
            elif source["name"] == "Insurance Journal":
                # Find article entries
                entries = soup.find_all('div', class_='entry')
                for entry in entries:
                    title_elem = entry.find('h3')
                    if title_elem:
                        link = title_elem.find('a', href=True)
                        if link:
                            href = link['href']
                            title = link.text.strip()
                            
                            if not href.startswith('http'):
                                base_url = '/'.join(source["url"].split('/')[:3])
                                href = base_url + href if href.startswith('/') else base_url + '/' + href
                            
                            # Extract date
                            date_elem = entry.find('div', class_='entry-meta')
                            date = date_elem.text.strip() if date_elem else None
                            
                            article_links.append(href)
                            articles_data.append({
                                "url": href,
                                "title": title,
                                "published_date": date
                            })
                
                # Alternative structure with nav tabs
                main_post_list = soup.find('div', class_='main-post-list')
                if main_post_list:
                    links = main_post_list.find_all('a', href=True)
                    for link in links:
                        href = link['href']
                        title_elem = link.find('h6')
                        if title_elem:
                            title = title_elem.text.strip()
                        else:
                            title = link.text.strip()
                        
                        # Find metadata paragraph
                        meta_p = link.find('p')
                        date = None
                        if meta_p and '|' in meta_p.text:
                            # Format like "BY AMELIA DAVIDSON | 04/11/2025 06:46 AM EDT"
                            meta_text = meta_p.text.strip()
                            date_part = meta_text.split('|')[1].strip() if '|' in meta_text else None
                            if date_part:
                                date = date_part
                        
                        if not href.startswith('http'):
                            base_url = '/'.join(source["url"].split('/')[:3])
                            href = base_url + href if href.startswith('/') else base_url + '/' + href
                        
                        article_links.append(href)
                        articles_data.append({
                            "url": href,
                            "title": title,
                            "published_date": date
                        })
            
            # WEADAPT specific parsing
            elif source["name"] == "WEADAPT":
                list_items = soup.find_all('div', class_='cpt-list-item__content')
                for item in list_items:
                    title_elem = item.find('h4', class_='cpt-list-item__title')
                    if title_elem:
                        link = title_elem.find('a', href=True)
                        if link:
                            href = link['href']
                            title = link.text.strip()
                            
                            if not href.startswith('http'):
                                base_url = '/'.join(source["url"].split('/')[:3])
                                href = base_url + href if href.startswith('/') else base_url + '/' + href
                            
                            # Extract date
                            date = None
                            meta_list = item.find('ul', class_='post-meta')
                            if meta_list:
                                meta_items = meta_list.find_all('li', class_='post-meta__item')
                                for meta_item in meta_items:
                                    if meta_item.find('span', attrs={'aria-label': 'icon-calendar'}):
                                        date_span = meta_item.find('span', class_='text')
                                        if date_span:
                                            date = date_span.text.strip()
                            
                            article_links.append(href)
                            articles_data.append({
                                "url": href,
                                "title": title,
                                "published_date": date
                            })
            
            # UNEPFI specific parsing
            elif source["name"] == "UNEPFI":
                articles = soup.find_all('article', class_=lambda c: c and 'd-sm-flex' in c)
                for article in articles:
                    link = article.find('a', href=True)
                    if link:
                        href = link['href']
                        title_elem = article.find('h5')
                        title = title_elem.text.strip() if title_elem else link.text.strip()
                        
                        if not href.startswith('http'):
                            base_url = '/'.join(source["url"].split('/')[:3])
                            href = base_url + href if href.startswith('/') else base_url + '/' + href
                        
                        article_links.append(href)
                        articles_data.append({
                            "url": href,
                            "title": title
                        })
            
            # GENEVA ASSOCIATION specific parsing
            elif source["name"] == "GENEVA ASSOCIATION":
                cards = soup.find_all('div', class_=lambda c: c and 'card shadow-sm views-row' in c)
                for card in cards:
                    link = card.find('a', href=True)
                    if link:
                        href = link['href']
                        title_elem = card.find('h3')
                        title = title_elem.text.strip() if title_elem else link.text.strip()
                        
                        if not href.startswith('http'):
                            base_url = '/'.join(source["url"].split('/')[:3])
                            href = base_url + href if href.startswith('/') else base_url + '/' + href
                        
                        article_links.append(href)
                        articles_data.append({
                            "url": href,
                            "title": title
                        })
            
            # Generic fallback approach if no specific parser
            else:
                for a in soup.find_all('a', href=True):
                    # Basic filtering for article links
                    href = a['href']
                    if ('news' in href or 'article' in href or 'press' in href) and not href.endswith(('.pdf', '.jpg', '.png')):
                        if not href.startswith('http'):
                            # Handle relative URLs
                            base_url = '/'.join(source["url"].split('/')[:3])
                            href = base_url + href if href.startswith('/') else base_url + '/' + href
                        article_links.append(href)
                        articles_data.append({
                            "url": href,
                            "title": a.text.strip() if a.text.strip() else "Unknown Title"
                        })
            
            # Limit to avoid excessive scraping
            article_links = list(set(article_links))[:5]
            print(f"Found {len(article_links)} article links from {source['name']}")
            
            # Match article data with deduplicated links
            filtered_articles_data = []
            for link in article_links:
                for article_data in articles_data:
                    if article_data["url"] == link:
                        filtered_articles_data.append(article_data)
                        break
            
            # Update the individual article processing section inside the scrape_news_sources function

# This code goes inside the loop for each source, after collecting article_links
# and before the loop that processes each link

# Replace the current article processing loop with this improved version:
            for idx, link in enumerate(article_links):
                try:
                    print(f"Scraping article: {link}")
                    article_response = requests.get(link, headers=headers, timeout=15)
                    article_response.raise_for_status()
                    article_soup = BeautifulSoup(article_response.content, 'html.parser')
                    
                    # Get stored metadata if available
                    article_meta = filtered_articles_data[idx] if idx < len(filtered_articles_data) else {"url": link}
                    
                    # Extract title if not already retrieved or if it's a generic title
                    title = article_meta.get("title")
                    if not title or title == "Unknown Title" or title in ["News & Media", "Learn More"]:
                        # Try multiple strategies to find the title
                        title_candidates = []
                        
                        # Strategy 1: Look for article title in common heading elements
                        for heading in ['h1', 'h2']:
                            headings = article_soup.find_all(heading)
                            for h in headings:
                                # Skip very short headings and navigation elements
                                text = h.get_text(strip=True)
                                if len(text) > 10 and text not in ["News & Media", "Learn More", "Navigation"]:
                                    title_candidates.append(text)
                        
                        # Strategy 2: Look for elements with title classes
                        title_classes = article_soup.find_all(class_=lambda c: c and ('title' in c.lower() if c else False))
                        for t in title_classes:
                            text = t.get_text(strip=True)
                            if len(text) > 10:
                                title_candidates.append(text)
                        
                        # Strategy 3: Use page title as fallback
                        if article_soup.title:
                            title_candidates.append(article_soup.title.string)
                        
                        # Select the best title (longest, non-generic)
                        if title_candidates:
                            # Filter out generic titles
                            filtered_titles = [t for t in title_candidates if t not in ["News & Media", "Learn More", "Home", "Dashboard"]]
                            if filtered_titles:
                                # Select longest remaining title
                                title = max(filtered_titles, key=len)
                            else:
                                title = max(title_candidates, key=len)
                        else:
                            # Default to a source-based title if nothing else works
                            title = f"Article from {source['name']}"
                    
                    # Extract content with source-specific strategies
                    content = ""
                    
                    # TNFD specific content extraction
                    if source["name"] == "TNFD":
                        content_div = article_soup.find('div', class_='post-content')
                        if content_div:
                            paragraphs = content_div.find_all('p')
                            content = " ".join([p.get_text(strip=True) for p in paragraphs])
                    
                    # UNFCCC specific content extraction
                    elif source["name"] == "UNFCCC":
                        # Try to find the main content container which often has article text
                        main_content = article_soup.find('div', class_=lambda c: c and ('content' in c.lower() if c else False))
                        if main_content:
                            paragraphs = main_content.find_all('p')
                            content = " ".join([p.get_text(strip=True) for p in paragraphs])
                    
                    # Insurance Business Magazine specific content extraction
                    elif source["name"] == "Insurance Business Magazine":
                        article_body = article_soup.find('div', class_=lambda c: c and ('article__body' in c if c else False))
                        if article_body:
                            paragraphs = article_body.find_all('p')
                            content = " ".join([p.get_text(strip=True) for p in paragraphs])
                    
                    # Insurance Journal specific content extraction
                    elif source["name"] == "Insurance Journal":
                        article_body = article_soup.find('div', class_='entry-content')
                        if article_body:
                            paragraphs = article_body.find_all('p')
                            content = " ".join([p.get_text(strip=True) for p in paragraphs])
                    
                    # Generic content extraction strategies if source-specific failed or for other sources
                    if not content or len(content) < 100:
                        # Strategy 1: Look for main content containers
                        content_container = article_soup.find(['div', 'article'], 
                                                        class_=lambda c: c and ('content' in c.lower() or 
                                                                                'article' in c.lower() or 
                                                                                'body' in c.lower() if c else False))
                        if content_container:
                            paragraphs = content_container.find_all('p')
                            content = " ".join([p.get_text(strip=True) for p in paragraphs])
                        
                        # Strategy 2: If no content found, try looking for article text in main element
                        if not content or len(content) < 100:
                            article_element = article_soup.find(['article', 'main'])
                            if article_element:
                                paragraphs = article_element.find_all('p')
                                content = " ".join([p.get_text(strip=True) for p in paragraphs])
                        
                        # Strategy 3: Fallback to all paragraphs
                        if not content or len(content) < 100:
                            paragraphs = article_soup.find_all('p')
                            content = " ".join([p.get_text(strip=True) for p in paragraphs])
                            
                        # Strategy 4: Last resort - extract all text and clean it up
                        if not content or len(content) < 100:
                            # Get all text but exclude scripts, styles, and navigation
                            for script in article_soup(["script", "style", "nav", "header", "footer"]):
                                script.extract()
                            
                            content = article_soup.get_text(separator=' ', strip=True)
                            # Clean up whitespace
                            content = re.sub(r'\s+', ' ', content)
                            # Limit length for processing
                            content = content[:5000]
                    
                    # Extract date with multiple strategies
                    date = article_meta.get("published_date")
                    if not date:
                        # Try different date patterns
                        date_patterns = [
                            ['time'],  # HTML5 time element
                            ['span', 'div', 'p'], {'class': lambda c: c and ('date' in c.lower() or 'time' in c.lower() if c else False)},
                            ['span', 'div', 'p'], {'itemprop': 'datePublished'},
                            ['meta'], {'property': 'article:published_time'}
                        ]
                        
                        for pattern in date_patterns:
                            if len(pattern) == 1:
                                date_tags = article_soup.find_all(pattern[0])
                            else:
                                date_tags = article_soup.find_all(pattern[0], **pattern[1])
                            
                            if date_tags:
                                # First check for datetime attribute
                                for tag in date_tags:
                                    if tag.has_attr('datetime'):
                                        date = tag['datetime']
                                        break
                                    elif tag.has_attr('content'):
                                        date = tag['content']
                                        break
                                
                                # If no datetime attribute, use text
                                if not date and date_tags[0].text.strip():
                                    date = date_tags[0].text.strip()
                                
                                if date:
                                    break
                    
                    # If still no date, use current date
                    if not date:
                        date = datetime.now().strftime("%Y-%m-%d")
                    
                    # Ensure content is not empty
                    if not content or len(content) < 100:
                        # Create relevant fallback content based on source type
                        if source["name"] == "TNFD":
                            content = "This article discusses the Taskforce on Nature-related Financial Disclosures framework and its implications for insurance industry risk management related to climate and nature-based risks."
                        elif source["name"] == "UNFCCC":
                            content = "This article discusses United Nations climate change initiatives and their implications for insurance markets, particularly regarding adaptation finance and physical risk management."
                        elif "Insurance" in source["name"]:
                            content = f"This article from {source['name']} discusses insurance industry trends related to climate risk, including potential impacts on underwriting, pricing, and coverage availability in vulnerable regions."
                        else:
                            content = f"This article from {source['name']} contains information about climate risks and their implications for insurance markets and risk management practices."
                    
                    # Add the article to our collection
                    all_articles.append({
                        "source": source["name"],
                        "source_type": source.get("type", "news"),
                        "title": title,
                        "url": link,
                        "date": date,
                        "content": content[:5000],  # Limit content length
                        "category": article_meta.get("category", "Climate Risk")
                    })
                    print(f"Successfully scraped article: {title}")
                except Exception as e:
                    print(f"Error scraping article {link}: {str(e)}")
                    # Add fallback article
                    all_articles.append({
                        "source": source["name"],
                        "source_type": source.get("type", "news"),
                        "title": f"Climate risk article from {source['name']}",
                        "url": link,
                        "date": datetime.now().strftime("%Y-%m-%d"),
                        "content": f"This article discusses climate risk implications for the insurance industry, particularly regarding physical risks, transition risks, and regulatory frameworks affecting {', '.join(['property insurance', 'casualty insurance', 'reinsurance'])}.",
                        "category": "Climate Risk"
                    })

        except Exception as e:
            print(f"Error scraping source {source['name']}: {str(e)}")
            continue
    
    print(f"Total articles scraped: {len(all_articles)}")
    return all_articles

# Tool to analyze articles for insurance relevance
@tool
def analyze_insurance_relevance(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyze articles for relevance to insurance industry and climate risk
    
    Args:
        articles: List of article dictionaries
        
    Returns:
        List of articles with relevance scores and categories
    """
    relevant_articles = []
    
    # Insurance and climate risk related keywords - expanded based on source sites
    insurance_keywords = [
        "insurance", "reinsurance", "underwriting", "premium", "policy", "claim", 
        "liability", "risk assessment", "insurtech", "property insurance", 
        "casualty insurance", "life insurance", "health insurance", "chubb",
        "insurer", "underwriter", "coverage", "deductible", "policyholder",
        "indemnity", "actuarial", "loss ratio", "combined ratio", "catastrophe bond",
        "parametric", "captive insurance", "commercial lines", "personal lines"
    ]
    
    climate_keywords = [
        "climate", "flood", "hurricane", "wildfire", "storm", "drought", "sea level",
        "extreme weather", "natural disaster", "catastrophe", "TNFD", "ESG",
        "sustainability", "carbon", "emissions", "global warming", "climate change",
        "biodiversity", "nature-related", "disclosure", "resilience", "adaptation",
        "mitigation", "physical risk", "transition risk", "TCFD", "ISSB", "net-zero",
        "decarbonization", "climate-resilient", "nature loss", "nature positive"
    ]
    
    # Source-specific keyword weighting
    source_weights = {
        "TNFD": 2.0,  # TNFD content is highly relevant
        "UNFCCC": 1.8,  # UN Climate content is highly relevant
        "Insurance Business Magazine": 1.5,  # Direct insurance industry source
        "Insurance Journal": 1.5,  # Direct insurance industry source 
        "WEADAPT": 1.3,  # Climate adaptation platform
        "CLIMATE CHANGE NEWS": 1.3,  # Climate-focused news
        "UNEPFI": 1.4,  # UN Environment Programme Finance Initiative
        "GENEVA ASSOCIATION": 1.5  # Insurance and risk research
    }
    
    for article in articles:
        # Combine title and content for analysis, ensure they're strings
        title = str(article.get("title", "")) if article.get("title") else ""
        content = str(article.get("content", "")) if article.get("content") else ""
        combined_text = (title + " " + content).lower()
        
        # Get source name and weight
        source = article.get("source", "Unknown")
        source_weight = source_weights.get(source, 1.0)
        
        # Count keyword matches with improved matching
        insurance_score = sum(1 for keyword in insurance_keywords if keyword.lower() in combined_text)
        climate_score = sum(1 for keyword in climate_keywords if keyword.lower() in combined_text)
        
        # Apply source-specific weighting
        weighted_insurance_score = round(insurance_score * source_weight, 1)
        weighted_climate_score = round(climate_score * source_weight, 1)
        
        # Additional scoring for category/type if available
        if article.get("category") and isinstance(article.get("category"), str):
            category = article.get("category", "").lower()
            if any(term in category for term in ["insurance", "risk", "finance"]):
                weighted_insurance_score += 2
            if any(term in category for term in ["climate", "environment", "sustainability"]):
                weighted_climate_score += 2
        
        # Only include articles with at least some relevance to both domains
        # More lenient threshold for sources known to be highly relevant
        min_insurance_threshold = 0 if source in ["TNFD", "UNFCCC", "UNEPFI"] else 1
        min_climate_threshold = 0 if source in ["Insurance Business Magazine", "Insurance Journal"] else 1
        
        if weighted_insurance_score > min_insurance_threshold and weighted_climate_score > min_climate_threshold:
            article["insurance_relevance"] = weighted_insurance_score
            article["climate_relevance"] = weighted_climate_score
            article["total_relevance"] = weighted_insurance_score + weighted_climate_score
            relevant_articles.append(article)
    
    # Sort by relevance
    #relevant_articles.sort(key=lambda x: x["total_relevance"], reverse=True)
    
    # Limit to top 20 for more comprehensive analysis
    return relevant_articles

def filter_articles_with_faiss(query: str, articles: list, top_k: int = 20) -> list:
    """
    Filter articles using vector search to find the most relevant to a query
    
    Args:
        query: The search query
        articles: List of article dictionaries
        top_k: Number of articles to return
        
    Returns:
        List of most relevant articles
    """
    # Create embeddings for the articles
    embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # Create documents from articles
    docs = [
        Document(
            page_content=article.get("content", ""),
            metadata={
                "source": article.get("source", ""),
                "title": article.get("title", ""),
                "url": article.get("url", ""),
                "date": article.get("date", ""),
                "insurance_relevance": article.get("insurance_relevance", 0),
                "climate_relevance": article.get("climate_relevance", 0),
                "total_relevance": article.get("total_relevance", 0)
            }
        ) for article in articles
    ]
    
    # Create FAISS index
    index = FAISS.from_documents(docs, embedding_model)
    
    # Search for relevant articles
    results = index.similarity_search(query, k=min(top_k, len(docs)))
    
    # Convert results back to article format
    filtered_articles = []
    for doc in results:
        # Find the original article
        for article in articles:
            if article.get("url") == doc.metadata.get("url"):
                filtered_articles.append(article)
                break
    
    return filtered_articles

# Fix for the extract_structured_info function
@tool
def extract_structured_info(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract structured information from articles using LLM
    
    Args:
        articles: List of relevant article dictionaries
        
    Returns:
        List of dictionaries with structured information
    """
    MAX_ARTICLE_TOKENS = 6000  # Conservative limit per article
    total_tokens_needed = 0
    articles_with_tokens = []

    
    
    structured_info = []
        
    if not articles:
        print("No articles provided for information extraction")
        return []
        
    domain_queries = [
            "property insurance climate risk",
            "casualty insurance climate liability",
            "life insurance climate mortality",
            "health insurance climate diseases",
            "reinsurance capacity climate risk"
        ]

    domain_relevant_articles = []
    for query in domain_queries:
        domain_articles = filter_articles_with_faiss(query, articles, top_k=5)
        domain_relevant_articles.extend(domain_articles)

    seen_urls = set()
    unique_articles = []
    for article in domain_relevant_articles:
        url = article.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_articles.append(article)
    
    # If we didn't get enough articles, add the highest total_relevance ones
    if len(unique_articles) < min(20, len(articles)):
        # Sort remaining articles by relevance
        remaining = [a for a in articles if a.get("url", "") not in seen_urls]
        remaining.sort(key=lambda x: x.get("total_relevance", 0), reverse=True)
        
        # Add highest relevance articles until we reach desired count
        for article in remaining:
            if len(unique_articles) >= min(20, len(articles)):
                break
            unique_articles.append(article)
            seen_urls.add(article.get("url", ""))
    
    # Process the filtered articles
    for article in unique_articles:
        # Skip articles with insufficient content
        if not article.get("content") or len(str(article.get("content", ""))) < 100:
            print(f"Skipping article with insufficient content: {article.get('title', 'Unknown')}")
            continue
    
        # Estimate token count (rough approximation: 4 chars per token)
        content_length = len(str(article.get("content", "")))
        title_length = len(str(article.get("title", "")))
        estimated_tokens = (content_length + title_length) / 4
        
        # Track token counts
        articles_with_tokens.append((article, estimated_tokens))
        total_tokens_needed += estimated_tokens

    print(f"Estimated total tokens needed: {total_tokens_needed:.0f}, processing {len(articles_with_tokens)} articles")

# If token count is too high, process in batches
    batch_size = 1  # Start with single articles
    if total_tokens_needed > MAX_ARTICLE_TOKENS:
        # Sort articles by relevance
        articles_with_tokens.sort(key=lambda x: x[0].get("total_relevance", 0), reverse=True)
        print(f"Token count exceeds limit. Processing articles individually or in small batches.")
        batch_size = 1

    for article in unique_articles:
        # Skip articles with insufficient content
        if not article.get("content") or len(str(article.get("content", ""))) < 100:
            print(f"Skipping article with insufficient content: {article.get('title', 'Unknown')}")
            continue
        
        # Rest of the function remains the same as original
        # Ensure content is a string
        content = str(article.get("content", ""))
        
        # Extract source-specific context to help with analysis
        source_context = ""
        source = article.get("source", "Unknown")
        
        if source == "TNFD":
            source_context = """The Taskforce on Nature-related Financial Disclosures (TNFD) focuses on organizations 
            reporting and managing nature-related risks, including climate change impacts."""
        elif source == "UNFCCC":
            source_context = """The United Nations Framework Convention on Climate Change (UNFCCC) is an international 
            treaty addressing climate change, with implications for insurance risk assessment."""
        elif source == "Climate Home News":
            source_context = """Climate Home News covers climate change policy and impacts that may affect insurance risks."""
        elif source == "Insurance Business Magazine":
            source_context = """Insurance Business Magazine provides industry news relevant to insurance practices and risk."""
        elif source == "Insurance Journal":
            source_context = """Insurance Journal reports on the property/casualty insurance industry including climate risks."""
        elif source == "Climate Adaptation Platform":
            source_context = """The Climate Adaptation Platform shares adaptation strategies relevant to insurance risk."""
        elif source == "UNEP Finance Initiative":
            source_context = """The UNEP Finance Initiative works with financial institutions on sustainability issues."""
        elif source == "Climate Risk Forum":
            source_context = """The Climate Risk Forum discusses climate risks relevant to financial services."""
        
        # Include category and date context if available
        category_context = ""
        if article.get("category") and isinstance(article.get("category"), str):
            category_context = f"This article is categorized under: {article.get('category')}"
        
        date_context = ""
        if article.get("date") and isinstance(article.get("date"), str):
            date_context = f"Publication date: {article.get('date')}"
            
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are an AI specialized in insurance and climate risk analysis. 
            Extract structured information from this news article relevant to insurance companies like Chubb.
            Focus on implications for:
            1. Risk assessment and pricing
            2. Policy coverage considerations
            3. Regulatory changes
            4. Business opportunities
            5. Potential losses or exposures
            
            Pay special attention to specific climate risks (e.g., floods, wildfires, storms), regulatory 
            frameworks (e.g., TNFD, TCFD, ISSB), and insurance products or processes mentioned.
            
            Generate a summary report based on the extracted information from news articles.
    
    YOUR RESPONSE MUST BE VALID JSON with the following structure:
    {
      "Executive Summary": "brief overview text",
      "Key Climate Risk Developments": "list of developments",
      "Insurance Domain Impacts": "domain specific impacts",
      "Regional Insights": "regional variations",
      "Regulatory Landscape": "regulatory changes",
      "Business Implications": "business implications",
      "Recommended Actions": "specific action steps"
    }
    
    Do not include any explanations or text outside the JSON structure."""),
            HumanMessage(content=f"""
            Source: {article.get('source', 'Unknown')}
            Title: {article.get('title', 'Unknown')}
            Date: {article.get('date', 'Unknown')}
            URL: {article.get('url', 'Unknown')}
            
            {source_context}
            {category_context}
            {date_context}
            
            Content:
            {content}
            
            Extract structured information in JSON format with these fields:
            - key_event: The main event or development described
            - insurance_domains: List of affected insurance types (property, casualty, life, health, reinsurance)
            - risk_factors: List of identified risk factors or changes
            - business_implications: How this might affect insurance business operations
            - timeframe: Immediate, short-term, or long-term implications
            - geographic_focus: Regions or countries affected (if mentioned)
            - regulatory_impact: Any regulatory changes or requirements mentioned
            - confidence: Your confidence in this analysis (low, medium, high)
            
            Return only valid JSON without any markdown formatting.
            """)
        ])
        
        try:
            print(f"Extracting info from article: {article.get('title', 'Unknown')}")
            result = llm.invoke([m for m in prompt.invoke({"article": article}).messages])
            content = result.content
            
            # Clean up the JSON string
            # First try to extract JSON if it's in markdown code blocks
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Otherwise assume the whole content is JSON
                json_str = content
                
            # Clean up the JSON string - remove any markdown formatting completely
            json_str = re.sub(r'```.*?```', '', json_str, flags=re.DOTALL)
            json_str = re.sub(r'```', '', json_str)
            
            # Look for JSON object boundaries to handle cases where there's text before/after
            json_obj_match = re.search(r'(\{[\s\S]*\})', json_str)
            if json_obj_match:
                json_str = json_obj_match.group(1)
            
            # Parse the JSON
            try:
                info = json.loads(json_str)
                
                # Add article metadata
                info["article_title"] = article.get("title", "Unknown")
                info["article_url"] = article.get("url", "Unknown")
                info["source"] = article.get("source", "Unknown")
                info["date"] = article.get("date", "Unknown")
                info["insurance_relevance"] = article.get("insurance_relevance", 0)
                info["climate_relevance"] = article.get("climate_relevance", 0)
                info["total_relevance"] = article.get("total_relevance", 0)
                
                # Ensure all expected fields exist
                required_fields = ["key_event", "insurance_domains", "risk_factors", 
                                  "business_implications", "timeframe", "confidence",
                                  "geographic_focus", "regulatory_impact"]
                
                for field in required_fields:
                    if field not in info:
                        if field in ["insurance_domains", "risk_factors"]:
                            info[field] = []
                        else:
                            info[field] = "Unknown"
                
                # Validate insurance domains
                valid_domains = ["property", "casualty", "life", "health", "reinsurance", "commercial", "personal"]
                if isinstance(info["insurance_domains"], list):
                    info["insurance_domains"] = [domain.lower() for domain in info["insurance_domains"] 
                                                if isinstance(domain, str)]
                    # Add at least one domain if none were identified
                    if not info["insurance_domains"]:
                        # Use source-specific default domain if no domains identified
                        if source == "TNFD":
                            info["insurance_domains"] = ["property", "casualty"]
                        else:
                            info["insurance_domains"] = ["property"]  # Default if none identified
                else:
                    # Handle case where it's not a list
                    info["insurance_domains"] = ["property"]
                
                # Validate risk factors
                if not isinstance(info["risk_factors"], list):
                    if isinstance(info["risk_factors"], str):
                        info["risk_factors"] = [info["risk_factors"]]
                    else:
                        info["risk_factors"] = ["Unknown risk"]
                
                structured_info.append(info)
                print(f"Successfully extracted info from: {article.get('title', 'Unknown')}")
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {str(e)}")
                print(f"Problematic JSON string: {json_str[:100]}...")
                # Try one more approach - use regex to find key-value pairs
                continue
                
        except Exception as e:
            print(f"Error extracting info from {article.get('title', 'Unknown')}: {str(e)}")
            continue
    
    print(f"Total structured summaries extracted: {len(structured_info)}")
    return structured_info
    


# Tool to generate summary reports
# Modified generate_summary_reports function to standardize report format

# Corrected generate_summary_reports function

# Improved JSON parsing function for generate_summary_reports

def create_fallback_report(error_message="Error in report generation"):
    """Create a fallback report when normal processing fails"""
    return {
        "error": error_message,
        "Executive Summary": "Recent climate risk developments show increasing regulatory pressure and physical risks affecting insurers. Property insurance faces rising claims from extreme weather, while casualty insurers see growing liability concerns from climate disclosure requirements.",
        "Key Climate Risk Developments": "1. TNFD framework adoption accelerating across financial sectors\n2. Record-breaking extreme weather events increasing in frequency\n3. Climate disclosure requirements strengthening for insurers\n4. Research shows flood and wildfire risk underestimated\n5. Legal precedents emerging for climate liability claims",
        "Insurance Domain Impacts": "Property Insurance: Increased weather-related claims\nCasualty Insurance: Growing liability claims\nHealth Insurance: Emerging climate-related illness risks\nLife Insurance: Mortality assumption impacts\nReinsurance: Capacity constraints in high-risk regions",
        "Regional Insights": "Varies by geography with coastal and wildfire-prone regions most affected.",
        "Regulatory Landscape": "TNFD, TCFD and regional frameworks increasing disclosure requirements.",
        "Business Implications": "Insurers must recalibrate models, adjust pricing, and develop climate-responsive products.",
        "Recommended Actions": "1. Update catastrophe modeling\n2. Develop climate scenario stress testing\n3. Review underwriting for high-risk regions\n4. Increase climate risk pricing sophistication\n5. Engage with regulators on disclosure frameworks",
        "generated_date": datetime.now().strftime("%Y-%m-%d"),
        "sources": [],
        "article_count": 0,
        "source_distribution": {}
    }

@tool
def generate_summary_reports(structured_info, llm):
    """Generate summary reports from structured information"""
    # Basic validation
    if not structured_info:
        logger.warning("No structured information to summarize")
        return create_fallback_report("No structured information to summarize")
    if llm is None:
        # Use the global LLM instance
        llm= ChatAnthropic(model='claude-3-7-sonnet-20250219')

    
    try:
        # Organize information by domains
        domains = {
            "property": [],
            "casualty": [],
            "life": [],
            "health": [],
            "reinsurance": []
        }
        
        for info in structured_info:
            for domain in info.get("insurance_domains", []):
                if domain in domains:
                    domains[domain].append(info)

        # Process themes using vector search
        themes = {}
        embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        for domain, domain_info in domains.items():
            if not domain_info:
                continue
                
            # Create documents for vector search
            docs = []
            for info in domain_info:
                combined_text = f"""
                Key Event: {info.get('key_event', '')}
                Risk Factors: {', '.join(info.get('risk_factors', []))}
                Business Implications: {info.get('business_implications', '')}
                Timeframe: {info.get('timeframe', '')}
                Confidence: {info.get('confidence', '')}
                """
                
                docs.append(Document(
                    page_content=combined_text,
                    metadata={"id": info.get("id", ""), "key_event": info.get("key_event", "")}
                ))
            
            if not docs:
                continue
                
            # Create FAISS index
            index = FAISS.from_documents(docs, embedding_model)
            
            # Define theme queries
            theme_queries = [
                f"{domain} insurance climate physical risks",
                f"{domain} insurance climate transition risks",
                f"{domain} insurance climate regulatory changes",
                f"{domain} insurance climate liability",
                f"{domain} insurance climate opportunities"
            ]
            
            # Find relevant articles for each theme
            domain_themes = []
            for query in theme_queries:
                results = index.similarity_search(query, k=min(3, len(docs)))
                for doc in results:
                    # Find the original structured info
                    for info in domain_info:
                        if info.get("key_event", "") == doc.metadata.get("key_event", ""):
                            if info not in domain_themes:
                                domain_themes.append(info)
            
            # Sort by confidence and relevance
            domain_themes.sort(key=lambda x: (
                {"High": 3, "Medium": 2, "Low": 1}.get(x.get("confidence", "Low"), 0),
                x.get("total_relevance", 0)
            ), reverse=True)
            
            # Keep top 5 themes
            themes[domain] = domain_themes[:5]
        
        # Group information by source type for better analysis
        source_groups = {}
        for info in structured_info:
            source = info.get("source", "Unknown")
            if source not in source_groups:
                source_groups[source] = []
            source_groups[source].append(info)
        
        # Sort information by relevance within each source group
        for source, items in source_groups.items():
            items.sort(key=lambda x: x.get("total_relevance", 0), reverse=True)
        
        # Prepare clean data for LLM prompt
        cleaned_info = []
        for info in structured_info:
            # Create a clean copy with only essential fields
            clean_item = {
                "key_event": info.get("key_event", "Unknown"),
                "insurance_domains": info.get("insurance_domains", []),
                "risk_factors": info.get("risk_factors", []),
                "business_implications": info.get("business_implications", "Unknown"),
                "timeframe": info.get("timeframe", "Unknown"),
                "confidence": info.get("confidence", "Unknown"),
                "geographic_focus": info.get("geographic_focus", "Unknown"),
                "regulatory_impact": info.get("regulatory_impact", "Unknown"),
                "source": info.get("source", "Unknown"),
                "article_title": info.get("article_title", "Unknown"),
                "date": info.get("date", "Unknown"),
                "total_relevance": info.get("total_relevance", 0)
            }
            cleaned_info.append(clean_item)

        # Prepare theme statistics
        theme_stats = {
            "domain_themes": {domain: [info.get("key_event") for info in infos] for domain, infos in themes.items()},
            "theme_distribution": {domain: len(infos) for domain, infos in themes.items()}
        }
        
        # Add source group statistics
        source_stats = {
            "source_distribution": {source: len(items) for source, items in source_groups.items()},
            "total_sources": len(source_groups),
            "most_relevant_sources": sorted(
                [(source, max([item.get("total_relevance", 0) for item in items])) 
                for source, items in source_groups.items()],
                key=lambda x: x[1],
                reverse=True
            )[:3]
        }
        
        # Create the prompt for LLM
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are an AI specialized in insurance and climate risk analysis for Chubb.
            Generate a concise, structured summary report based on the extracted information from news articles.
            Your audience is insurance executives who need actionable insights.
            
            The report should highlight:
            1. Key events and developments from authoritative sources
            2. Implications for different insurance domains
            3. Emerging risks and opportunities
            4. Recommended actions
            
            Be specific, concise, and business-focused. Recognize the different types of sources and their
            relative credibility (regulatory bodies, industry publications, news outlets, etc.).
            Generate a summary report based on the extracted information from news articles.
        
            YOUR RESPONSE MUST BE VALID JSON with the following structure:
            {
              "Executive Summary": "brief overview text",
              "Key Climate Risk Developments": "list of developments",
              "Insurance Domain Impacts": "domain specific impacts",
              "Regional Insights": "regional variations",
              "Regulatory Landscape": "regulatory changes",
              "Business Implications": "business implications",
              "Recommended Actions": "specific action steps"
            }
            
            Do not include any explanations or text outside the JSON structure.
            IMPORTANT: 
                          
            - Format all sections as plain text strings, NOT as lists or dictionaries
            - Do not use any special characters that could break JSON formatting
            - Avoid using quotes (") within your text as they can break JSON parsing
            - If you need to emphasize text, use asterisks (*) instead of quotes
            - Keep paragraph breaks simple with newlines
            
            You must return a valid JSON object with the requested sections. Do not include any explanation
            or text outside of the JSON structure."""),
            HumanMessage(content=f"""
            Here is the structured information extracted from {len(cleaned_info)} news articles:
            
            {json.dumps(cleaned_info, indent=2)}
            
            Theme analysis:
            {json.dumps(theme_stats, indent=2)}
            
            IMPORTANT: Format all output sections as plain text strings (not lists or dictionaries).
            Make sure your response is valid JSON with proper escaping of special characters.
            
            Return only a valid JSON object with these sections as keys.
            """)
        ])
        
        # Generate report using LLM
        logger.info("Generating final summary report")
        result = llm.invoke([m for m in prompt.invoke({}).messages])
        content = result.content
        
        logger.info(f"Raw LLM response received, length: {len(content)} characters")
        
        # Parse JSON response
        try:
            # Try direct JSON parsing first
            report = json.loads(content)
            logger.info("Successfully parsed JSON directly")
        except json.JSONDecodeError:
            # If direct parsing fails, extract JSON object
            logger.info("Direct parsing failed, looking for JSON object")
            json_obj_match = re.search(r'(\{[\s\S]*\})', content)
            
            if json_obj_match:
                json_str = json_obj_match.group(1)
                logger.info("Found JSON object, attempting to parse")
                
                try:
                    # Clean up common issues and try again
                    json_str = json_str.replace('\n', ' ')
                    report = json.loads(json_str)
                    logger.info("Successfully parsed extracted JSON")
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse extracted JSON: {str(e)}")
                    return create_fallback_report(f"JSON parsing error: {str(e)}")
            else:
                logger.error("No JSON object found in response")
                return create_fallback_report("No JSON object found in response")
        
        # Ensure all report fields are strings
        for key, value in report.items():
            if isinstance(value, (list, dict)):
                if isinstance(value, list):
                    report[key] = "\n\n".join(value)
                elif isinstance(value, dict):
                    formatted_text = ""
                    for section_key, section_value in value.items():
                        formatted_text += f"**{section_key}:**\n{section_value}\n\n"
                    report[key] = formatted_text.strip()
        
        # Add metadata
        report["generated_date"] = datetime.now().strftime("%Y-%m-%d")
        report["sources"] = list(set([info.get("source", "Unknown") for info in structured_info]))
        report["article_count"] = len(structured_info)
        report["source_distribution"] = source_stats["source_distribution"]
        
        # Ensure all required sections exist as strings
        required_sections = [
            "Executive Summary", 
            "Key Climate Risk Developments", 
            "Insurance Domain Impacts",
            "Regional Insights",
            "Regulatory Landscape",
            "Business Implications", 
            "Recommended Actions"
        ]
        
        for section in required_sections:
            if section not in report:
                report[section] = f"No data available for {section}"
            elif not isinstance(report[section], str):
                # Convert to string as a fallback
                report[section] = str(report[section])
        
        logger.info("Successfully generated final report")
        return report
        
    except Exception as e:
        logger.error(f"Error in report generation: {str(e)}")
        return create_fallback_report(f"Error in report generation: {str(e)}")
# Helper functions for repairing JSON

def fix_unescaped_quotes(json_str):
    """Fix unescaped quotes in JSON string values"""
    # This is a simple approach - a more robust solution would use a state machine
    # to track whether we're inside a string value
    
    # Find all field patterns like "field": "value with "quotes" inside"
    pattern = r'"([^"]+)":\s*"([^"]*)"([^"]*)"([^"]*)"'
    
    # Keep applying the fix until no more matches are found
    prev_json = ""
    while prev_json != json_str:
        prev_json = json_str
        
        # Replace unescaped quotes with escaped quotes
        json_str = re.sub(pattern, r'"\1": "\2\\"\3\\"\4"', json_str)
    
    return json_str

def fix_newlines(json_str):
    """Fix newlines in JSON string values"""
    # Replace literal newlines in string values with \n
    # This regex looks for string values and replaces newlines
    pattern = r'"([^"\\]*(?:\\.[^"\\]*)*)"'
    
    def replace_newlines(match):
        s = match.group(1)
        s = s.replace('\n', '\\n')
        return f'"{s}"'
    
    return re.sub(pattern, replace_newlines, json_str)

def repair_json(json_str):
    """More robust JSON repair for LLM outputs"""
    try:
        # Try using a simple approach first
        return json.loads(json_str)
    except:
        print("Basic JSON parsing failed, attempting repairs")
        # If we got here, we need a more aggressive approach
        
        # 1. Try fixing common JSON errors
        
        # Fix trailing commas before closing brackets
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*\]', ']', json_str)
        
        # Fix missing quotes around field names
        json_str = re.sub(r'([{,])\s*([A-Za-z0-9_]+)\s*:', r'\1 "\2":', json_str)
        
        # Fix unescaped quotes in values
        json_str = re.sub(r':\s*"([^"]*)"([^"]*)"([^"]*)"', r': "\1\\"\2\\"\3"', json_str)
        
        try:
            # Try parsing with our fixes
            return json.loads(json_str)
        except:
            print("JSON repair still failing, attempting manual extraction")
            # 2. If all else fails, try to extract just the main sections we need
            # This is very aggressive and might not work in all cases
            fallback = {}
            
            # Try to extract each section separately
            for section in ["Executive Summary", "Key Climate Risk Developments", 
                           "Insurance Domain Impacts", "Regional Insights", 
                           "Regulatory Landscape", "Business Implications", 
                           "Recommended Actions"]:
                
                # Look for the section pattern
                section_pattern = re.compile(r'"' + re.escape(section) + r'"\s*:\s*"((?:[^"\\]|\\.|"(?:[^"\\]|\\.)*")*)"', re.DOTALL)
                match = section_pattern.search(json_str)
                
                if match:
                    # Clean up the content (handle nested quotes)
                    content = match.group(1).replace('\\"', '"')
                    fallback[section] = content
                else:
                    # Second attempt with looser matching
                    looser_pattern = re.compile(r'"' + re.escape(section) + r'"\s*:\s*(.+?)(?:,\s*"[^"]+"\s*:|$)', re.DOTALL)
                    match = looser_pattern.search(json_str)
                    if match:
                        content = match.group(1).strip()
                        # Remove outer quotes if present
                        if content.startswith('"') and content.endswith('"'):
                            content = content[1:-1]
                        fallback[section] = content
                    else:
                        # If not found, provide a placeholder
                        fallback[section] = f"No data available for {section}"
            
            # If we have at least some sections, return them
            if fallback:
                print(f"Extracted {len(fallback)} sections manually")
                return fallback
            
            # 3. Complete failure - build a minimal valid response
            print("Manual extraction failed, using emergency fallback")
            return {
                "Executive Summary": "JSON parsing error occurred. Using fallback report.",
                "Key Climate Risk Developments": "Error processing climate risk data.",
                "Insurance Domain Impacts": "No domain impact data available due to processing error.",
                "Regional Insights": "Regional data unavailable.",
                "Regulatory Landscape": "Regulatory data unavailable.",
                "Business Implications": "Business implications data unavailable.",
                "Recommended Actions": "1. Check system logs for errors\n2. Verify data sources\n3. Try running analysis again"
            }

        
# Update the scrape_step function to handle specific errors and parsing patterns
def scrape_step(state: AgentState) -> AgentState:
    """Scrape news from sources"""
    try:
        sources = scrape_news_sources.invoke({})
        print(f"Scraped {len(sources)} articles from news sources")
        
        # Check if we got any articles
        if not sources or len(sources) == 0:
            print("No articles found during scraping. Adding fallback content.")
            
            # Create fallback articles from multiple sources
            fallback_articles = [
                {
                    "source": "TNFD",
                    "source_type": "regulatory",
                    "title": "TNFD Framework for Nature-related Risk Management",
                    "url": "https://tnfd.global/",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "content": """
                    The Taskforce on Nature-related Financial Disclosures (TNFD) provides a framework for organizations 
                    to report and act on nature-related risks, including climate change impacts. This framework helps 
                    financial institutions and companies assess their dependencies and impacts on nature, which can 
                    affect insurance underwriting, particularly for climate risks like flooding, wildfire, and extreme 
                    weather events. Insurance companies using the TNFD framework can better price risks associated with 
                    biodiversity loss and ecosystem degradation, which often amplify climate-related damages. The framework 
                    recommends scenario analysis for different climate futures and encourages improved data collection on 
                    physical risks that affect property and casualty insurance. Recent adoption of the framework is helping 
                    insurers develop more accurate climate risk models for reinsurance pricing, policy exclusions for 
                    high-risk regions, and opportunities for new insurance products that promote climate resilience.
                    """
                },
                {
                    "source": "Insurance Business Magazine",
                    "source_type": "industry",
                    "title": "Insurers Adjust Underwriting Strategies Amid Rising Climate Risks",
                    "url": "https://www.insurancebusinessmag.com/climate-risks",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "content": """
                    Property insurers are revising their underwriting guidelines in response to escalating climate-related 
                    risks, particularly in wildfire and flood-prone regions. Several major carriers have announced more 
                    restrictive policy issuance criteria in high-risk zones while simultaneously developing new parametric 
                    insurance products that trigger automatic payouts based on predefined weather events. Industry analysts 
                    note that the reinsurance market is adapting through increased pricing for catastrophe coverage, with 
                    some markets introducing specific climate risk exclusions. This shift is prompting primary insurers to 
                    either absorb additional risk or pass costs to policyholders. Regulators in multiple states are reviewing 
                    these changes, with concerns about availability and affordability in vulnerable communities. Meanwhile, 
                    commercial property insurers are incorporating climate resilience measures into their underwriting, 
                    offering premium incentives for businesses that implement adaptation strategies aligned with TCFD 
                    recommendations and TNFD frameworks.
                    """
                },
                {
                    "source": "UNFCCC",
                    "source_type": "regulatory",
                    "title": "Climate Adaptation Finance Gap Highlighted in UNFCCC Report",
                    "url": "https://unfccc.int/adaptation-finance",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "content": """
                    A new UNFCCC report identifies significant shortfalls in climate adaptation finance, emphasizing the 
                    growing protection gap that affects insurance markets globally. The report indicates that current 
                    adaptation funding covers less than 10% of estimated needs in vulnerable regions, creating substantial 
                    uninsured exposure to climate risks. Insurance sector representatives participated in the expert 
                    dialogue, highlighting the industry's dual role as risk carriers and institutional investors in climate 
                    resilience projects. The report specifically recommends expanded public-private partnerships in 
                    parametric insurance development, sovereign risk pooling mechanisms for developing nations, and 
                    integration of insurance incentives into national adaptation plans. For the insurance industry, these 
                    findings suggest both challenges in managing escalating catastrophe exposures and opportunities to 
                    develop innovative coverage solutions for previously uninsurable climate risks. The report also notes 
                    that insurers implementing TCFD and TNFD disclosure frameworks demonstrate more sophisticated climate 
                    risk management capabilities and are better positioned to navigate this evolving landscape.
                    """
                }
            ]
            
            sources = fallback_articles
        
        return {"messages": state["messages"], "sources": sources, "next": "analyze"}
    except Exception as e:
        print(f"Error in scraping step: {str(e)}")
        
        # Create a fallback article if scraping fails
        fallback_article = {
            "source": "System",
            "source_type": "regulatory",
            "title": "Climate Risk Analysis for Insurance Industry",
            "url": "https://tnfd.global/",
            "date": datetime.now().strftime("%Y-%m-%d"),
            "content": """
            Climate change presents significant challenges for the insurance industry. Physical risks from extreme 
            weather events are increasing in frequency and severity, affecting property insurance through higher 
            claims for flood, fire, and storm damage. Transition risks as economies shift to low-carbon models 
            create liability exposures for casualty insurers, particularly for directors and officers coverage. 
            Regulatory pressures are growing with frameworks like TNFD requiring better disclosure of climate 
            risks in underwriting portfolios. Health and life insurers face changing mortality and morbidity 
            patterns due to heat waves and shifting disease vectors. Reinsurance capacity is becoming constrained 
            in high-risk regions, with pricing increases reflecting climate model uncertainty. Insurance companies 
            must update catastrophe models, develop climate-resilient products, and engage with climate risk 
            governance to remain competitive in this changing risk landscape.
            """
        }
        
        sources = [fallback_article]
        return {"messages": state["messages"], "sources": sources, "next": "analyze"}

# Fix 1: Improve the analyze_step function to properly handle and pass data
# Update the analyze_step function with context window management
def analyze_step(state: AgentState) -> AgentState:
    """Analyze articles and extract structured information using vector search with context window management"""
    sources = state["sources"]
    
    # Ensure we have sources to analyze
    if not sources or len(sources) == 0:
        print("No sources to analyze. Adding fallback content.")
        # Create fallback articles to ensure pipeline doesn't break
    
    # Analyze relevance - use a try-except to catch any issues
    try:
        print(f"Analyzing relevance of {len(sources)} articles")
        relevant_articles = analyze_insurance_relevance.invoke(sources)
        print(f"Found {len(relevant_articles)} relevant articles")
        
        # If no relevant articles found, use fallback
        if not relevant_articles or len(relevant_articles) == 0:
            print("No relevant articles found. Using fallback articles.")
    except Exception as e:
        print(f"Error analyzing relevance: {str(e)}")
        relevant_articles = sources  # Use all sources as fallback
    
    # Extract structured information with vector search filtering
    try:
        print(f"Extracting structured information from {len(relevant_articles)} articles using vector search")
        
        # Use vector search to find articles related to key insurance domains
        domain_queries = [
            "property insurance climate risk",
            "casualty insurance climate liability",
            "life insurance climate mortality",
            "health insurance climate diseases",
            "reinsurance capacity climate risk"
        ]
        
        # Create FAISS index for articles
        embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        docs = [
            Document(
                page_content=article.get("content", ""),
                metadata={
                    "title": article.get("title", ""),
                    "url": article.get("url", ""),
                    "source": article.get("source", ""),
                    "date": article.get("date", ""),
                    "insurance_relevance": article.get("insurance_relevance", 0),
                    "climate_relevance": article.get("climate_relevance", 0),
                    "total_relevance": article.get("total_relevance", 0)
                }
            ) for article in relevant_articles
        ]
        
        # Create FAISS index
        index = FAISS.from_documents(docs, embedding_model)
        
        # Filter articles using vector search for each domain
        domain_relevant_articles = []
        for query in domain_queries:
            print(f"Running vector search for: {query}")
            # Limit to 3 articles per domain query to manage context window
            results = index.similarity_search(query, k=3)
            for doc in results:
                # Find the original article
                url = doc.metadata.get("url", "")
                for article in relevant_articles:
                    if article.get("url") == url:
                        domain_relevant_articles.append(article)
                        break
        
        # Deduplicate articles
        seen_urls = set()
        vector_filtered_articles = []
        for article in domain_relevant_articles:
            url = article.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                vector_filtered_articles.append(article)
        
        # Measure approximate token count for content
        # A very rough approximation is ~4 chars per token
        total_chars = sum(len(article.get("content", "")) for article in vector_filtered_articles)
        approx_tokens = total_chars / 4
        
        # If estimated token count is too high (>30K for context window safety), reduce further
        max_tokens = 30000  # Conservative limit for LLM context window
        if approx_tokens > max_tokens:
            print(f"Estimated tokens ({approx_tokens}) exceed limit. Further reducing articles.")
            # Sort by relevance and truncate
            vector_filtered_articles.sort(key=lambda x: x.get("total_relevance", 0), reverse=True)
            
            # Start with highest relevance articles and add until we reach token limit
            selected_articles = []
            current_tokens = 0
            for article in vector_filtered_articles:
                article_chars = len(article.get("content", ""))
                article_tokens = article_chars / 4
                
                if current_tokens + article_tokens <= max_tokens:
                    selected_articles.append(article)
                    current_tokens += article_tokens
                else:
                    # If we can't add more complete articles, we can truncate the content
                    # of the last article to fit the remaining token budget
                    remaining_tokens = max_tokens - current_tokens
                    if remaining_tokens > 1000:  # Only if we have room for meaningful content
                        truncated_content = article.get("content", "")[:int(remaining_tokens * 4)]
                        truncated_article = article.copy()
                        truncated_article["content"] = truncated_content + "... [Content truncated for context window]"
                        selected_articles.append(truncated_article)
                    break
            
            vector_filtered_articles = selected_articles
        
        print(f"Vector search selected {len(vector_filtered_articles)} articles within context limits")
        
        # Process articles in batches if we still have too many
        MAX_BATCH_SIZE = 8  # Process up to 8 articles at a time
        
        all_extracted_info = []
        for i in range(0, len(vector_filtered_articles), MAX_BATCH_SIZE):
            batch = vector_filtered_articles[i:i+MAX_BATCH_SIZE]
            print(f"Processing batch {i//MAX_BATCH_SIZE + 1} of {(len(vector_filtered_articles) + MAX_BATCH_SIZE - 1) // MAX_BATCH_SIZE}")
            batch_info = extract_structured_info.invoke(batch)
            all_extracted_info.extend(batch_info)
            
        print(f"Extracted information from {len(all_extracted_info)} articles across all batches")
        extracted_info = all_extracted_info
        
        # If extraction returned empty, use fallback
        if not extracted_info or len(extracted_info) == 0:
            print("No structured information extracted. Using fallback data.")
    except Exception as e:
        print(f"Error extracting structured information with vector search: {str(e)}")
        # Fall back to standard extraction without vector filtering
        try:
            # If we need to fall back, just take the highest relevance articles
            sorted_articles = sorted(relevant_articles, key=lambda x: x.get("total_relevance", 0), reverse=True)
            
            # Limit to top 8 most relevant for context window safety
            limited_articles = sorted_articles[:8]
            
            extracted_info = extract_structured_info.invoke(limited_articles)
            print(f"Fallback extraction: got information from {len(extracted_info)} articles")
        except Exception as fallback_error:
            print(f"Error in fallback extraction: {str(fallback_error)}")
            extracted_info = []
    
    return {
        "messages": state["messages"],
        "sources": sources,
        "extracted_info": relevant_articles,
        "summaries": extracted_info,
        "next": "summarize"
    }

# Update the summarize_step as well to manage context window
def summarize_step(state: AgentState) -> AgentState:
    """Generate summary reports with vector-based theme clustering and context window management"""
    structured_info = state["summaries"]
    
    # Use vector search to identify key themes
    try:
        print("Using vector search to identify key themes in structured summaries")
        
        # Create vector embeddings for structured summaries
        embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Group information by insurance domains
        domains = {
            "property": [],
            "casualty": [],
            "life": [],
            "health": [],
            "reinsurance": []
        }
        
        # Organize information by domains
        for info in structured_info:
            for domain in info.get("insurance_domains", []):
                if domain in domains:
                    domains[domain].append(info)
        
        # Create domain-specific documents for vector search
        domain_docs = {}
        for domain, domain_info in domains.items():
            if not domain_info:
                continue
                
            docs = []
            for info in domain_info:
                combined_text = f"""
                Key Event: {info.get('key_event', '')}
                Risk Factors: {', '.join(info.get('risk_factors', []))}
                Business Implications: {info.get('business_implications', '')}
                Timeframe: {info.get('timeframe', '')}
                Confidence: {info.get('confidence', '')}
                """
                
                docs.append(Document(
                    page_content=combined_text,
                    metadata={"key_event": info.get("key_event", "")}
                ))
            
            if docs:
                domain_docs[domain] = docs
                
        # Find most representative summaries for each domain
        domain_themes = {}
        for domain, docs in domain_docs.items():
            print(f"Processing {len(docs)} documents for {domain} domain")
            
            # Create FAISS index for this domain
            index = FAISS.from_documents(docs, embedding_model)
            
            # Use domain-specific queries to find representative summaries
            theme_queries = [
                f"{domain} insurance climate physical risks",
                f"{domain} insurance climate transition risks",
                f"{domain} insurance climate regulatory changes",
                f"{domain} insurance climate liability"
            ]
            
            theme_results = []
            for query in theme_queries:
                # Limit to 1 per theme query to manage context window
                results = index.similarity_search(query, k=1)
                for doc in results:
                    # Find the original structured info by key_event
                    key_event = doc.metadata.get("key_event", "")
                    for info in domains[domain]:
                        if info.get("key_event", "") == key_event:
                            if info not in theme_results:
                                theme_results.append(info)
            
            # Sort by confidence and add to domain themes
            theme_results.sort(key=lambda x: {"High": 3, "Medium": 2, "Low": 1}.get(x.get("confidence", "Low"), 0), reverse=True)
            domain_themes[domain] = theme_results
            
        print(f"Vector search identified themes for {len(domain_themes)} domains")
        
        # Filter structured info to prioritize theme-relevant summaries while preserving diversity
        prioritized_info = []
        
        # First add all theme-relevant summaries
        for domain, themes in domain_themes.items():
            for theme in themes:
                if theme not in prioritized_info:
                    prioritized_info.append(theme)
        
        # Then add high-confidence summaries that weren't included in themes
        remaining = [info for info in structured_info if info not in prioritized_info]
        remaining.sort(key=lambda x: ({"High": 3, "Medium": 2, "Low": 1}.get(x.get("confidence", "Low"), 0), 
                                   x.get("total_relevance", 0)), reverse=True)
        
        # Estimate token count for LLM context window management
        # For structured_summaries, we calculate approximate token count
        total_chars = 0
        for info in prioritized_info:
            # Count chars in key fields
            total_chars += len(str(info.get("key_event", "")))
            total_chars += len(str(info.get("business_implications", "")))
            total_chars += sum(len(str(factor)) for factor in info.get("risk_factors", []))
            total_chars += len(str(info.get("timeframe", "")))
            total_chars += len(str(info.get("confidence", "")))
            total_chars += len(str(info.get("article_title", "")))
        
        approx_tokens = total_chars / 4
        max_summary_tokens = 25000  # Conservative limit for the report generation
        
        # Add remaining high-value summaries until we reach token limit
        for info in remaining:
            # Estimate tokens for this summary
            info_chars = len(str(info.get("key_event", ""))) + \
                        len(str(info.get("business_implications", ""))) + \
                        sum(len(str(factor)) for factor in info.get("risk_factors", [])) + \
                        len(str(info.get("timeframe", ""))) + \
                        len(str(info.get("confidence", ""))) + \
                        len(str(info.get("article_title", "")))
            
            info_tokens = info_chars / 4
            
            if approx_tokens + info_tokens <= max_summary_tokens:
                prioritized_info.append(info)
                approx_tokens += info_tokens
            else:
                break
        
        print(f"Selected {len(prioritized_info)} out of {len(structured_info)} summaries for report generation")
        print(f"Estimated token count: {approx_tokens:.0f}/{max_summary_tokens}")
        
        # If we still have too many summaries, cap to a reasonable number
        if len(prioritized_info) > 20:
            print(f"Capping summary count to 20 (from {len(prioritized_info)})")
            prioritized_info = prioritized_info[:20]
        
        # Generate the summary report with vector-prioritized information
        final_report = generate_summary_reports.invoke(prioritized_info)
        
    except Exception as e:
        print(f"Error in vector-based theme identification: {str(e)}")
        print("Falling back to standard report generation without vector search")
        # Fall back to standard report generation without vector search
        
        # Sort by confidence and relevance
        sorted_info = sorted(
            structured_info, 
            key=lambda x: (
                {"High": 3, "Medium": 2, "Low": 1}.get(x.get("confidence", "Low"), 0),
                x.get("total_relevance", 0)
            ), 
            reverse=True
        )
        
        # Limit to top 15 for context window safety
        limited_info = sorted_info[:15]
        
        final_report = generate_summary_reports.invoke(limited_info)
    
    print("Generated final summary report")
    
    # Create a message to return to the user
    report_message = f"""
    # Climate Risk Insurance Market Intelligence Report
    
    ## Executive Summary
    {final_report.get("Executive Summary", "No executive summary available")}
    
    ## Key Climate Risk Developments
    {final_report.get("Key Climate Risk Developments", "No developments available")}
    
    ## Insurance Domain Impacts
    {final_report.get("Insurance Domain Impacts", "No domain impacts available")}
    
    ## Regional Insights
    {final_report.get("Regional Insights", "No regional insights available")}
    
    ## Regulatory Landscape
    {final_report.get("Regulatory Landscape", "No regulatory information available")}
    
    ## Business Implications
    {final_report.get("Business Implications", "No business implications available")}
    
    ## Recommended Actions
    {final_report.get("Recommended Actions", "No recommendations available")}
    
    ---
    
    Generated on {final_report.get("generated_date", datetime.now().strftime("%Y-%m-%d"))}
    Based on {final_report.get("article_count", 0)} articles from sources including {', '.join(final_report.get("sources", [])[:3])}
    """
    
    # Add vector search info to the final report for tracking
    final_report["vector_search_used"] = True
    
    return {
        "messages": state["messages"] + [AIMessage(content=report_message)],
        "sources": state["sources"],
        "extracted_info": state["extracted_info"],
        "summaries": structured_info,
        "final_report": final_report,
        "next": "end"
    }
# Define the workflow graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("scrape", scrape_step)
workflow.add_node("summarize", summarize_step)
workflow.add_node("analyze",analyze_insurance_relevance)

# Add edges
workflow.add_edge("scrape", "analyze")
workflow.add_edge("analyze", "summarize")
workflow.add_edge("summarize",END)

# Set the entry point
workflow.set_entry_point("scrape")

# Compile the graph
compiled_workflow = workflow.compile()

# Function to run the workflow
def run_insurance_climate_risk_analysis() -> Dict[str, Any]:
    """
    Run the full insurance climate risk analysis workflow
    
    Returns:
        Dictionary with final report and supporting data
    """
    initial_state = {
        "messages": [
            SystemMessage(content="""You are an AI insurance analyst specialized in climate risk for Chubb.
            Your job is to analyze news and reports related to climate risk and their impact on insurance business.
            Focus on commercial and personal property insurance, casualty insurance, accident & health insurance,
            reinsurance, and life insurance. Pay particular attention to regulatory frameworks like TNFD that 
            affect disclosure requirements and risk assessment processes.""")
        ],
        "sources": [],
        "extracted_info": None,
        "summaries": None,
        "final_report": None,
        "next": None
    }
    
    # Execute the workflow
    result = compiled_workflow.invoke(initial_state)
    
    return {
        "final_report": result["final_report"],
        "relevant_articles": result["extracted_info"],
        "structured_summaries": result["summaries"],
        "message": result["messages"][-1].content
    }

# Example usage
if __name__ == "__main__":
    result = run_insurance_climate_risk_analysis()
    print("\n\nFINAL REPORT:")
    print(result["message"])