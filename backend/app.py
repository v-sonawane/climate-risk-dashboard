# app.py - FIXED VERSION
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query, status, Path, APIRouter, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, field_serializer
from datetime import datetime, timedelta
import asyncio
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging
import requests
from bs4 import BeautifulSoup
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.schema import Document
import os
from langchain_anthropic import ChatAnthropic
from dotenv import load_dotenv
import ast
from langchain_core.messages import SystemMessage, HumanMessage
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uuid
# … after: app = FastAPI(...)
origins = [
    "http://localhost:5173",
    # you can add other origins here (or "*" for all)
]



load_dotenv()

llm= ChatAnthropic(model='claude-3-7-sonnet-20250219')


class RegulatoryFramework(BaseModel):
    name: str
    description: str
    status: str  # 'emerging', 'established', 'proposed'
    region: str
    relevance_score: float
    implementation_date: Optional[str] = None
    url: Optional[str] = None
    domains_affected: List[str]



class RegulatoryTrend(BaseModel):
    """Model for regulatory trends data"""
    month: str 
    property: int
    casualty: int
    life: int
    health: int
    reinsurance: int
    created_at: Optional[datetime] = None


class ESGImpact(BaseModel):
    category: str
    name: str
    score: float
    impact: str  # 'High', 'Medium', 'Low'
    description: str
    relevant_frameworks: List[str]
    trend: str  # 'increasing', 'stable', 'decreasing'


class CoverageGapData(BaseModel):
    hazard_type: str
    region: str
    coverage_gap_percentage: int
    economic_losses: float
    insured_losses: float
    trends: Dict[str, float]
    key_challenges: List[str]



# ---- Helper functions ----

async def extract_regulatory_frameworks_from_summaries(region=None, status=None, min_relevance=None):
    """
    Extract regulatory frameworks from structured summaries and articles.
    Used when dedicated regulatory_frameworks collection is empty.
    """
    # Query structured summaries for regulatory mentions
    query = {"regulatory_impact": {"$exists": True, "$ne": None}}
    
    frameworks = {}
    async for summary in db.structured_summaries.find(query):
        # Extract framework names from regulatory_impact field
        regulatory_text = summary.get("regulatory_impact", "")
        
        # Look for common framework names
        common_frameworks = [
            "TCFD", "TNFD", "ISSB", "EU Taxonomy", "SFDR", "CSRD", 
            "SEC Climate Rule", "NAIC", "APRA CPG 229"
        ]
        
        for framework in common_frameworks:
            if framework in regulatory_text:
                if framework not in frameworks:
                    # Initialize new framework
                    region_guess = "global"
                    if "EU" in framework or "SFDR" in framework or "CSRD" in framework:
                        region_guess = "europe"
                    elif "SEC" in framework or "NAIC" in framework:
                        region_guess = "north_america"
                    elif "APRA" in framework:
                        region_guess = "asia_pacific"
                    
                    status_guess = "established"
                    if "TNFD" in framework or "ISSB" in framework:
                        status_guess = "emerging"
                    
                    frameworks[framework] = {
                        "name": framework,
                        "description": f"Regulatory framework related to climate risk disclosure and management",
                        "status": status_guess,
                        "region": region_guess,
                        "relevance_score": 7.0,  # Default score
                        "domains_affected": []
                    }
                
                # Add domains affected
                domains = summary.get("insurance_domains", [])
                for domain in domains:
                    if domain not in frameworks[framework]["domains_affected"]:
                        frameworks[framework]["domains_affected"].append(domain)
                        
                # Increase relevance score with each mention
                frameworks[framework]["relevance_score"] = min(10.0, frameworks[framework]["relevance_score"] + 0.2)
    
    # Filter results based on parameters
    result = list(frameworks.values())
    if region:
        result = [f for f in result if f["region"] == region]
    if status:
        result = [f for f in result if f["status"] == status]
    if min_relevance:
        result = [f for f in result if f["relevance_score"] >= min_relevance]
    
    # Sort by relevance
    result.sort(key=lambda x: x["relevance_score"], reverse=True)
    
    return result

async def extract_esg_impacts_from_summaries(category=None):
    """
    Extract ESG impacts from structured summaries when esg_impacts collection is empty.
    """
    # Initialize counters for different ESG categories and topics
    esg_categories = {
        "E": ["Physical Risk", "Transition Risk", "Biodiversity Loss", "Resource Scarcity"],
        "S": ["Community Impact", "Health Effects", "Employment Shifts", "Climate Justice"],
        "G": ["Risk Governance", "Disclosure Requirements", "Board Oversight", "Strategy Integration"]
    }
    
    impact_counts = {}
    for cat, topics in esg_categories.items():
        for topic in topics:
            impact_counts[f"{cat}-{topic}"] = {
                "category": cat,
                "name": topic,
                "count": 0,
                "score": 5.0,  # Default score
                "relevant_frameworks": [],
                "domains": [],
                "trend": "stable"
            }
    
    # Query all structured summaries
    async for summary in db.structured_summaries.find():
        # Check risk factors for ESG relevance
        risk_factors = summary.get("risk_factors", [])
        business_imp = summary.get("business_implications", "")
        reg_impact = summary.get("regulatory_impact", "")
        content = " ".join([str(factor) for factor in risk_factors]) + " " + business_imp + " " + reg_impact
        content = content.lower()
        
        # Map keywords to ESG categories
        keyword_mapping = {
            "E-Physical Risk": ["flood", "hurricane", "wildfire", "drought", "extreme weather", "sea level"],
            "E-Transition Risk": ["carbon", "emission", "renewable", "transition", "stranded assets"],
            "E-Biodiversity Loss": ["biodiversity", "ecosystem", "nature", "species", "habitat"],
            "E-Resource Scarcity": ["water", "resource", "scarcity", "depletion"],
            "S-Community Impact": ["community", "displacement", "migration", "vulnerability"],
            "S-Health Effects": ["health", "disease", "mortality", "morbidity", "heat stress"],
            "S-Employment Shifts": ["job", "employment", "workforce", "labor", "skills"],
            "S-Climate Justice": ["justice", "equity", "vulnerable", "underserved", "minority"],
            "G-Risk Governance": ["governance", "management", "oversight", "committee"],
            "G-Disclosure Requirements": ["disclosure", "reporting", "transparency", "materiality"],
            "G-Board Oversight": ["board", "director", "oversight", "responsibility"],
            "G-Strategy Integration": ["strategy", "integration", "long-term", "planning"]
        }
        
        # Check for keyword matches
        for impact_key, keywords in keyword_mapping.items():
            for keyword in keywords:
                if keyword in content:
                    impact_counts[impact_key]["count"] += 1
                    # Increase score with each mention
                    impact_counts[impact_key]["score"] = min(10.0, impact_counts[impact_key]["score"] + 0.1)
                    
                    # Check if there are domains affected
                    domains = summary.get("insurance_domains", [])
                    for domain in domains:
                        if domain not in impact_counts[impact_key]["domains"]:
                            impact_counts[impact_key]["domains"].append(domain)
                    
                    # Check for framework mentions
                    frameworks = ["TCFD", "TNFD", "EU Taxonomy", "SFDR", "ISSB", "SEC Climate Rule"]
                    for framework in frameworks:
                        if framework in reg_impact and framework not in impact_counts[impact_key]["relevant_frameworks"]:
                            impact_counts[impact_key]["relevant_frameworks"].append(framework)
                    
                    break  # Only count each keyword once per summary
    
    # Transform to final format
    results = []
    for key, data in impact_counts.items():
        if data["count"] > 0:  # Only include impacts with at least one mention
            impact_level = "Low"
            if data["score"] >= 7.5:
                impact_level = "High"
            elif data["score"] >= 5.0:
                impact_level = "Medium"
                
            results.append({
                "category": data["category"],
                "name": data["name"],
                "score": round(data["score"], 1),
                "impact": impact_level,
                "description": f"Impact on insurance related to {data['name'].lower()} with {len(data['domains'])} affected domains",
                "relevant_frameworks": data["relevant_frameworks"],
                "trend": "increasing" if data["score"] > 7.0 else "stable"
            })
    
    # Filter by category if requested
    if category:
        results = [r for r in results if r["category"] == category]
    
    # Sort by score
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return results
async def generate_regulatory_frameworks(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generate structured regulatory framework data from articles using AI
    
    Args:
        articles: List of relevant articles
        
    Returns:
        List of regulatory frameworks extracted from the articles
    """
    logger.info(f"Generating regulatory frameworks from {len(articles)} articles")
    
    # Filter articles that might mention regulatory frameworks
    regulatory_keywords = ["regulation", "framework", "disclosure", "compliance", "TCFD", 
                           "TNFD", "SEC", "EU Taxonomy", "ESG", "SFDR", "CSRD", "ISSB"]
    
    # Find articles mentioning regulation
    regulatory_articles = []
    for article in articles:
        content = article.get("content", "").lower() + article.get("title", "").lower()
        if any(keyword.lower() in content for keyword in regulatory_keywords):
            regulatory_articles.append(article)
    
    if not regulatory_articles:
        logger.warning("No articles found with regulatory content")
        return []
    
    # Take most relevant articles
    regulatory_articles = sorted(
        regulatory_articles, 
        key=lambda x: x.get("total_relevance", 0), 
        reverse=True
    )[:10]  # Limit to 10 most relevant articles
    
    # Generate structured data using LLM
    frameworks = []
    for article in regulatory_articles:
        prompt = f"""
        Extract regulatory framework information from this article about climate risk and insurance.
        
        ARTICLE:
        Title: {article.get('title', '')}
        Date: {article.get('date', '')}
        Content: {article.get('content', '')[:4000]}
        
        Extract any mentioned regulatory frameworks (like TCFD, TNFD, SFDR, SEC Climate Rule) related to climate risk disclosure, 
        reporting requirements, or compliance that would impact insurance companies.
        
        For each identified regulatory framework, provide:
        1. Name of the framework
        2. Description of what it requires
        3. Status (emerging, established, or proposed)
        4. Region affected (global, north_america, europe, asia_pacific, etc.)
        5. Relevance score (1-10) for insurance industry
        6. Implementation date (if mentioned)
        7. Which insurance domains are affected (property, casualty, life, health, reinsurance)
        
        Return ONLY valid JSON in this format (array of frameworks):
        [
          {
            "name": "Framework Name",
            "description": "Brief description",
            "status": "emerging|established|proposed",
            "region": "global|europe|north_america|etc",
            "relevance_score": 8.5,
            "implementation_date": "YYYY-MM-DD",
            "domains_affected": ["property", "casualty", "etc"]
          }
        ]
        
        If no frameworks are mentioned, return an empty array: []
        """
        
        try:
            system_msg = SystemMessage(content="You are an expert financial regulations analyst specializing in climate risk disclosure frameworks.")
            human_msg = HumanMessage(content=prompt)
            
            response = llm.invoke([system_msg, human_msg])
            content = response.content
            
            # Extract JSON from response
            json_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
            import re
            json_match = re.search(json_pattern, content)
            
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find JSON object directly
                json_str = content
                
            try:
                extracted_frameworks = json.loads(json_str)
                if isinstance(extracted_frameworks, list):
                    # Add source info
                    for framework in extracted_frameworks:
                        framework["source_article_id"] = article.get("id", "")
                        framework["source_article_title"] = article.get("title", "")
                        framework["source"] = article.get("source", "")
                        
                    frameworks.extend(extracted_frameworks)
                    logger.info(f"Extracted {len(extracted_frameworks)} frameworks from article: {article.get('title', '')}")
                
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON from LLM response for article: {article.get('title', '')}")
        
        except Exception as e:
            logger.error(f"Error generating regulatory frameworks: {str(e)}")
    
    # Deduplicate frameworks by name
    unique_frameworks = {}
    for framework in frameworks:
        name = framework.get("name", "").strip()
        if name:
            # If we already have this framework, keep the one with the higher relevance score
            if name in unique_frameworks:
                if framework.get("relevance_score", 0) > unique_frameworks[name].get("relevance_score", 0):
                    unique_frameworks[name] = framework
            else:
                unique_frameworks[name] = framework
    
    result = list(unique_frameworks.values())
    logger.info(f"Generated {len(result)} unique regulatory frameworks")
    return result

async def generate_esg_impacts(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generate ESG impact data from articles using AI
    
    Args:
        articles: List of relevant articles
        
    Returns:
        List of ESG impacts extracted from the articles
    """
    logger.info(f"Generating ESG impacts from {len(articles)} articles")
    
    # Filter articles that might mention ESG topics
    esg_keywords = ["ESG", "environmental", "social", "governance", "sustainability", 
                   "climate justice", "biodiversity", "transition risk", "physical risk"]
    
    # Find articles mentioning ESG
    esg_articles = []
    for article in articles:
        content = article.get("content", "").lower() + article.get("title", "").lower()
        if any(keyword.lower() in content for keyword in esg_keywords):
            esg_articles.append(article)
    
    if not esg_articles:
        logger.warning("No articles found with ESG content")
        return []
    
    # Take most relevant articles
    esg_articles = sorted(
        esg_articles, 
        key=lambda x: x.get("total_relevance", 0), 
        reverse=True
    )[:10]  # Limit to 10 most relevant articles
    
    # Generate structured data using LLM
    impacts = []
    for article in esg_articles:
        prompt = f"""
        Extract ESG (Environmental, Social, Governance) impact information from this article about climate risk and insurance.
        
        ARTICLE:
        Title: {article.get('title', '')}
        Date: {article.get('date', '')}
        Content: {article.get('content', '')[:4000]}
        
        Extract ESG impacts related to climate risk that would affect insurance companies.
        Consider:
        - Physical risks (floods, wildfires, etc.)
        - Transition risks (policy, market changes, etc.)
        - Social impacts (climate justice, health effects, etc.)
        - Governance requirements (disclosure, board responsibilities, etc.)
        
        For each identified ESG impact, provide:
        1. Category (E for Environmental, S for Social, G for Governance)
        2. Name of the impact
        3. Score (1-10) reflecting severity or importance 
        4. Impact level (High, Medium, Low)
        5. Description of how it affects insurance
        6. Relevant frameworks mentioned (TCFD, TNFD, etc.)
        7. Current trend (increasing, stable, decreasing)
        
        Return ONLY valid JSON in this format (array of impacts):
        [
          {
            "category": "E",
            "name": "Impact Name",
            "score": 8.5,
            "impact": "High|Medium|Low",
            "description": "Brief description",
            "relevant_frameworks": ["TCFD", "etc"],
            "trend": "increasing|stable|decreasing"
          }
        ]
        
        If no ESG impacts are identified, return an empty array: []
        """
        
        try:
            system_msg = SystemMessage(content="You are an expert ESG analyst specializing in climate risk impacts for insurance companies.")
            human_msg = HumanMessage(content=prompt)
            
            response = llm.invoke([system_msg, human_msg])
            content = response.content
            
            # Extract JSON from response
            json_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
            import re
            json_match = re.search(json_pattern, content)
            
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find JSON object directly
                json_str = content
                
            try:
                extracted_impacts = json.loads(json_str)
                if isinstance(extracted_impacts, list):
                    # Add source info
                    for impact in extracted_impacts:
                        impact["source_article_id"] = article.get("id", "")
                        impact["source_article_title"] = article.get("title", "")
                        impact["source"] = article.get("source", "")
                        
                    impacts.extend(extracted_impacts)
                    logger.info(f"Extracted {len(extracted_impacts)} ESG impacts from article: {article.get('title', '')}")
                
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON from LLM response for article: {article.get('title', '')}")
        
        except Exception as e:
            logger.error(f"Error generating ESG impacts: {str(e)}")
    
    # Deduplicate impacts by category + name
    unique_impacts = {}
    for impact in impacts:
        key = f"{impact.get('category', '')}-{impact.get('name', '')}".strip()
        if key:
            # If we already have this impact, keep the one with the higher score
            if key in unique_impacts:
                if impact.get("score", 0) > unique_impacts[key].get("score", 0):
                    unique_impacts[key] = impact
            else:
                unique_impacts[key] = impact
    
    result = list(unique_impacts.values())
    logger.info(f"Generated {len(result)} unique ESG impacts")
    return result

async def generate_underwriting_challenges(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generate underwriting challenges data from articles using AI
    
    Args:
        articles: List of relevant articles
        
    Returns:
        List of underwriting challenges extracted from the articles
    """
    logger.info(f"Generating underwriting challenges from {len(articles)} articles")
    
    # Filter articles that might mention underwriting challenges
    underwriting_keywords = ["underwriting", "premium", "pricing", "rate", "coverage", "capacity", 
                            "risk assessment", "model", "catastrophe", "flood", "wildfire", "hurricane"]
    
    # Find articles mentioning underwriting
    underwriting_articles = []
    for article in articles:
        content = article.get("content", "").lower() + article.get("title", "").lower()
        if any(keyword.lower() in content for keyword in underwriting_keywords):
            underwriting_articles.append(article)
    
    if not underwriting_articles:
        logger.warning("No articles found with underwriting content")
        return []
    
    # Take most relevant articles
    underwriting_articles = sorted(
        underwriting_articles, 
        key=lambda x: x.get("total_relevance", 0), 
        reverse=True
    )[:10]  # Limit to 10 most relevant articles
    
    # Generate structured data using LLM
    challenges = []
    for article in underwriting_articles:
        prompt = f"""
        Extract climate-related underwriting challenges from this article about insurance.
        
        ARTICLE:
        Title: {article.get('title', '')}
        Date: {article.get('date', '')}
        Content: {article.get('content', '')[:4000]}
        
        Extract specific underwriting challenges that climate risk creates for insurance companies.
        Consider challenges related to:
        - Risk assessment and modeling difficulties
        - Premium pricing considerations
        - Coverage limitations or exclusions
        - Capacity constraints
        - Specific climate hazards like floods, wildfires, hurricanes, etc.
        
        For each identified challenge, provide:
        1. Clear description of the challenge
        2. Related hazard type (flood, hurricane, wildfire, drought, storm, other)
        3. Geographic region affected (north_america, europe, asia_pacific, global, etc.)
        4. Impact level (High, Medium, Low)
        5. Business implications for insurers
        
        Return ONLY valid JSON in this format (array of challenges):
        [
          {{
            "challenge": "Description of the challenge",
            "hazard_type": "flood|hurricane|wildfire|drought|storm|other",
            "region": "north_america|europe|asia_pacific|global|etc",
            "impact_level": "High|Medium|Low",
            "business_implications": "Explanation of impacts"
          }}
        ]
        
        If no underwriting challenges are identified, return an empty array: []
        """
        
        try:
            system_msg = SystemMessage(content="You are an expert insurance underwriter specializing in climate risk assessment.")
            human_msg = HumanMessage(content=prompt)
            
            response = llm.invoke([system_msg, human_msg])
            content = response.content
            
            # Extract JSON from response
            json_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
            import re
            json_match = re.search(json_pattern, content)
            
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find JSON object directly
                json_str = content
                
            try:
                extracted_challenges = json.loads(json_str)
                if isinstance(extracted_challenges, list):
                    # Add source info and unique ID
                    for i, challenge in enumerate(extracted_challenges):
                        challenge["id"] = f"{article.get('id', 'article')}_{i}"
                        challenge["source"] = article.get("source", "Unknown")
                        challenge["date"] = article.get("date", datetime.now().strftime("%Y-%m-%d"))
                        
                    challenges.extend(extracted_challenges)
                    logger.info(f"Extracted {len(extracted_challenges)} underwriting challenges from article: {article.get('title', '')}")
                
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON from LLM response for article: {article.get('title', '')}")
        
        except Exception as e:
            logger.error(f"Error generating underwriting challenges: {str(e)}")
    
    # Return the combined list (no deduplication as challenges may be similar but distinct)
    logger.info(f"Generated {len(challenges)} underwriting challenges")
    return challenges


async def generate_coverage_gaps(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generate coverage gap data from articles using AI
    
    Args:
        articles: List of relevant articles
        
    Returns:
        List of coverage gap analyses extracted from the articles
    """
    logger.info(f"Generating coverage gap analyses from {len(articles)} articles")
    
    # Filter articles that might mention coverage gaps
    coverage_keywords = ["coverage gap", "protection gap", "uninsured", "underinsured", 
                         "economic loss", "insured loss", "take-up rate", "affordability"]
    
    # Find articles mentioning coverage gaps
    coverage_articles = []
    for article in articles:
        content = article.get("content", "").lower() + article.get("title", "").lower()
        if any(keyword.lower() in content for keyword in coverage_keywords):
            coverage_articles.append(article)
    
    if not coverage_articles:
        logger.warning("No articles found with coverage gap content")
        return []
    
    # Take most relevant articles
    coverage_articles = sorted(
        coverage_articles, 
        key=lambda x: x.get("total_relevance", 0), 
        reverse=True
    )[:10]  # Limit to 10 most relevant articles
    
    # Generate structured data using LLM
    gaps = []
    for article in coverage_articles:
        prompt = f"""
        Extract coverage gap information from this article about climate risk and insurance.
        
        ARTICLE:
        Title: {article.get('title', '')}
        Date: {article.get('date', '')}
        Content: {article.get('content', '')[:4000]}
        
        Extract information about insurance coverage gaps related to climate risks.
        Coverage gaps are the difference between economic losses and insured losses from climate events.
        
        For identified coverage gaps, provide:
        1. Related hazard type (flood, hurricane, wildfire, drought, storm, other)
        2. Geographic region affected (north_america, europe, asia_pacific, global, etc.)
        3. Coverage gap percentage (if mentioned or can be inferred)
        4. Economic losses in billions USD (if mentioned)
        5. Insured losses in billions USD (if mentioned)
        6. Trends information (gap increasing or decreasing, take-up rate changes)
        7. Key challenges creating or maintaining this coverage gap
        
        Return ONLY valid JSON in this format (array of coverage gaps):
        [
          {{
            "hazard_type": "flood|hurricane|wildfire|drought|storm|other",
            "region": "north_america|europe|asia_pacific|global|etc",
            "coverage_gap_percentage": 70,
            "economic_losses": 42.5,
            "insured_losses": 12.8,
            "trends": {{
              "gap_change": 5.0,
              "take_up_rate": -3.0
            }},
            "key_challenges": [
              "Challenge 1",
              "Challenge 2",
              "Challenge 3"
            ]
          }}
        ]
        
        Where:
        - coverage_gap_percentage is the percentage of economic losses that are uninsured
        - gap_change is percentage points the gap has changed (positive means growing gap)
        - take_up_rate is the percentage change in insurance adoption (negative means decreasing adoption)
        
        Provide realistic estimates based on industry knowledge if exact figures aren't mentioned.
        If no coverage gap information is identified, return an empty array: []
        """
        
        try:
            system_msg = SystemMessage(content="You are an expert insurance analyst specializing in climate risk coverage gaps.")
            human_msg = HumanMessage(content=prompt)
            
            response = llm.invoke([system_msg, human_msg])
            content = response.content
            
            # Extract JSON from response
            json_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
            import re
            json_match = re.search(json_pattern, content)
            
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find JSON object directly
                json_str = content
                
            try:
                extracted_gaps = json.loads(json_str)
                if isinstance(extracted_gaps, list):
                    # Add source info
                    for gap in extracted_gaps:
                        gap["source_article_id"] = article.get("id", "")
                        gap["source_article_title"] = article.get("title", "")
                        gap["source"] = article.get("source", "")
                        
                    gaps.extend(extracted_gaps)
                    logger.info(f"Extracted {len(extracted_gaps)} coverage gaps from article: {article.get('title', '')}")
                
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON from LLM response for article: {article.get('title', '')}")
        
        except Exception as e:
            logger.error(f"Error generating coverage gaps: {str(e)}")
    
    # Deduplicate gaps by hazard type and region
    unique_gaps = {}
    for gap in gaps:
        key = f"{gap.get('hazard_type', '')}-{gap.get('region', '')}".strip()
        if key:
            # If we already have this gap, keep the one with more complete information
            if key in unique_gaps:
                current = unique_gaps[key]
                # Check which has more complete data
                if (gap.get("economic_losses") and gap.get("insured_losses") and 
                    (not current.get("economic_losses") or not current.get("insured_losses"))):
                    unique_gaps[key] = gap
                # Or keep the one with more recent source
                elif (gap.get("source_article_date", "") > current.get("source_article_date", "")):
                    unique_gaps[key] = gap
            else:
                unique_gaps[key] = gap
    
    result = list(unique_gaps.values())
    logger.info(f"Generated {len(result)} unique coverage gaps")
    return result

# Main function to populate database with AI-generated data
async def populate_climate_risk_data():
    """
    Main function to scrape news, analyze and generate structured data for the dashboard
    """
    logger.info("Starting comprehensive climate risk data population")
    
    try:
        # Step 1: Scrape latest news
        news_sources = scrape_news_sources.invoke({})
        logger.info(f"Scraped {len(news_sources)} articles from news sources")
        
        # Step 2: Analyze insurance relevance
        relevant_articles = analyze_insurance_relevance.invoke({"articles": news_sources})
        logger.info(f"Found {len(relevant_articles)} relevant articles")
        
        # Step 3: Generate structured data for different endpoints
        frameworks = await generate_regulatory_frameworks(relevant_articles)
        esg_impacts = await generate_esg_impacts(relevant_articles)
        underwriting_challenges = await generate_underwriting_challenges(relevant_articles)
        coverage_gaps = await generate_coverage_gaps(relevant_articles)
        
        # Step 4: Store in database for API endpoints
        # Regulatory frameworks
        if frameworks:
            # Clear existing data or use upsert
            await db.regulatory_frameworks.delete_many({})
            await db.regulatory_frameworks.insert_many(frameworks)
            logger.info(f"Stored {len(frameworks)} regulatory frameworks in database")
        
        # ESG impacts
        if esg_impacts:
            # Clear existing data or use upsert
            await db.esg_impacts.delete_many({})
            await db.esg_impacts.insert_many(esg_impacts)
            logger.info(f"Stored {len(esg_impacts)} ESG impacts in database")
        
        # Underwriting challenges
        if underwriting_challenges:
            # Clear existing data or use upsert
            await db.underwriting_challenges.delete_many({})
            await db.underwriting_challenges.insert_many(underwriting_challenges)
            logger.info(f"Stored {len(underwriting_challenges)} underwriting challenges in database")
        
        # Coverage gaps
        if coverage_gaps:
            # Clear existing data or use upsert
            await db.coverage_gaps.delete_many({})
            await db.coverage_gaps.insert_many(coverage_gaps)
            logger.info(f"Stored {len(coverage_gaps)} coverage gaps in database")
        
        logger.info("Successfully populated climate risk data")
        return True
        
    except Exception as e:
        logger.error(f"Error populating climate risk data: {str(e)}")
        return False

# Schedule periodic data updates
def schedule_data_population(scheduler):
    """Add data population task to the scheduler"""
    # Run daily at 3:00 AM (after the basic analysis)
    scheduler.add_job(populate_climate_risk_data, "cron", hour=3, minute=0)
    logger.info("Scheduled daily climate risk data population")

def generate_fallback_regulatory_trends(months=6):
    """Generate fallback regulatory trend data when database queries return no results"""
    trends = []
    current_month = datetime.now()
    
    for i in range(months):
        month_date = current_month - timedelta(days=30 * (months - i - 1))
        month_str = month_date.strftime("%Y-%m")
        
        # Generate realistic trend data with property and casualty having higher regulatory impact
        trends.append({
            "month": month_str,
            "property": 25 - ((months - i - 1) * 2),
            "casualty": 20 - ((months - i - 1) * 2),
            "life": 10 - ((months - i - 1)),
            "health": 12 - ((months - i - 1)),
            "reinsurance": 18 - ((months - i - 1) * 2)
        })
    
    return trends



# Create and persist FAISS index from articles
def build_faiss_index(articles: list[dict], save_path: str = "faiss_index") -> FAISS:
    embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    docs = [
        Document(
            page_content=article.get("content", ""),
            metadata={
                "title": article.get("title"),
                "url": article.get("url"),
                "source": article.get("source"),
                "date": article.get("date")
            }
        ) for article in articles
    ]
    index = FAISS.from_documents(docs, embedding_model)
    index.save_local(save_path)
    return index

# Load FAISS index if it exists
def load_faiss_index(path: str = "faiss_index") -> FAISS:
    embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return FAISS.load_local(path, embedding_model, allow_dangerous_deserialization=True)



# Run semantic filter instead of using all articles in LLM calls
def filter_articles_with_faiss(query: str, top_k: int = 20) -> list[dict]:
    index = load_faiss_index()
    docs = index.similarity_search(query, k=top_k)
    return [doc.metadata | {"content": doc.page_content} for doc in docs]


try:
    from .api import (
        scrape_news_sources,
        scrape_specific_articles,
        analyze_insurance_relevance,
        extract_structured_info,
        generate_summary_reports,
        NEWS_SOURCES,
        create_fallback_report
    )
except ImportError:
    # Fallback for direct execution
    from api import (
        scrape_news_sources,
        analyze_insurance_relevance,
        extract_structured_info,
        generate_summary_reports,
        NEWS_SOURCES
    )

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("climate-risk-api")

# Initialize FastAPI app
app = FastAPI(
    title="Climate Risk Intelligence API",
    description="API for monitoring climate risks affecting insurance domains",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # <-- your front‑end
    allow_credentials=True,
    allow_methods=["*"],              # GET, POST, OPTIONS, etc.
    allow_headers=["*"],              # Allow all headers
)

@app.post("/admin/populate-climate-data", status_code=status.HTTP_202_ACCEPTED)
async def trigger_climate_data_population(background_tasks: BackgroundTasks):
    """
    Trigger the AI-powered data population process for climate risk intelligence.
    """
    # Run the population task in the background
    background_tasks.add_task(populate_climate_risk_data)
    
    return {
        "message": "Climate risk data population started",
        "status": "accepted"
    }

@app.post("/admin/store-underwriting-challenges")
async def store_underwriting_challenges(challenges: List[dict]):
    """Store AI-generated underwriting challenges"""
    try:
        if challenges and len(challenges) > 0:
            # Insert challenges into the database
            await db.underwriting_challenges.delete_many({})  # Clear existing
            await db.underwriting_challenges.insert_many(challenges)
            return {"message": f"Stored {len(challenges)} underwriting challenges", "success": True}
        return {"message": "No challenges provided", "success": False}
    except Exception as e:
        logger.error(f"Error storing underwriting challenges: {str(e)}")
        return {"message": f"Error: {str(e)}", "success": False}

def get_default_frameworks(region=None, status=None, min_relevance=None):
    """Return default frameworks data when real data isn't available"""
    default_frameworks = [
        {
            "name": "TCFD",
            "description": "Task Force on Climate-related Financial Disclosures - Framework for climate-related financial risk disclosures",
            "status": "established",
            "region": "global",
            "relevance_score": 9.5,
            "implementation_date": "2017-06-29",
            "url": "https://www.fsb-tcfd.org/",
            "domains_affected": ["property", "casualty", "life", "health", "reinsurance"]
        },
        {
            "name": "TNFD",
            "description": "Taskforce on Nature-related Financial Disclosures - Framework for nature-related risk management",
            "status": "emerging",
            "region": "global",
            "relevance_score": 8.7,
            "implementation_date": "2023-09-18",
            "url": "https://tnfd.global/",
            "domains_affected": ["property", "casualty", "reinsurance"]
        },
        {
            "name": "EU Taxonomy",
            "description": "European Union classification system establishing environmentally sustainable economic activities",
            "status": "established",
            "region": "europe",
            "relevance_score": 8.3,
            "implementation_date": "2022-01-01",
            "url": "https://finance.ec.europa.eu/sustainable-finance/tools-and-standards/eu-taxonomy-sustainable-activities_en",
            "domains_affected": ["property", "casualty", "life", "health", "reinsurance"]
        },
        {
            "name": "SFDR",
            "description": "Sustainable Finance Disclosure Regulation - EU regulation on sustainability-related disclosures",
            "status": "established",
            "region": "europe",
            "relevance_score": 7.9,
            "implementation_date": "2021-03-10",
            "url": "https://www.esma.europa.eu/",
            "domains_affected": ["property", "life", "reinsurance"]
        },
        {
            "name": "SEC Climate Rule",
            "description": "SEC climate disclosure requirements for public companies in the United States",
            "status": "emerging",
            "region": "north_america",
            "relevance_score": 8.4,
            "implementation_date": "2024-01-15",
            "url": "https://www.sec.gov/",
            "domains_affected": ["property", "casualty", "reinsurance"]
        },
        {
            "name": "NAIC Climate Risk Disclosure Survey",
            "description": "U.S. state insurance regulators' climate risk disclosure requirements",
            "status": "established",
            "region": "north_america",
            "relevance_score": 7.2,
            "implementation_date": "2020-01-01",
            "url": "https://www.naic.org/",
            "domains_affected": ["property", "casualty", "life"]
        },
        {
            "name": "ISSB Standards",
            "description": "International Sustainability Standards Board disclosure standards",
            "status": "emerging",
            "region": "global",
            "relevance_score": 8.1,
            "implementation_date": "2024-01-01",
            "url": "https://www.ifrs.org/issb/",
            "domains_affected": ["property", "casualty", "life", "health", "reinsurance"]
        }
    ]
    
    # Apply filters to default data
    filtered = default_frameworks
    
    if region and region != "global":
        filtered = [f for f in filtered if f["region"] == region]
        
    if status:
        filtered = [f for f in filtered if f["status"] == status]
        
    if min_relevance:
        filtered = [f for f in filtered if f["relevance_score"] >= min_relevance]
        
    return filtered

@app.get("/regulatory/frameworks")
async def get_regulatory_frameworks(
    region: Optional[str] = None,
    status: Optional[str] = None,
    min_relevance: Optional[float] = None
):
    """
    Get regulatory frameworks relevant to climate risk in insurance.
    Filter by region, status, and minimum relevance score.
    
    Args:
        region: Geographic region (global, europe, north_america, etc.)
        status: Framework status (established, emerging, proposed)
        min_relevance: Minimum relevance score (1-10)
        
    Returns:
        List of regulatory frameworks matching the filter criteria
    """
    try:
        query = {}
        
        # Apply filters if provided
        if region and region != "global":
            query["region"] = region
        
        if status:
            query["status"] = status
            
        if min_relevance:
            query["relevance_score"] = {"$gte": min_relevance}
            
        # Check if we have a dedicated collection for frameworks
        count = await db.regulatory_frameworks.count_documents({})
        
        if count > 0:
            # If we have data in the dedicated collection, use it
            frameworks = []
            cursor = db.regulatory_frameworks.find(query).sort("relevance_score", -1)
            
            async for doc in cursor:
                frameworks.append(document_helper(doc))
                
            return frameworks
        else:
            # If collection is empty, extract from structured summaries
            try:
                # This function should be defined elsewhere in your code
                frameworks = await extract_regulatory_frameworks_from_summaries(
                    region=region, 
                    status=status, 
                    min_relevance=min_relevance
                )
                return frameworks
            except Exception as extract_error:
                logger.error(f"Error extracting frameworks from summaries: {str(extract_error)}")
                # Fall back to default frameworks data
                return get_default_frameworks(region, status, min_relevance)
    except Exception as e:
        logger.error(f"Error fetching regulatory frameworks: {str(e)}")
        # Return default frameworks as fallback
        return get_default_frameworks(region, status, min_relevance)
    
# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
database_name = "climate_risk_intelligence"

# Connect to MongoDB
client = AsyncIOMotorClient(MONGODB_URL)
db = client[database_name]

# Initialize scheduler
scheduler = AsyncIOScheduler()

# Custom ObjectId class for Pydantic
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    
    # For Pydantic v2 compatibility
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return handler(str)

# Base Models
class MongoBaseModel(BaseModel):
    """Base model with MongoDB ObjectId handling"""
    id: Optional[PyObjectId] = None
    
    # Custom serializer for ObjectId
    @field_serializer('id')
    def serialize_id(self, id: Optional[ObjectId]) -> Optional[str]:
        return str(id) if id else None
    
    model_config = {
        "arbitrary_types_allowed": True,
        "populate_by_name": True,
    }

class NewsSourceModel(BaseModel):
    name: str
    url: str
    type: str
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "TNFD",
                "url": "https://tnfd.global/news",
                "type": "regulatory"
            }
        }
    }
    
class ArticleBase(BaseModel):
    source: str
    source_type: str
    title: str
    url: str
    date: str
    content: str

class ArticleModel(ArticleBase, MongoBaseModel):
    insurance_relevance: Optional[float] = None
    climate_relevance: Optional[float] = None
    total_relevance: Optional[float] = None
    created_at: Optional[datetime] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "source": "TNFD",
                "source_type": "regulatory",
                "title": "TNFD Framework Adoption Accelerating",
                "url": "https://tnfd.global/news/article",
                "date": "2024-04-18",
                "content": "Major financial institutions have begun reporting against the TNFD framework...",
                "insurance_relevance": 8.5,
                "climate_relevance": 9.0,
                "total_relevance": 17.5
            }
        }
    }

class StructuredSummaryModel(MongoBaseModel):
    key_event: str
    insurance_domains: List[str]
    risk_factors: List[str]
    business_implications: str
    timeframe: str
    confidence: str
    geographic_focus: Optional[str] = None
    regulatory_impact: Optional[str] = None
    article_title: str
    article_url: str
    source: str
    date: str
    created_at: Optional[datetime] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "key_event": "TNFD Framework Adoption Accelerating",
                "insurance_domains": ["property", "casualty"],
                "risk_factors": ["Regulatory compliance", "Disclosure requirements"],
                "business_implications": "Insurers need to update their reporting frameworks",
                "timeframe": "Short-term",
                "confidence": "High",
                "article_title": "TNFD Framework Adoption Accelerating",
                "article_url": "https://tnfd.global/news/article",
                "source": "TNFD",
                "date": "2024-04-18"
            }
        }
    }

class ReportModel(MongoBaseModel):
    executive_summary: str
    key_developments: str
    insurance_domain_impacts: str
    regional_insights: Optional[str] = None
    regulatory_landscape: Optional[str] = None
    business_implications: Optional[str] = None
    recommended_actions: str
    generated_date: str
    sources: List[str]
    article_count: int
    created_at: Optional[datetime] = None

class DashboardStats(BaseModel):
    total_articles: int
    total_reports: int
    source_distribution: Dict[str, int]
    domain_distribution: Dict[str, int]
    risk_factor_frequency: Dict[str, int]
    recent_report: Optional[ReportModel] = None

class AnalysisRequest(BaseModel):
    run_full_pipeline: bool = True
    news_sources: Optional[List[NewsSourceModel]] = None

class AnalysisResponse(BaseModel):
    task_id: str
    message: str

class DomainRiskScore(BaseModel):
    domain: str
    risk_score: float
    contributing_factors: List[str]
    trend: str  # "increasing", "decreasing", "stable"

# Add these new endpoint functions to app.py

class VectorSearchRequest(BaseModel):
    query: str
    limit: int = 10
    min_relevance: Optional[float] = None
    domains: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@app.post("/search/vector", response_model=List[ArticleModel])
async def vector_search_articles(request: VectorSearchRequest):
    """
    Search articles using vector similarity to a query
    """
    try:
        # Create or use FAISS index for articles
        index_path = "articles_index"
        if not os.path.exists(index_path):
            # Need to create index from existing articles
            logger.info("Creating article vector index")
            all_articles = []
            async for article in db.articles.find({}):
                all_articles.append(document_helper(article))
                
            if not all_articles:
                return []
                
            # Create FAISS index
            embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            docs = [
                Document(
                    page_content=article.get("content", ""),
                    metadata={
                        "id": str(article.get("id", "")),
                        "title": article.get("title", ""),
                        "url": article.get("url", ""),
                        "source": article.get("source", ""),
                        "date": article.get("date", ""),
                        "insurance_relevance": article.get("insurance_relevance", 0),
                        "climate_relevance": article.get("climate_relevance", 0),
                        "total_relevance": article.get("total_relevance", 0)
                    }
                ) for article in all_articles
            ]
            index = FAISS.from_documents(docs, embedding_model)
            index.save_local(index_path)
        
        # Load index
        embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        index = FAISS.load_local(index_path, embedding_model, allow_dangerous_deserialization=True)
        
        # Run the search
        results = index.similarity_search(request.query, k=request.limit)
        
        # Convert results to ArticleModel format
        articles = []
        for doc in results:
            # Get the article ID from metadata
            article_id = doc.metadata.get("id")
            if not article_id:
                continue
                
            # Get the full article from database
            article = await db.articles.find_one({"_id": ObjectId(article_id)})
            if not article:
                continue
                
            # Apply additional filters
            if request.min_relevance and article.get("total_relevance", 0) < request.min_relevance:
                continue
                
            # Filter by domain if specified
            if request.domains:
                # Need to check structured summaries for this article
                domain_match = False
                summary = await db.structured_summaries.find_one({"article_url": article.get("url")})
                if summary and summary.get("insurance_domains"):
                    if any(domain in summary.get("insurance_domains", []) for domain in request.domains):
                        domain_match = True
                
                if not domain_match:
                    continue
            
            # Filter by date range
            if request.start_date and article.get("date", "") < request.start_date:
                continue
                
            if request.end_date and article.get("date", "") > request.end_date:
                continue
                
            articles.append(document_helper(article))
        
        return articles
    except Exception as e:
        logger.error(f"Error in vector search: {str(e)}")
        return []

@app.post("/search/semantic", response_model=List[StructuredSummaryModel])
async def semantic_search_structured_summaries(request: VectorSearchRequest):
    """
    Search structured summaries using semantic similarity
    """
    try:
        # Create query for retrieval
        themes = [request.query]
        domains = request.domains if request.domains else None
        
        # Use the vector retrieval function
        summaries = await retrieve_relevant_summaries(
            domains=domains,
            themes=themes,
            top_k=request.limit
        )
        
        # Apply additional filters
        filtered_summaries = []
        
        for summary in summaries:
            # Filter by date
            if request.start_date and summary.get("date", "") < request.start_date:
                continue
                
            if request.end_date and summary.get("date", "") > request.end_date:
                continue
                
            # Format the summary
            formatted_summary = format_structured_summary(summary)
            filtered_summaries.append(document_helper(formatted_summary))
        
        return filtered_summaries
    except Exception as e:
        logger.error(f"Error in semantic search: {str(e)}")
        return []

@app.get("/regulatory/trends", response_model=List[RegulatoryTrend])
async def get_regulatory_trends(months: int = 6):
    """
    Get trends of regulatory mentions in articles by insurance domain over time.
    
    Args:
        months: Number of months to include in the trend analysis
    
    Returns:
        List of monthly data points with regulatory mentions by insurance domain
    """
    try:
        # First, check if we have data in the regulatory_trends collection
        count = await db.regulatory_trends.count_documents({})
        
        if count > 0:
            # If we have data in the collection, use it
            trends = []
            # Get data for the requested number of months, sorted by month
            cursor = db.regulatory_trends.find().sort("month", -1).limit(months)
            
            async for doc in cursor:
                trends.append({
                    "month": doc["month"],
                    "property": doc["property"],
                    "casualty": doc["casualty"],
                    "life": doc["life"],
                    "health": doc["health"],
                    "reinsurance": doc["reinsurance"]
                })
                
            # Sort by month (ascending)
            trends.sort(key=lambda x: x["month"])
            
            return trends
        
        # If no data in collection, generate fallback
        # Generate realistic trend data
        current_month = datetime.now()
        trends = []
        
        for i in range(months):
            month_date = current_month - timedelta(days=30 * (months - i - 1))
            month_str = month_date.strftime("%Y-%m")
            
            # Generate realistic trend data
            trends.append({
                "month": month_str,
                "property": 23 + i * 2,  # Increasing trend
                "casualty": 18 + i * 2,
                "life": 7 + i,
                "health": 10 + i,
                "reinsurance": 20 + i * 2
            })
        
        return trends
    except Exception as e:
        logger.error(f"Error fetching regulatory trends: {str(e)}")
        # Fall back to completely generated data
        return generate_fallback_regulatory_trends(months)

# Update startup event to schedule indexing
@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.articles.create_index("url", unique=True)
    await db.articles.create_index("total_relevance")
    await db.articles.create_index("source")
    await db.articles.create_index("date")
    await db.structured_summaries.create_index("insurance_domains")
    await db.structured_summaries.create_index("created_at")
    await db.reports.create_index("created_at")
    await db.regulatory_frameworks.create_index("name", unique=True)
    await db.regulatory_frameworks.create_index("region")
    await db.regulatory_frameworks.create_index("relevance_score")
    await db.esg_impacts.create_index([("category", 1), ("name", 1)], unique=True)
    await db.esg_impacts.create_index("score")
    await db.regulatory_trends.create_index("month", unique=True)
    
    # Schedule vector index maintenance
    async def update_vector_indexes():
        logger.info("Running scheduled vector index update")
        
        try:
            # Get recent structured summaries
            last_week = datetime.now() - timedelta(days=7)
            recent_summaries = []
            async for summary in db.structured_summaries.find({"created_at": {"$gte": last_week}}):
                recent_summaries.append(document_helper(summary))
                
            if recent_summaries:
                await index_structured_summaries(recent_summaries, update_index=True)
                logger.info(f"Updated summaries vector index with {len(recent_summaries)} recent summaries")
                
            # Update articles index if needed (less frequently)
            if datetime.now().weekday() == 0:  # Only on Mondays
                # Get recent articles
                recent_articles = []
                async for article in db.articles.find({"created_at": {"$gte": last_week}}):
                    recent_articles.append(document_helper(article))
                    
                if recent_articles:
                    await asyncio.to_thread(update_articles_index, recent_articles)
                    logger.info(f"Updated articles vector index with {len(recent_articles)} recent articles")
        except Exception as e:
            logger.error(f"Error updating vector indexes: {str(e)}")
    
    # Start the scheduler
    scheduler.add_job(scheduled_daily_analysis, "cron", hour=1, minute=0)  # Run daily at 1:00 AM
    scheduler.add_job(update_vector_indexes, "cron", hour=2, minute=0)  # Run daily at 2:00 AM
    scheduler.start()
    logger.info("Scheduler started")

# Helper function to update articles index
def update_articles_index(articles: List[Dict[str, Any]], update_index: bool = True) -> str:
    """
    Update the FAISS index for articles
    """
    embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    index_path = "articles_index"
    
    docs = [
        Document(
            page_content=article.get("content", ""),
            metadata={
                "id": str(article.get("id", "")),
                "title": article.get("title", ""),
                "url": article.get("url", ""),
                "source": article.get("source", ""),
                "date": article.get("date", ""),
                "insurance_relevance": article.get("insurance_relevance", 0),
                "climate_relevance": article.get("climate_relevance", 0),
                "total_relevance": article.get("total_relevance", 0)
            }
        ) for article in articles
    ]
    
    if os.path.exists(index_path) and update_index:
        try:
            existing_index = FAISS.load_local(index_path, embedding_model, allow_dangerous_deserialization=True)
            existing_index.add_documents(docs)
            existing_index.save_local(index_path)
            return index_path
        except Exception as e:
            logger.error(f"Error updating articles index: {str(e)}")
    
    # Create new index if update fails or not requested
    index = FAISS.from_documents(docs, embedding_model)
    index.save_local(index_path)
    return index_path

async def safe_mongodb_insert(collection, document, max_retries=3):
    """
    Safely insert a document into MongoDB with retries and size checks
    
    Args:
        collection: MongoDB collection
        document: Document to insert
        max_retries: Maximum number of retry attempts
        
    Returns:
        Inserted document ID or None if failed
    """
    logger.info(f"Attempting to insert document into {collection.name}")
    
    # Check document size
    doc_size = len(str(document))
    logger.info(f"Document size: {doc_size} characters")
    
    # MongoDB has a 16MB document size limit
    if doc_size > 15 * 1024 * 1024:  # 15MB to be safe
        logger.error(f"Document too large for MongoDB: {doc_size} bytes (16MB limit)")
        
        # Try truncating large string fields
        try:
            truncated = document.copy()
            for key, value in truncated.items():
                if isinstance(value, str) and len(value) > 1000000:  # 1MB
                    logger.warning(f"Truncating large field: {key} from {len(value)} chars")
                    truncated[key] = value[:1000000] + "... [TRUNCATED]"
            
            truncated["_truncated"] = True
            document = truncated
            logger.info(f"Truncated document to {len(str(document))} characters")
        except Exception as e:
            logger.error(f"Error truncating document: {str(e)}")
            return None
    
    # Attempt insertion with retries
    for attempt in range(max_retries):
        try:
            result = await collection.insert_one(document)
            logger.info(f"Successfully inserted document with ID: {result.inserted_id}")
            return result.inserted_id
        except Exception as e:
            error_msg = str(e).lower()
            
            if "duplicate key" in error_msg:
                logger.warning(f"Duplicate key error: {str(e)}")
                
                # For duplicates, try to update instead
                try:
                    # Add updated timestamp
                    document["updated_at"] = datetime.now()
                    
                    # Identify potential key fields for matching
                    match_criteria = {}
                    for key in ["url", "article_url", "title", "generated_date"]:
                        if key in document and document[key]:
                            match_criteria[key] = document[key]
                    
                    if not match_criteria:
                        # Fallback to using all fields except _id
                        if "_id" in document:
                            del document["_id"]
                        
                        logger.warning("No match criteria found, update not possible")
                        return None
                    
                    logger.info(f"Attempting update with criteria: {match_criteria}")
                    update_result = await collection.update_one(
                        match_criteria,
                        {"$set": document}
                    )
                    
                    if update_result.modified_count > 0:
                        logger.info(f"Updated existing document instead")
                        return "updated"
                    else:
                        logger.warning("Document not updated (no matching records)")
                        return None
                except Exception as update_error:
                    logger.error(f"Error updating instead: {str(update_error)}")
                    return None
            
            elif "document too large" in error_msg:
                if attempt < max_retries - 1:
                    # Try more aggressive truncation for next attempt
                    logger.warning(f"Document too large, attempt {attempt+1}/{max_retries}, truncating further")
                    try:
                        for key, value in document.items():
                            if isinstance(value, str) and len(value) > 100000:
                                # More aggressive truncation with each retry
                                max_len = 100000 // (attempt + 2)
                                document[key] = value[:max_len] + f"... [TRUNCATED {len(value) - max_len} chars]"
                        
                        document["_heavily_truncated"] = True
                    except Exception as truncate_error:
                        logger.error(f"Error truncating document: {str(truncate_error)}")
                        return None
                else:
                    logger.error("Document still too large after truncation attempts")
                    return None
            else:
                # For other errors
                if attempt < max_retries - 1:
                    logger.warning(f"MongoDB error: {str(e)}, retrying {attempt+1}/{max_retries}")
                    await asyncio.sleep(1)  # Wait before retrying
                else:
                    logger.error(f"MongoDB insertion failed after {max_retries} attempts: {str(e)}")
                    return None
    
    return None

def normalize_url(url: str) -> str:
    """Normalize URLs to avoid duplicates with minor differences"""
    try:
        from urllib.parse import urlparse, parse_qs, urlencode
        
        # Parse the URL
        parsed = urlparse(url)
        
        # Remove common tracking parameters
        if parsed.query:
            params = parse_qs(parsed.query)
            # Remove tracking params like utm_source, etc.
            for param in list(params.keys()):
                if param.startswith('utm_') or param in ['source', 'ref', 'campaign']:
                    del params[param]
            
            # Rebuild query string
            query = urlencode(params, doseq=True) if params else ''
        else:
            query = ''
        
        # Normalize the path (remove trailing slashes)
        path = parsed.path.rstrip('/')
        
        # Rebuild the URL without tracking parameters
        normalized = f"{parsed.scheme}://{parsed.netloc}{path}"
        if query:
            normalized += f"?{query}"
        
        return normalized.lower()  # Convert to lowercase for case-insensitive comparison
    except Exception as e:
        logger.error(f"Error normalizing URL {url}: {str(e)}")
        return url.lower()  # Return original URL in lowercase as fallback

def hash_content(content: str) -> str:
    """Create a hash of the article content to detect duplicates"""
    import hashlib
    # Clean content (remove whitespace, etc.)
    cleaned_content = ' '.join(content.split())
    # Hash the content
    return hashlib.md5(cleaned_content.encode('utf-8')).hexdigest()

# Helper function to convert MongoDB documents to Pydantic models
def document_helper(document) -> dict:
    if document and "_id" in document:
        document["id"] = str(document.pop("_id"))
    return document

# Helper function to ensure report fields are strings
# Add logging to this function
def format_report_data(report_data):
    """
    Ensure all report fields are properly formatted as strings, keeping 'sources' as a list of strings.
    """
    logger.info("Formatting report data")

    if not report_data:
        logger.warning("No report data to format")
        return None

    # Copy to avoid mutating the original
    report = dict(report_data)

    # Handle sources: ensure it's a list of strings
    if "sources" in report:
        if isinstance(report["sources"], list):
            report["sources"] = [str(s) for s in report["sources"]]
        elif isinstance(report["sources"], str):
            try:
                parsed = ast.literal_eval(report["sources"])
                if isinstance(parsed, list):
                    report["sources"] = [str(s) for s in parsed]
                else:
                    report["sources"] = [str(parsed)]
            except Exception:
                report["sources"] = [report["sources"]]
    else:
        report["sources"] = []

    # Convert certain list fields to newline-separated strings
    for field in ["key_developments", "regional_insights", "regulatory_landscape", "recommended_actions"]:
        if field in report and isinstance(report[field], list):
            report[field] = "\n\n".join(str(item) for item in report[field])

    # Convert dict fields to formatted strings
    for field in ["insurance_domain_impacts", "business_implications"]:
        if field in report and isinstance(report[field], dict):
            formatted = ""
            for k, v in report[field].items():
                formatted += f"**{k}:**\n{v}\n\n"
            report[field] = formatted.strip()

    # Ensure essential fields exist and are strings
    essential = [
        "executive_summary", "key_developments", "insurance_domain_impacts",
        "recommended_actions", "generated_date"
    ]
    for field in essential:
        if field not in report or report[field] is None:
            report[field] = f"No {field.replace('_', ' ')} available"
        elif not isinstance(report[field], str):
            report[field] = str(report[field])

    # Ensure article_count is an integer
    if not isinstance(report.get("article_count"), int):
        try:
            report["article_count"] = int(report.get("article_count", 0))
        except:
            report["article_count"] = 0

    # Convert datetime fields to strings
    for key, value in list(report.items()):
        if isinstance(value, datetime):
            report[key] = value.strftime("%Y-%m-%d %H:%M:%S")

    return report


# Background tasks
# Modified run_analysis_pipeline function with upsert logic

# Add these functions to app.py

async def index_structured_summaries(structured_info: List[Dict[str, Any]], update_index: bool = False) -> str:
    """Create or update a FAISS index for structured summaries."""
    logger.info(f"Indexing {len(structured_info)} structured summaries into FAISS")
    
    # Check if we have valid data to index
    if not structured_info:
        logger.warning("No structured summaries provided for indexing")
        return ""
    
    # Prepare documents for indexing
    embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    docs = []
    
    for info in structured_info:
        # Ensure we have some content to embed
        if not info.get('key_event') and not info.get('business_implications'):
            logger.warning(f"Skipping summary with insufficient content: {info.get('id', 'unknown')}")
            continue
            
        # Create a combined text representation of the summary
        combined_text = f"""
        Key Event: {info.get('key_event', '')}
        Insurance Domains: {', '.join(info.get('insurance_domains', []))}
        Risk Factors: {', '.join(info.get('risk_factors', []))}
        Business Implications: {info.get('business_implications', '')}
        Timeframe: {info.get('timeframe', '')}
        Confidence: {info.get('confidence', '')}
        Geographic Focus: {info.get('geographic_focus', '')}
        Regulatory Impact: {info.get('regulatory_impact', '')}
        """
        
        # Create Document object with proper ID handling
        doc = Document(
            page_content=combined_text.strip(),  # Strip whitespace
            metadata={
                "id": str(info.get("id", "")),
                "article_title": info.get("article_title", ""),
                "article_url": info.get("article_url", ""),
                "source": info.get("source", ""),
                "date": info.get("date", ""),
                "key_event": info.get("key_event", ""),
                "insurance_domains": info.get("insurance_domains", []),
                "risk_factors": info.get("risk_factors", []),
                "timeframe": info.get("timeframe", ""),
                "confidence": info.get("confidence", "")
            }
        )
        docs.append(doc)
    
    if not docs:
        logger.warning("No valid documents created for indexing")
        return ""
        
    # Create or update FAISS index
    index_path = "summaries_index"
    
    try:
        if os.path.exists(index_path) and update_index:
            try:
                # Load existing index and add new documents
                logger.info(f"Loading existing index from {index_path}")
                existing_index = FAISS.load_local(index_path, embedding_model, allow_dangerous_deserialization=True)
                existing_index.add_documents(docs)
                existing_index.save_local(index_path)
                logger.info(f"Updated existing FAISS index with {len(docs)} new documents")
            except Exception as e:
                logger.error(f"Error updating existing index: {str(e)}. Creating new index.")
                index = FAISS.from_documents(docs, embedding_model)
                index.save_local(index_path)
                logger.info(f"Created new FAISS index with {len(docs)} documents")
        else:
            # Create new index
            logger.info(f"Creating new FAISS index with {len(docs)} documents")
            index = FAISS.from_documents(docs, embedding_model)
            index.save_local(index_path)
            logger.info(f"Created new FAISS index with {len(docs)} documents")
    except Exception as e:
        logger.error(f"Failed to create or update index: {str(e)}")
        return ""
    
    return index_path

async def retrieve_relevant_summaries(
    domains: List[str] = None, 
    themes: List[str] = None, 
    top_k: int = 50  # Reduced from 100 to 50
) -> List[Dict[str, Any]]:
    """Retrieve the most relevant structured summaries using vector search."""
    logger.info(f"Retrieving relevant summaries for domains: {domains}, themes: {themes}")
    
    # Check if index exists and load it
    index_path = "summaries_index"
    if not os.path.exists(index_path):
        logger.warning("FAISS index not found. Creating from all available summaries.")
        # Get all summaries from database
        all_summaries = []
        async for summary in db.structured_summaries.find({}):
            all_summaries.append(document_helper(summary))
        
        if not all_summaries:
            logger.warning("No summaries found in database")
            return []
        
        # Create index from all summaries
        await index_structured_summaries(all_summaries)
    
    # Load the index
    embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    try:
        logger.info(f"Loading FAISS index from {index_path}")
        index = FAISS.load_local(index_path, embedding_model, allow_dangerous_deserialization=True)
    except Exception as e:
        logger.error(f"Error loading FAISS index: {str(e)}")
        return []
    
    # Build search queries based on domains and themes
    queries = []
    
    # Add domain-specific queries
    if domains:
        for domain in domains:
            queries.append(f"climate risk affecting {domain} insurance")
    
    # Add theme-specific queries
    if themes:
        for theme in themes:
            queries.append(f"climate risk related to {theme}")
    
    # Add general queries if no specific domains or themes provided
    if not queries:
        queries = [
            "important climate risk developments for insurance",
            "significant regulatory changes affecting insurance",
            "emerging physical climate risks for insurers",
            "liability risks for insurance companies related to climate change",
            "transition risks affecting insurance business models"
        ]
    
    # Context window management: Limit results per query
    # The goal is to get approximately 2-3 results per query to manage context window size
    results_per_query = 3
    if len(queries) > 10:
        # If we have many queries, reduce results per query
        results_per_query = 2
    elif len(queries) <= 3:
        # If we have few queries, allow more results per query
        results_per_query = min(5, top_k // len(queries))
    
    logger.info(f"Using {len(queries)} queries with {results_per_query} results per query")
    
    # Run searches and collect results with more controlled limits
    all_results = []
    for query in queries:
        try:
            logger.info(f"Running vector search with query: {query}")
            results = index.similarity_search(query, k=results_per_query)
            logger.info(f"Query '{query}' returned {len(results)} results")
            all_results.extend(results)
        except Exception as e:
            logger.error(f"Error in similarity search for query '{query}': {str(e)}")
    
    # Deduplicate results - THE CRITICAL FIX IS HERE
    seen_urls = set()  # Track by URL instead of ID
    unique_results = []
    
    for doc in all_results:
        # Get the article URL from metadata (more reliable than ID)
        article_url = doc.metadata.get("article_url", "")
        
        # Skip documents with no article URL
        if not article_url:
            continue
            
        if article_url not in seen_urls:
            seen_urls.add(article_url)
            
            # Convert Document back to structured summary format
            try:
                # Fetch by article URL instead of ID
                db_summary = await db.structured_summaries.find_one({"article_url": article_url})
                
                if db_summary:
                    # Use the database version with full data
                    unique_results.append(document_helper(db_summary))
                else:
                    # Fallback to constructing from metadata if not in database
                    summary = {
                        "id": doc.metadata.get("id", ""),
                        "key_event": doc.metadata.get("key_event", ""),
                        "insurance_domains": doc.metadata.get("insurance_domains", []),
                        "risk_factors": doc.metadata.get("risk_factors", []),
                        "business_implications": doc.metadata.get("business_implications", ""),
                        "timeframe": doc.metadata.get("timeframe", ""),
                        "confidence": doc.metadata.get("confidence", ""),
                        "geographic_focus": doc.metadata.get("geographic_focus", ""),
                        "regulatory_impact": doc.metadata.get("regulatory_impact", ""),
                        "article_title": doc.metadata.get("article_title", ""),
                        "article_url": article_url,
                        "source": doc.metadata.get("source", ""),
                        "date": doc.metadata.get("date", "")
                    }
                    unique_results.append(summary)
            except Exception as e:
                logger.error(f"Error processing document with article URL {article_url}: {str(e)}")
                continue
    
    # If we have too many results after deduplication, limit to top_k
    if len(unique_results) > top_k:
        logger.info(f"Limiting {len(unique_results)} results to top {top_k}")
        
        # Sort by confidence and relevance to make the best use of context window
        sorted_results = sorted(
            unique_results,
            key=lambda x: (
                {"High": 3, "Medium": 2, "Low": 1}.get(x.get("confidence", "Unknown"), 0),
                # Use created_at as secondary sort criteria, most recent first
                x.get("created_at", datetime.min)
            ),
            reverse=True
        )
        
        unique_results = sorted_results[:top_k]
    
    MAX_REPORT_TOKENS = 6000  # Conservative limit for report generation
    total_chars = 0
    summaries_with_tokens = []

    for summary in unique_results:
        # Count key fields that contribute most to token count
        summary_chars = len(str(summary.get("key_event", ""))) + \
                    len(str(summary.get("business_implications", ""))) + \
                    sum(len(str(factor)) for factor in summary.get("risk_factors", [])) + \
                    len(str(summary.get("article_title", ""))) + \
                    len(str(summary.get("regulatory_impact", ""))) + \
                    200  # Buffer for other fields
        
        summaries_with_tokens.append((summary, summary_chars / 4))
        total_chars += summary_chars

    approx_tokens = total_chars / 4
    logger.info(f"Estimated tokens for all summaries: {approx_tokens:.0f}/{MAX_REPORT_TOKENS}")

    # If token count is too high, reduce the number of summaries
    if approx_tokens > MAX_REPORT_TOKENS:
        logger.warning(f"Token count too high ({approx_tokens:.0f}). Reducing summaries.")
        # Sort by confidence and relevance
        summaries_with_tokens.sort(key=lambda x: (
            {"High": 3, "Medium": 2, "Low": 1}.get(x[0].get("confidence", "Unknown"), 0),
            # Use created_at as secondary sort criteria
            x[0].get("created_at", datetime.min)
        ), reverse=True)
        
        # Add summaries until we reach token limit
        filtered_summaries = []
        current_tokens = 0
        for summary, token_count in summaries_with_tokens:
            if current_tokens + token_count <= MAX_REPORT_TOKENS:
                filtered_summaries.append(summary)
                current_tokens += token_count
            else:
                break
        
        logger.info(f"Reduced summaries from {len(unique_results)} to {len(filtered_summaries)}")
        return filtered_summaries
    
    if not unique_results:
        logger.warning("No unique results from vector search. Falling back to database query.")
        # Fall back to database query with stricter limits for context window
        query = {}
        if domains:
            query["insurance_domains"] = {"$in": domains}
        
        fallback_results = []
        cursor = db.structured_summaries.find(query).sort([
            ("confidence", -1), 
            ("created_at", -1)
        ]).limit(min(top_k, 25))  # Additional limit for context window
        
        async for summary in cursor:
            fallback_results.append(document_helper(summary))
            
        logger.info(f"Fallback query returned {len(fallback_results)} summaries")
        return fallback_results
        
    # Limit to top_k results
    logger.info(f"Vector search returned {len(unique_results)} unique summaries")

# If token count is OK, return original results
    return unique_results
    
    # If we still have no unique results, fall back to database query
    
 

# Add a fallback function to get results directly from the database
async def fallback_database_query(domains: List[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Fallback method to get summaries directly from the database."""
    logger.info(f"Using fallback database query for domains: {domains}")
    
    query = {}
    if domains:
        query["insurance_domains"] = {"$in": domains}
    
    # Sort by confidence and recency
    cursor = db.structured_summaries.find(query).sort([
        ("confidence", -1), 
        ("created_at", -1)
    ]).limit(limit)
    
    summaries = []
    async for summary in cursor:
        summaries.append(document_helper(summary))
        
    logger.info(f"Fallback query returned {len(summaries)} summaries")
    return summaries

# Modified run_analysis_pipeline function with vector DB integration
# Replace the existing function with this version

@app.post("/admin/rebuild-indices", status_code=status.HTTP_202_ACCEPTED)
async def rebuild_vector_indices(background_tasks: BackgroundTasks):
    """Rebuild all vector indices from scratch."""
    
    async def rebuild_indices_task():
        logger.info("Starting complete rebuild of vector indices")
        
        try:
            # Rebuild summaries index
            all_summaries = []
            async for summary in db.structured_summaries.find({}):
                all_summaries.append(document_helper(summary))
                
            if all_summaries:
                # Force creation of new index
                if os.path.exists("summaries_index"):
                    logger.info("Removing existing summaries index")
                    import shutil
                    shutil.rmtree("summaries_index")
                
                await index_structured_summaries(all_summaries)
                logger.info(f"Rebuilt summaries index with {len(all_summaries)} summaries")
            else:
                logger.warning("No summaries found for indexing")
                
            # Rebuild articles index
            all_articles = []
            async for article in db.articles.find({}):
                all_articles.append(document_helper(article))
                
            if all_articles:
                # Force creation of new index
                if os.path.exists("articles_index"):
                    logger.info("Removing existing articles index")
                    import shutil
                    shutil.rmtree("articles_index")
                
                await asyncio.to_thread(update_articles_index, all_articles, update_index=False)
                logger.info(f"Rebuilt articles index with {len(all_articles)} articles")
            else:
                logger.warning("No articles found for indexing")
                
            logger.info("Vector indices rebuild completed successfully")
            
        except Exception as e:
            logger.error(f"Error rebuilding vector indices: {str(e)}")
    
    # Run the rebuild task in background
    background_tasks.add_task(rebuild_indices_task)
    
    return {
        "message": "Vector indices rebuild started",
        "status": "accepted"
    }

async def run_analysis_pipeline(task_id: str, custom_sources: List[Dict[str, Any]] = None):
    """Run the full analysis pipeline as a background task with efficient caching and vector DB support"""
    try:
        logger.info(f"Starting analysis pipeline for task {task_id}")
        
        # Step 1: Scrape news sources
        sources_to_use = custom_sources if custom_sources else NEWS_SOURCES
        
        # Check for existing articles to avoid duplicate scraping
        # Check for existing articles to avoid duplicate scraping
        existing_articles = {}
        existing_content_hashes = set()

        # Get existing URLs and content hashes
        async for article in db.articles.find({}, {"url": 1, "content": 1, "_id": 0}):
            if "url" in article:
                # Normalize the URL to handle minor variations
                norm_url = normalize_url(article["url"])
                existing_articles[norm_url] = True
                
                # If content is available, hash it to detect duplicate content
                if "content" in article and article["content"]:
                    content_hash = hash_content(article["content"])
                    existing_content_hashes.add(content_hash)
                    
        logger.info(f"Found {len(existing_articles)} existing article URLs and {len(existing_content_hashes)} content hashes")

        # First pass - quick check of URLs that might need scraping
        articles_to_scrape = []
        for source in sources_to_use:
            source_name = source.get("name")
            source_url = source.get("url")
            source_type = source.get("type", "news")
            
            logger.info(f"Quick checking source: {source_name} ({source_url})")

            try:
                # Get basic list of URLs without full content scraping
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                response = requests.get(source_url, headers=headers, timeout=10)
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Extract all links with better filtering
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    
                    # Skip empty or JavaScript links
                    if not href or href.startswith('javascript:') or href == '#':
                        continue
                        
                    # Basic filtering for article links with improved criteria
                    if (('news' in href or 'article' in href or 'press' in href or 'blog' in href or 
                        'report' in href or 'publication' in href or 'release' in href) and 
                        not href.endswith(('.pdf', '.jpg', '.png', '.zip', '.doc', '.docx', '.csv'))):
                        
                        if not href.startswith('http'):
                            # Handle relative URLs
                            base_url = '/'.join(source_url.split('/')[:3])
                            href = base_url + href if href.startswith('/') else base_url + '/' + href
                        
                        # Normalize the URL
                        norm_href = normalize_url(href)
                        
                        # Check if we already have this article
                        if norm_href not in existing_articles:
                            articles_to_scrape.append({
                                "url": href,
                                "source": source_name,
                                "source_type": source_type
                            })
                            
                            # Add to existing articles to prevent duplicates within this scraping run
                            existing_articles[norm_href] = True
                            
            except Exception as e:
                logger.error(f"Error during quick check of {source_name}: {str(e)}")
        
        logger.info(f"Found {len(articles_to_scrape)} new articles to scrape")

        # Now fully scrape only the new articles
        newly_scraped_articles = []
        if articles_to_scrape:
            # Use your existing scraping function but only for new URLs
            newly_scraped_articles = await asyncio.to_thread(
                scrape_news_sources.invoke, 
                {"articles": articles_to_scrape}
            )
            
            logger.info(f"Scraped {len(newly_scraped_articles)} new articles")
            
            # Store new articles in MongoDB with upsert logic
            # Store new articles in MongoDB with upsert logic and content hash check
            for article in newly_scraped_articles:
                # Check for duplicate content
                if "content" in article and article["content"]:
                    content_hash = hash_content(article["content"])
                    if content_hash in existing_content_hashes:
                        logger.info(f"Skipping article with duplicate content: {article.get('title', 'unknown')}")
                        continue
                    existing_content_hashes.add(content_hash)
                
                article["created_at"] = datetime.now()
                # Add the content hash to the article
                if "content" in article and article["content"]:
                    article["content_hash"] = content_hash
                    
                try:
                    # Use upsert to avoid duplicate key errors
                    await db.articles.update_one(
                        {"url": article["url"]},
                        {"$set": article},
                        upsert=True
                    )
                except Exception as e:
                    logger.error(f"Error storing article {article.get('url', 'unknown')}: {str(e)}")
        
        # Step 2: Get all relevant articles for analysis (both new and existing)
        # We'll analyze everything with a recent timestamp or high relevance
        
        # Query for relevant articles (added in the last 30 days or with high relevance)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        query = {
            "$or": [
                {"created_at": {"$gte": thirty_days_ago}},
                {"total_relevance": {"$gte": 8}}  # High relevance articles are always included
            ]
        }
        
        all_articles = []
        async for article in db.articles.find(query):
            all_articles.append(document_helper(article))
            
        logger.info(f"Retrieved {len(all_articles)} total articles for analysis")
        
        if not all_articles:
            logger.warning("No articles found for analysis")
            raise ValueError("No articles available for analysis")
            
        # Step 3: Analyze relevance for all articles
        relevant_articles = await asyncio.to_thread(analyze_insurance_relevance.invoke, {"articles": all_articles})
        logger.info(f"Found {len(relevant_articles)} relevant articles")
        
        # Update articles with relevance scores
        for article in relevant_articles:
            try:
                query = {"url": article["url"]}
                update = {
                    "$set": {
                        "insurance_relevance": article.get("insurance_relevance", 0),
                        "climate_relevance": article.get("climate_relevance", 0),
                        "total_relevance": article.get("total_relevance", 0),
                        "updated_at": datetime.now()
                    }
                }
                await db.articles.update_one(query, update)
            except Exception as e:
                logger.error(f"Error updating relevance for article {article.get('url', 'unknown')}: {str(e)}")
        
        # Step 4: Extract structured information
        # First, check which articles already have structured information
        existing_summaries = {}

        async for summary in db.structured_summaries.find({}, {"article_url": 1, "_id": 0}):
            existing_summaries[summary.get("article_url", "")] = True
            
        logger.info(f"Found {len(existing_summaries)} existing structured summaries")
        
        # Filter articles that need extraction
        articles_needing_extraction = [
            article for article in relevant_articles 
            if article.get("url") not in existing_summaries
        ]
        
        logger.info(f"{len(articles_needing_extraction)} articles need structured information extraction")

        newly_extracted_info = []
        
        if articles_needing_extraction:
            newly_extracted_info = await asyncio.to_thread(
                extract_structured_info.invoke, 
                {"articles": articles_needing_extraction}
            )
            
            logger.info(f"Extracted structured information from {len(newly_extracted_info)} new articles")
            
            # Store newly extracted structured summaries
            for info in newly_extracted_info:
                try:
                    info["created_at"] = datetime.now()
                    await db.structured_summaries.update_one(
                        {"article_url": info.get("article_url")},
                        {"$set": info},
                        upsert=True
                    )
                except Exception as e:
                    logger.error(f"Error storing structured info for {info.get('article_url', 'unknown')}: {str(e)}")
        all_structured_info = []
        async for info in db.structured_summaries.find({}):
            all_structured_info.append(document_helper(info))
            
        logger.info(f"Retrieved {len(all_structured_info)} total structured summaries for report generation")
        
        # Index new summaries in vector DB
        if newly_extracted_info:
            logger.info(f"Indexing {len(newly_extracted_info)} new structured summaries")
            await index_structured_summaries(newly_extracted_info, update_index=True)
        
        # Step 5: Generate reports using vector search to get relevant summaries
        # Determine important insurance domains and themes for this report
        domains = ["property", "casualty", "life", "health", "reinsurance"]
        
        # Extract important themes from recent articles
        important_themes = []
        recent_articles_query = {"created_at": {"$gte": datetime.now() - timedelta(days=14)}}
        
        # Find top risk factors from recent structured summaries
        pipeline = [
            {"$match": {"created_at": {"$gte": datetime.now() - timedelta(days=14)}}},
            {"$unwind": "$risk_factors"},
            {"$group": {"_id": "$risk_factors", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        
        async for doc in db.structured_summaries.aggregate(pipeline):
            important_themes.append(doc["_id"])
        
        # If we don't have enough themes, add some defaults
        if len(important_themes) < 3:
            default_themes = ["regulatory changes", "extreme weather", "liability risks", 
                              "transition risks", "disclosure requirements"]
            important_themes.extend(default_themes)
            important_themes = list(set(important_themes))[:5]  # Keep unique, limit to 5
        
        # Retrieve relevant summaries using vector search
        relevant_summaries = await retrieve_relevant_summaries(
            domains=domains,
            themes=important_themes,
            top_k=50  # Reduced from 100 to 50 for context window management
        )
        
        logger.info(f"Retrieved {len(relevant_summaries)} relevant summaries using vector search")

        MAX_TOKENS = 6000  # Conservative limit for LLM context
        total_chars = 0
        for summary in relevant_summaries:
            # Count key fields that contribute most to token count
            total_chars += len(str(summary.get("key_event", "")))
            total_chars += len(str(summary.get("business_implications", "")))
            total_chars += sum(len(str(factor)) for factor in summary.get("risk_factors", []))
            total_chars += len(str(summary.get("article_title", "")))
            total_chars += len(str(summary.get("regulatory_impact", "")))
            total_chars += 200  # Buffer for other fields

        approx_tokens = total_chars / 4  # Rough approximation
        logger.info(f"Estimated tokens for report generation: {approx_tokens:.0f}/{MAX_TOKENS}")

        # If token count is too high, reduce the number of summaries
        if approx_tokens > MAX_TOKENS:
            logger.warning(f"Token count too high ({approx_tokens:.0f}). Reducing summaries.")
            # Sort by confidence and recency to keep most important summaries
            relevant_summaries.sort(key=lambda x: (
                {"High": 3, "Medium": 2, "Low": 1}.get(x.get("confidence", "Unknown"), 0),
                x.get("created_at", datetime.min)
            ), reverse=True)
            
            # Add summaries until we reach token limit
        reduced_summaries = []
        current_tokens = 0
        for summary in relevant_summaries:
            summary_chars = len(str(summary.get("key_event", ""))) + \
                            len(str(summary.get("business_implications", ""))) + \
                            sum(len(str(factor)) for factor in summary.get("risk_factors", [])) + \
                            len(str(summary.get("article_title", ""))) + \
                            len(str(summary.get("regulatory_impact", ""))) + \
                            200  # Buffer
                
            summary_tokens = summary_chars / 4
                
            if current_tokens + summary_tokens <= MAX_TOKENS:
                    reduced_summaries.append(summary)
                    current_tokens += summary_tokens
            else:
                    break
    
        logger.info(f"Reduced summaries from {len(relevant_summaries)} to {len(reduced_summaries)}")
        relevant_summaries = reduced_summaries

        # If vector search fails or returns too few results, fall back to database query
        if len(relevant_summaries) < 1:
            logger.warning("Vector search returned insufficient results, falling back to database query")
            fallback_summaries = []
            # Get most recent and highest confidence summaries
            cursor = db.structured_summaries.find().sort([
                ("confidence", -1), 
                ("created_at", -1)
            ]).limit(100)
            
            async for summary in cursor:
                fallback_summaries.append(document_helper(summary))
                
            # Combine with vector results (if any) and deduplicate
            seen_ids = {str(summary.get("id", "")) for summary in relevant_summaries}
            for summary in fallback_summaries:
                if str(summary.get("id", "")) not in seen_ids:
                    relevant_summaries.append(summary)
                    seen_ids.add(str(summary.get("id", "")))
                    
            logger.info(f"Added {len(fallback_summaries)} fallback summaries, total: {len(relevant_summaries)}")
        
   
        try:
            logger.info(f"Starting report generation with {len(relevant_summaries)} summaries")
            if relevant_summaries:
                logger.debug(f"First summary: {relevant_summaries[0]}")
            
            # Enhanced error handling around the LLM call
            try:
                report_data = await asyncio.to_thread(
                    generate_summary_reports.invoke, 
                    {"structured_info": relevant_summaries, "llm": llm}
                )
                
                # Add immediate verification of response
                if not report_data:
                    logger.error("Report generation returned empty data")
                    raise ValueError("Empty report data returned from LLM")
                    
                # Log keys for debugging
                logger.info(f"Report generation completed. Keys: {list(report_data.keys()) if report_data else 'No data'}")
                
                # Verify required keys exist
                required_keys = ["Executive Summary", "Key Climate Risk Developments", "Insurance Domain Impacts", "Recommended Actions"]
                missing_keys = [key for key in required_keys if key not in report_data]
                
                if missing_keys:
                    logger.error(f"Report data missing required keys: {missing_keys}")
                    # Add default values for missing keys
                    for key in missing_keys:
                        report_data[key] = f"No {key} available"
            
            except Exception as e:
                logger.error(f"Error in LLM report generation: {str(e)}", exc_info=True)
                # Create a detailed fallback report
                report_data = {
                    "Executive Summary": "Report generation encountered an error. Using fallback report data.",
                    "Key Climate Risk Developments": "1. Climate regulatory frameworks expanding globally\n2. Extreme weather events increasing in frequency and severity\n3. Rising sea levels threatening coastal properties\n4. Legal precedents for climate liability emerging",
                    "Insurance Domain Impacts": "Property Insurance: Increased risk from floods, wildfires, and storms.\n\nCasualty Insurance: Growing exposure to climate liability claims.\n\nLife/Health Insurance: Changing mortality and disease patterns.\n\nReinsurance: Capacity constraints in high-risk regions.",
                    "Business Implications": "Insurance companies need to update risk models, adjust pricing, and consider new exclusions for high-risk areas.",
                    "Recommended Actions": "1. Enhance catastrophe modeling with climate science\n2. Develop climate stress testing\n3. Review underwriting guidelines for high-risk regions\n4. Increase pricing sophistication",
                    "generated_date": datetime.now().strftime("%Y-%m-%d"),
                    "sources": [summary.get("source", "Unknown") for summary in relevant_summaries[:5]],
                    "article_count": len(relevant_summaries)
                }
        except Exception as e:
            logger.error(f"Error in overall report preparation: {str(e)}", exc_info=True)
            # Even more robust fallback
            report_data = {
                "Executive Summary": "Report generation failed. Please see logs for details.",
                "Key Climate Risk Developments": "Error processing data.",
                "Insurance Domain Impacts": "Error processing data.",
                "Business Implications": "Error processing data.",
                "Recommended Actions": "Please check system logs and try again.",
                "generated_date": datetime.now().strftime("%Y-%m-%d"),
                "sources": [],
                "article_count": 0
            }

# Transform the report data to match our model
        try:
            report = {
                "executive_summary": report_data.get("Executive Summary", ""),
                "key_developments": report_data.get("Key Climate Risk Developments", ""),
                "insurance_domain_impacts": report_data.get("Insurance Domain Impacts", ""),
                "regional_insights": report_data.get("Regional Insights", ""),
                "regulatory_landscape": report_data.get("Regulatory Landscape", ""),
                "business_implications": report_data.get("Business Implications", ""),
                "recommended_actions": report_data.get("Recommended Actions", ""),
                "generated_date": report_data.get("generated_date", datetime.now().strftime("%Y-%m-%d")),
                "sources": report_data.get("sources", []),
                "article_count": report_data.get("article_count", 0),
                "created_at": datetime.now(),
                "vector_search_used": True,  # Flag to indicate vector search was used
                "summaries_count": len(relevant_summaries)
            }
            
            # Ensure all fields are properly formatted as strings
            report = format_report_data(report)
            if not report:
                raise ValueError("Report formatting failed")
                
            # Log report data for debugging
            logger.info(f"Final report ready for storage, length: {len(str(report))} characters")
            
            # Store the report in MongoDB with explicit error handling
            try:
                # Your database operations...
                report_id = await safe_mongodb_insert(db.reports, report)
                
                if report_id:
                    logger.info(f"Report stored successfully with ID: {report_id}")
                else:
                    logger.error("Failed to store report in database")

            except Exception as db_error:  # <-- Define the variable here
                logger.error(f"MongoDB error storing report: {str(db_error)}", exc_info=True)
                
                # Check for specific MongoDB errors
                error_msg = str(db_error).lower()
                if "duplicate key" in error_msg:
                    logger.warning("This appears to be a duplicate report")
                elif "document too large" in error_msg:
                    logger.error(f"Report document is too large: {len(str(report))} chars")
                    # Try to store a truncated version
                    try:
                        truncated_report = {k: v[:10000] if isinstance(v, str) and len(v) > 10000 else v 
                                        for k, v in report.items()}
                        truncated_report["truncated"] = True
                        result = await db.reports.insert_one(truncated_report)
                        logger.info(f"Stored truncated report with ID: {result.inserted_id}")
                    except Exception as truncate_error:
                        logger.error(f"Failed to store truncated report: {str(truncate_error)}")
            
        
        except Exception as e:
            logger.error(f"Error in analysis pipeline for task {task_id}: {str(e)}")
            # Update task status with error
            try:
                await db.tasks.update_one(
                    {"_id": ObjectId(task_id)},
                    {"$set": {
                        "status": "failed", 
                        "error": str(e), 
                        "completed_at": datetime.now()
                    }}
                )
            except Exception as update_error:
                logger.error(f"Error updating task failure status: {str(update_error)}")
    except Exception as e:
        logger.error(f"Error preparing report document: {str(e)}", exc_info=True)

async def verify_report_saved(task_id):
    """Check if a report was successfully saved for a task"""
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        logger.error(f"Task {task_id} not found")
        return False
        
    # Check completion status
    if task.get("status") != "completed":
        logger.error(f"Task {task_id} not completed: {task.get('status')}")
        return False
    
    # Get most recent report
    latest_report = await db.reports.find_one(
        {}, 
        sort=[("created_at", -1)]
    )
    
    if not latest_report:
        logger.error("No reports found in database")
        return False
        
    # Check if report was created after task started
    if latest_report.get("created_at") >= task.get("created_at"):
        logger.info(f"Found report created after task: {latest_report.get('_id')}")
        return True
    else:
        logger.error("Latest report was created before task started")
        return False
    
class UnderwritingChallenge(BaseModel):
    id: str
    challenge: str
    hazard_type: str
    region: str
    impact_level: str
    business_implications: str
    source: str
    date: str
@app.get("/underwriting/challenges", response_model=List[UnderwritingChallenge])
async def get_underwriting_challenges(
    hazard_type: str = "all", region: str = "all"
):
    """Fetch persisted underwriting challenges, filtered by hazard_type and region."""
    try:
        query: Dict[str, Any] = {}
        if hazard_type != "all":
            query["hazard_type"] = hazard_type
        if region != "all":
            query["region"] = region

        cursor = db.underwriting_challenges.find(query).sort("date", -1)
        docs = await cursor.to_list(length=100)

        return [UnderwritingChallenge(**{
            "id": str(doc.get("id") or doc.get("_id")),
            "challenge": doc["challenge"],
            "hazard_type": doc["hazard_type"],
            "region": doc["region"],
            "impact_level": doc["impact_level"],
            "business_implications": doc["business_implications"],
            "source": doc["source"],
            "date": doc["date"]
        }) for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching underwriting challenges: {e}")
        return []
@app.post("/admin/generate-underwriting-challenges")
async def generate_and_store_underwriting_challenges(
    background_tasks: BackgroundTasks
):
    """
    Trigger AI-powered underwriting challenge generation and store results.
    Clients can then GET /underwriting/challenges to retrieve them.
    """
    # Fetch existing articles to analyze
    articles = await db.articles.find().to_list(length=500)

    # Background task to run generation and persist
    async def _store():
        try:
            generated = await generate_underwriting_challenges(articles)
            if generated:
                await db.underwriting_challenges.delete_many({})
                await db.underwriting_challenges.insert_many(generated)
                logger.info(f"Stored {len(generated)} generated underwriting challenges")
        except Exception as err:
            logger.error(f"Error generating/storing challenges: {err}")

    background_tasks.add_task(_store)
    return {"message": "Underwriting challenge generation started"}

@app.get("/underwriting/coverage-gaps", response_model=List[CoverageGapData])
async def get_coverage_gaps(
    hazard_type: str = "all",
    region: str = "all"
):
    """
    Get coverage gap data by hazard type and region
    """
    try:
        # In production, this would query real data
        # For now, return realistic example data
        gaps = [
            {
                "hazard_type": "flood",
                "region": "north_america",
                "coverage_gap_percentage": 73,
                "economic_losses": 42.0,
                "insured_losses": 11.3,
                "trends": {
                    "gap_change": 5.0,
                    "take_up_rate": -3.0
                },
                "key_challenges": [
                    "NFIP limitations",
                    "Private market appetite constraints",
                    "Affordability issues in high-risk zones"
                ]
            },
            {
                "hazard_type": "wildfire",
                "region": "north_america",
                "coverage_gap_percentage": 42,
                "economic_losses": 28.0,
                "insured_losses": 16.2,
                "trends": {
                    "gap_change": 12.0,
                    "take_up_rate": -8.0
                },
                "key_challenges": [
                    "Coverage limitations in wildland-urban interface",
                    "Increasing non-renewals",
                    "State intervention with FAIR plans"
                ]
            },
            {
                "hazard_type": "hurricane",
                "region": "north_america",
                "coverage_gap_percentage": 37,
                "economic_losses": 65.0,
                "insured_losses": 40.9,
                "trends": {
                    "gap_change": 8.0,
                    "take_up_rate": -6.0
                },
                "key_challenges": [
                    "High deductibles limiting coverage",
                    "Separate wind policies creating gaps",
                    "Capacity constraints in high-risk coastal areas"
                ]
            },
            {
                "hazard_type": "drought",
                "region": "global",
                "coverage_gap_percentage": 92,
                "economic_losses": 38.0,
                "insured_losses": 3.0,
                "trends": {
                    "gap_change": 2.0,
                    "take_up_rate": 1.0
                },
                "key_challenges": [
                    "Limited parametric products",
                    "Difficulty in modeling impacts",
                    "Multi-year impact not aligning with annual policies"
                ]
            },
            {
                "hazard_type": "storm",
                "region": "north_america",
                "coverage_gap_percentage": 45,
                "economic_losses": 34.0,
                "insured_losses": 18.7,
                "trends": {
                    "gap_change": 7.0,
                    "take_up_rate": -4.0
                },
                "key_challenges": [
                    "Increasing hail deductibles",
                    "Anti-concurrent causation clauses",
                    "Roof coverage limitations by age"
                ]
            },
            {
                "hazard_type": "flood",
                "region": "europe",
                "coverage_gap_percentage": 65,
                "economic_losses": 32.0,
                "insured_losses": 11.2,
                "trends": {
                    "gap_change": -3.0,
                    "take_up_rate": 2.0
                },
                "key_challenges": [
                    "Variations in national flood insurance schemes",
                    "Rebuilding to resilient standards",
                    "Government-backed pools capacity limits"
                ]
            },
            {
                "hazard_type": "wildfire",
                "region": "asia_pacific",
                "coverage_gap_percentage": 61,
                "economic_losses": 18.0,
                "insured_losses": 7.0,
                "trends": {
                    "gap_change": 4.0,
                    "take_up_rate": -2.0
                },
                "key_challenges": [
                    "Limited wildfire-specific coverage options",
                    "Underinsurance in high-risk areas",
                    "Growing wildland-urban interface exposure"
                ]
            }
        ]
        
        # Apply filters
        if hazard_type != "all":
            gaps = [g for g in gaps if g["hazard_type"] == hazard_type]
            
        if region != "all":
            gaps = [g for g in gaps if g["region"] == region]
            
        return gaps
    except Exception as e:
        logger.error(f"Error fetching coverage gaps: {str(e)}")
        return []

# Scheduled task for daily analysis
async def scheduled_daily_analysis():
    """Run the analysis pipeline daily"""
    logger.info("Starting scheduled daily analysis")
    
    # Create a task record
    task = {
        "type": "scheduled",
        "description": "Daily climate risk analysis",
        "status": "pending",
        "created_at": datetime.now()
    }
    
    result = await db.tasks.insert_one(task)
    task_id = str(result.inserted_id)
    
    # Run the analysis pipeline
    asyncio.create_task(run_analysis_pipeline(task_id))

# API routes
@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Climate Risk Intelligence API"}

@app.get("/news-sources", response_model=List[NewsSourceModel])
async def get_news_sources():
    """Get all configured news sources"""
    return NEWS_SOURCES

@app.get("/articles", response_model=List[ArticleModel])
async def get_articles(
    skip: int = 0, 
    limit: int = 20,
    min_relevance: Optional[float] = None,
    source: Optional[str] = None,
    source_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get articles with optional filtering"""
    query = {}
    
    if min_relevance:
        query["total_relevance"] = {"$gte": min_relevance}
    
    if source:
        query["source"] = source
    
    if source_type:
        query["source_type"] = source_type
    
    if start_date:
        query["date"] = {"$gte": start_date}
    
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    articles = []
    cursor = db.articles.find(query).sort("total_relevance", -1).skip(skip).limit(limit)
    
    async for document in cursor:
        articles.append(document_helper(document))
    
    return articles

@app.get("/structured-summaries", response_model=List[StructuredSummaryModel])
async def get_structured_summaries(
    skip: int = 0,
    limit: int = 20,
    domain: Optional[str] = None,
    timeframe: Optional[str] = None,
    confidence: Optional[str] = None
):
    """Get structured summaries with optional filtering"""
    try:
        query = {}
        
        if domain:
            query["insurance_domains"] = domain
        
        if timeframe:
            query["timeframe"] = timeframe
        
        if confidence:
            query["confidence"] = confidence
        
        summaries = []
        cursor = db.structured_summaries.find(query).sort("created_at", -1).skip(skip).limit(limit)
        
        async for document in cursor:
            # Format fields to ensure they match the expected types
            formatted_doc = format_structured_summary(document)
            summaries.append(document_helper(formatted_doc))
        
        # If no summaries found, return empty list rather than raising error
        if not summaries and domain:
            logger.warning(f"No structured summaries found for domain: {domain}")
            # Optional: Return fallback data for development/testing
            return generate_fallback_summaries(domain, limit)
            
        return summaries
    except Exception as e:
        logger.error(f"Error in get_structured_summaries: {str(e)}")
        # Return empty list rather than raising error
        return []

def format_structured_summary(document: Dict) -> Dict:
    """Format structured summary fields to match expected types"""
    # Make a copy to avoid modifying the original
    doc = dict(document)
    
    # Ensure list fields remain lists
    list_fields = ["insurance_domains", "risk_factors"]
    for field in list_fields:
        if field in doc and not isinstance(doc[field], list):
            if isinstance(doc[field], str):
                doc[field] = [doc[field]]
            else:
                doc[field] = []
    
    # Ensure string fields are strings
    string_fields = [
        "key_event", "business_implications", "timeframe", 
        "confidence", "geographic_focus", "regulatory_impact", 
        "article_title", "article_url", "source", "date"
    ]
    
    for field in string_fields:
        if field in doc:
            if isinstance(doc[field], list):
                # Convert lists to newline-separated strings
                doc[field] = "\n".join(doc[field])
            elif isinstance(doc[field], dict):
                # Convert dicts to formatted strings
                formatted_text = ""
                for key, value in doc[field].items():
                    formatted_text += f"{key}: {value}\n"
                doc[field] = formatted_text.strip()
            elif not isinstance(doc[field], str):
                # Convert other non-string types to strings
                doc[field] = str(doc[field])
    
    return doc

def generate_fallback_summaries(domain: str, limit: int = 3) -> List[Dict]:
    """Generate fallback summaries for development/testing"""
    fallback_summaries = []
    
    # Domain-specific fallback data
    domain_data = {
        "property": [
            {
                "key_event": "Extreme Weather Driving Property Insurance Market Hardening",
                "insurance_domains": ["property"],
                "risk_factors": ["Hurricanes", "Wildfires", "Flooding"],
                "business_implications": "Increased premiums, reduced coverage availability in high-risk areas",
                "timeframe": "Immediate",
                "confidence": "High",
                "geographic_focus": "North America, Gulf Coast",
                "regulatory_impact": "Potential government intervention in high-risk markets",
                "article_title": "Extreme Weather Driving Property Insurance Market Hardening",
                "article_url": "https://www.insurancejournal.com/news/national/2024/04/05/extreme-weather-property-market/",
                "source": "Insurance Journal",
                "date": "2024-04-05"
            },
            {
                "key_event": "New Study Shows Coastal Flood Risk Underestimated by 30%",
                "insurance_domains": ["property"],
                "risk_factors": ["Sea level rise", "Coastal flooding", "Inaccurate risk models"],
                "business_implications": "Potential for unexpected losses if pricing models not updated",
                "timeframe": "Short-term",
                "confidence": "Medium",
                "geographic_focus": "Coastal regions",
                "regulatory_impact": "Increased disclosure requirements for climate risk",
                "article_title": "New Study Shows Coastal Flood Risk Underestimated in Property Valuations",
                "article_url": "https://www.climatechangenews.com/2024/03/22/coastal-flood-risk-underestimated/",
                "source": "Climate Home News",
                "date": "2024-03-22"
            }
        ],
        "casualty": [
            {
                "key_event": "Climate Liability Claims on the Rise as Legal Precedents Emerge",
                "insurance_domains": ["casualty"],
                "risk_factors": ["Liability litigation", "Disclosure failures", "Director responsibilities"],
                "business_implications": "Increasing exposure to climate-related liability claims, particularly in D&O coverage",
                "timeframe": "Medium-term",
                "confidence": "Medium",
                "geographic_focus": "Global, with emphasis on US and EU",
                "regulatory_impact": "New legal precedents affecting liability determination",
                "article_title": "Climate Liability Claims on the Rise as Legal Precedents Emerge",
                "article_url": "https://www.insurancebusinessmag.com/us/news/casualty/climate-liability-claims-rise/",
                "source": "Insurance Business Magazine",
                "date": "2024-04-01"
            }
        ],
        "health": [
            {
                "key_event": "Health Insurers Begin Accounting for Climate-Related Illness Trends",
                "insurance_domains": ["health"],
                "risk_factors": ["Heat-related illness", "Vector-borne diseases", "Respiratory conditions"],
                "business_implications": "Need for updated actuarial models to account for changing health risk patterns",
                "timeframe": "Long-term",
                "confidence": "Medium",
                "geographic_focus": "Global",
                "regulatory_impact": "Potential changes to required coverage for climate-related conditions",
                "article_title": "Health Insurers Begin Accounting for Climate-Related Illness Trends",
                "article_url": "https://www.insurancejournal.com/news/national/2024/03/18/health-climate-illness/",
                "source": "Insurance Journal",
                "date": "2024-03-18"
            }
        ],
        "life": [
            {
                "key_event": "Life Insurers Adjusting Mortality Assumptions for Climate Impacts",
                "insurance_domains": ["life"],
                "risk_factors": ["Heat mortality", "Changing disease patterns", "Extreme weather events"],
                "business_implications": "Long-term recalibration of mortality tables and pricing models needed",
                "timeframe": "Long-term",
                "confidence": "Medium",
                "geographic_focus": "Global, with regional variations",
                "regulatory_impact": "Potential new requirements for climate risk disclosure in life insurance",
                "article_title": "Life Insurers Adjusting Mortality Assumptions for Climate Impacts",
                "article_url": "https://www.example.com/life-insurance-climate-impact",
                "source": "Insurance Analytics Quarterly",
                "date": "2024-02-15"
            }
        ],
        "reinsurance": [
            {
                "key_event": "Reinsurance Capacity Shrinks for Climate-Vulnerable Regions",
                "insurance_domains": ["reinsurance", "property"],
                "risk_factors": ["Capacity shortage", "Pricing increases", "Coverage restrictions"],
                "business_implications": "Primary insurers face challenges securing adequate reinsurance protection at affordable rates",
                "timeframe": "Immediate",
                "confidence": "High",
                "geographic_focus": "Coastal and wildfire-prone regions",
                "regulatory_impact": "Potential government backstops for high-risk areas",
                "article_title": "Reinsurance Capacity Shrinks for Climate-Vulnerable Regions",
                "article_url": "https://www.insurancebusinessmag.com/us/news/catastrophe/reinsurance-capacity-shrinks/",
                "source": "Insurance Business Magazine",
                "date": "2024-03-25"
            }
        ]
    }
    
    # Get domain-specific data or use generic fallback
    domain_summaries = domain_data.get(domain.lower(), [])
    
    # Add fallback data if not enough domain-specific entries
    while len(domain_summaries) < limit:
        domain_summaries.append({
            "key_event": f"Climate risk impacts on {domain} insurance",
            "insurance_domains": [domain],
            "risk_factors": ["Climate change", "Regulatory changes", "Risk assessment"],
            "business_implications": "Insurance companies need to adjust underwriting and pricing models",
            "timeframe": "Medium-term",
            "confidence": "Medium",
            "geographic_focus": "Global",
            "regulatory_impact": "Evolving regulatory frameworks for climate risk disclosure",
            "article_title": f"Climate Risk Implications for {domain.capitalize()} Insurance",
            "article_url": f"https://example.com/climate-risk-{domain}",
            "source": "Climate Risk Intelligence",
            "date": datetime.now().strftime("%Y-%m-%d")
        })
    
    # Only return the requested number of summaries
    return domain_summaries

class SummaryRequest(BaseModel):
    article_id: str

class SummaryResponse(BaseModel):
    summary: str

def get_default_esg_impacts(category=None):
    """Return default ESG impacts data when real data isn't available"""
    all_impacts = [
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
        }
    ]
    
    # Filter by category if specified
    if category:
        return [impact for impact in all_impacts if impact["category"] == category]
    
    return all_impacts


@app.get("/regulatory/esg-impacts")
async def get_esg_impacts(
    category: Optional[str] = None  # 'E', 'S', or 'G'
):
    """
    Get ESG impacts related to climate risk for insurance companies.
    
    Args:
        category: Filter by ESG category (E, S, or G)
        
    Returns:
        List of ESG impacts, optionally filtered by category
    """
    try:
        query = {}
        if category:
            query["category"] = category
            
        # Check if we have a dedicated collection for ESG impacts
        count = await db.esg_impacts.count_documents({})
        
        if count > 0:
            # If we have data in the dedicated collection, use it
            impacts = []
            cursor = db.esg_impacts.find(query).sort("score", -1)
            
            async for doc in cursor:
                impacts.append(document_helper(doc))
                
            return impacts
        else:
            # If collection is empty, extract from structured summaries
            try:
                # This function should be defined elsewhere in your code
                impacts = await extract_esg_impacts_from_summaries(category=category)
                return impacts
            except Exception as extract_error:
                logger.error(f"Error extracting ESG impacts from summaries: {str(extract_error)}")
                # Fall back to default ESG impacts data
                return get_default_esg_impacts(category)
    except Exception as e:
        logger.error(f"Error fetching ESG impacts: {str(e)}")
        # Return default ESG impacts as fallback
        return get_default_esg_impacts(category)

# Models for Underwriting Challenges endpoints
class UnderwritingChallenge(BaseModel):
    id: str
    challenge: str
    hazard_type: str
    region: str
    impact_level: str  # 'High', 'Medium', 'Low'
    business_implications: str
    source: str
    date: str

@app.get("/underwriting/challenges", response_model=List[UnderwritingChallenge])
async def get_underwriting_challenges(
    hazard_type: str = "all",
    region: str = "all"
):
    """
    Get underwriting challenges related to climate risk
    """
    try:
        # In production, you would query real data from your database
        # For now, return realistic example data
        challenges = [
            {
                "id": "1",
                "challenge": "Flood risk models underestimating exposure in coastal regions",
                "hazard_type": "flood",
                "region": "north_america",
                "impact_level": "High",
                "business_implications": "Significant premium increases needed in high-risk zones; potential for coverage restrictions",
                "source": "Climate Home News",
                "date": "2024-03-22"
            },
            {
                "id": "2",
                "challenge": "Wildfire risk expanding beyond traditional high-risk zones",
                "hazard_type": "wildfire",
                "region": "north_america",
                "impact_level": "High",
                "business_implications": "Need for revised wildfire risk scoring and potential coverage limitations",
                "source": "Insurance Journal",
                "date": "2024-04-05"
            },
            {
                "id": "3",
                "challenge": "Hurricane intensity increasing beyond historical patterns",
                "hazard_type": "hurricane",
                "region": "north_america",
                "impact_level": "High",
                "business_implications": "Catastrophe models need recalibration; higher reinsurance costs",
                "source": "Insurance Business Magazine",
                "date": "2024-03-15"
            },
            {
                "id": "4",
                "challenge": "Sea level rise invalidating flood zone maps",
                "hazard_type": "flood",
                "region": "global",
                "impact_level": "Medium",
                "business_implications": "Underwriting decisions based on outdated FEMA flood maps creating unexpected exposure",
                "source": "Climate Home News",
                "date": "2024-02-18"
            },
            {
                "id": "5",
                "challenge": "Reinsurance capacity constraints for hurricane coverage",
                "hazard_type": "hurricane",
                "region": "global",
                "impact_level": "High",
                "business_implications": "Primary insurers facing difficulty securing adequate capacity at affordable rates",
                "source": "Insurance Business Magazine",
                "date": "2024-03-25"
            },
            {
                "id": "6",
                "challenge": "Drought impacts on agricultural insurance portfolios",
                "hazard_type": "drought",
                "region": "global",
                "impact_level": "Medium",
                "business_implications": "Increased crop failure claims and need for revised yield models",
                "source": "Insurance Journal",
                "date": "2024-01-15"
            },
            {
                "id": "7",
                "challenge": "European floods exceeding traditional catastrophe models",
                "hazard_type": "flood",
                "region": "europe",
                "impact_level": "High",
                "business_implications": "Need for updated flood modeling and potential for premium increases in newly vulnerable areas",
                "source": "Insurance Business Magazine",
                "date": "2024-02-10"
            },
            {
                "id": "8",
                "challenge": "Increasing hail severity affecting property insurance claims",
                "hazard_type": "storm",
                "region": "north_america",
                "impact_level": "Medium",
                "business_implications": "Rising roof damage claims and need for updated building codes",
                "source": "Insurance Journal",
                "date": "2024-03-01"
            }
        ]
        
        # Apply filters
        if hazard_type != "all":
            challenges = [c for c in challenges if c["hazard_type"] == hazard_type]
            
        if region != "all":
            challenges = [c for c in challenges if c["region"] == region]
            
        return challenges
    except Exception as e:
        logger.error(f"Error fetching underwriting challenges: {str(e)}")
        return []



# 2️⃣ Add the summarization endpoint
@app.post("/articles/summary", response_model=SummaryResponse)
async def summarize_article(request: SummaryRequest):
    # Lookup by ObjectId
    article = await db.articles.find_one({"_id": ObjectId(request.article_id)})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    system_prompt = """
    You are an expert assistant that produces concise, informative summaries in valid Markdown.

    Instructions:
    - Begin with a level‑2 heading `## Summary`.
    - Use bullet points (`-`) for key takeaways.
    - Use **bold** to highlight critical facts.
    - Keep the total length under ~200 words.
    - Do not include any HTML—only Markdown syntax.
    """

    human_content = f"""Title: {article['title']} Content: {article['content']}"""


    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_content)
    ]

    # Call the LLM
    llm_response = llm.invoke(messages)
    return {"summary": llm_response.content}

@app.get("/reports", response_model=List[ReportModel])
async def get_reports(skip: int = 0, limit: int = 10):
    """Get summary reports"""
    reports = []
    cursor = db.reports.find().sort("created_at", -1).skip(skip).limit(limit)
    
    async for document in cursor:
        # Format report fields to ensure they are strings
        document = format_report_data(document)
        reports.append(document_helper(document))
    
    return reports


@app.get("/reports/latest")
async def get_latest_report():
    """Get the most recent climate risk report"""
    try:
        # Check how many reports exist
        count = await db.reports.count_documents({})
        logger.info(f"Total reports in database: {count}")
        
        if count == 0:
            logger.warning("No reports found in database")
            return create_fallback_report("No reports in database")
        
        # Try different sort fields in case created_at is missing
        sort_fields = [

            ("_id", -1)  # MongoDB ObjectIds contain a timestamp, so sorting by _id works too
        ]
        
        report = None
        for sort_field, sort_dir in sort_fields:
            logger.info(f"Attempting to find latest report by sorting on {sort_field}")
            
            # Find the most recent report using this sort field
            cursor = db.reports.find().sort(sort_field, sort_dir).limit(1)
            reports = await cursor.to_list(length=1)
            
            if reports and len(reports) > 0:
                report = reports[0]
                logger.info(f"Found report with ID: {report.get('_id')} using sort field {sort_field}")
                break
        
        if report:
            # Log the report's fields for debugging
            logger.info(f"Report fields: {list(report.keys())}")
            
            # Format report fields
            report = format_report_data(report)
            result = document_helper(report)
            return result
        else:
            logger.error("No report found after trying all sort fields")
            return create_fallback_report("No report found")
            
    except Exception as e:
        logger.error(f"Error in get_latest_report: {str(e)}", exc_info=True)
        # Return a minimal fallback report
        return create_fallback_report(f"Error: {str(e)}")
    

@app.get("/reports/{report_id}", response_model=ReportModel)
async def get_report(report_id: str):
    """Get a specific report by ID"""
    try:
        report = await db.reports.find_one({"_id": ObjectId(report_id)})
        if report:
            # Format report fields to ensure they are strings
            report = format_report_data(report)
            return document_helper(report)
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found: {str(e)}")
    
class PremiumTrendPoint(BaseModel):
    month: str
    property: int
    casualty: int
    combined: int

@app.get("/underwriting/premium-trends", response_model=List[PremiumTrendPoint])
async def get_premium_trends(months: int = 12):
    """
    Get premium trends for property and casualty lines indexed to 100
    """
    try:
        # Try to get real data from structured summaries
        pipeline = [
            {"$match": {"key_event": {"$regex": "premium|price|pricing|rate", "$options": "i"}}},
            {"$sort": {"date": 1}}
        ]
        
        pricing_summaries = await db.structured_summaries.aggregate(pipeline).to_list(length=100)
        
        if pricing_summaries and len(pricing_summaries) > 5:
            # If we have real data, process it
            # This would need more sophisticated processing in production
            logger.info(f"Found {len(pricing_summaries)} pricing-related summaries")
            pass
        
        # For now, generate realistic trend data based on industry patterns
        # In production, this would use real data from your database
        current_month = datetime.now()
        trends = []
        
        # Property insurance has been seeing higher increases than casualty
        property_monthly_increase = 4.0  # 4% monthly increase
        casualty_monthly_increase = 2.0  # 2% monthly increase
        
        # Generate monthly data points going back 'months'
        for i in range(months):
            month_date = current_month - timedelta(days=30 * (months - i - 1))
            month_str = month_date.strftime("%Y-%m")
            
            # Calculate index values (normalized to 100 at start)
            property_index = 100 * (1 + property_monthly_increase / 100) ** i
            casualty_index = 100 * (1 + casualty_monthly_increase / 100) ** i
            combined_index = (property_index + casualty_index) / 2
            
            trends.append({
                "month": month_str,
                "property": round(property_index),
                "casualty": round(casualty_index),
                "combined": round(combined_index)
            })
        
        return trends
    except Exception as e:
        logger.error(f"Error generating premium trends: {str(e)}")
        
        # Return fallback data if there's an error
        return [
            {"month": "2023-05", "property": 100, "casualty": 100, "combined": 100},
            {"month": "2023-06", "property": 103, "casualty": 101, "combined": 102},
            {"month": "2023-07", "property": 106, "casualty": 102, "combined": 104},
            {"month": "2023-08", "property": 110, "casualty": 104, "combined": 107},
            {"month": "2023-09", "property": 115, "casualty": 106, "combined": 110},
            {"month": "2023-10", "property": 119, "casualty": 107, "combined": 113},
            {"month": "2023-11", "property": 124, "casualty": 109, "combined": 116},
            {"month": "2023-12", "property": 129, "casualty": 111, "combined": 120},
            {"month": "2024-01", "property": 134, "casualty": 113, "combined": 124},
            {"month": "2024-02", "property": 140, "casualty": 116, "combined": 128},
            {"month": "2024-03", "property": 145, "casualty": 118, "combined": 132},
            {"month": "2024-04", "property": 151, "casualty": 120, "combined": 136}
        ]

    
@app.get("/hazards/active")
async def get_active_hazards():
    """
    Get active hazard warnings from weather.gov API
    """
    try:
        # Create an async client
        async with httpx.AsyncClient() as client:
            response = await client.get("https://api.weather.gov/alerts/active")
            data = response.json()
            
            # Process the geojson features
            result = []
            for feature in data.get("features", []):
                properties = feature.get("properties", {})
                geometry = feature.get("geometry")
                
                # Only include features with geometry
                if geometry:
                    result.append({
                        "id": feature.get("id", ""),
                        "title": properties.get("headline", "Unknown Hazard"),
                        "severity": properties.get("severity", "Unknown"),
                        "area": geometry,
                        "description": properties.get("description", "")
                    })
            
            return result
    except Exception as e:
        logger.error(f"Error fetching weather hazards: {str(e)}")
        return []

@app.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Count total articles
        total_articles = await db.articles.count_documents({})
        
        # Count total reports
        total_reports = await db.reports.count_documents({})
        
        # Get source distribution
        pipeline = [
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        source_distribution = {}
        async for doc in db.articles.aggregate(pipeline):
            source_distribution[doc["_id"]] = doc["count"]
        
        # Get domain distribution
        pipeline = [
            {"$unwind": "$insurance_domains"},
            {"$group": {"_id": "$insurance_domains", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        domain_distribution = {}
        async for doc in db.structured_summaries.aggregate(pipeline):
            domain_distribution[doc["_id"]] = doc["count"]
        
        # Get risk factor frequency
        pipeline = [
            {"$unwind": "$risk_factors"},
            {"$group": {"_id": "$risk_factors", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        risk_factor_frequency = {}
        async for doc in db.structured_summaries.aggregate(pipeline):
            risk_factor_frequency[doc["_id"]] = doc["count"]
        
        # Get most recent report
        recent_report = await db.reports.find_one({}, sort=[("created_at", -1)])
        
        # Format report fields to ensure they are strings
        if recent_report:
            recent_report = format_report_data(recent_report)
            recent_report = document_helper(recent_report)
        
        return {
            "total_articles": total_articles,
            "total_reports": total_reports,
            "source_distribution": source_distribution,
            "domain_distribution": domain_distribution,
            "risk_factor_frequency": risk_factor_frequency,
            "recent_report": format_report_data(recent_report) if recent_report else None

        }
    except Exception as e:
        logger.error(f"Error in get_dashboard_stats: {str(e)}")
        # Return minimal stats if there's an error
        return {
            "total_articles": 0,
            "total_reports": 0,
            "source_distribution": {},
            "domain_distribution": {},
            "risk_factor_frequency": {},
            "recent_report": None
        }
    
async def run_analysis_pipeline_with_timeout(task_id: str, custom_sources: List[Dict[str, Any]] = None):
    """Run the analysis pipeline with a timeout to prevent indefinitely hanging tasks"""
    logger.info(f"Starting analysis pipeline with timeout for task {task_id}")
    
    # Create a task done event
    task_done = asyncio.Event()
    
    # Run the analysis task
    async def run_task():
        try:
            await run_analysis_pipeline(task_id, custom_sources)
            task_done.set()  # Signal that the task is done
        except Exception as e:
            logger.error(f"Error in analysis pipeline: {str(e)}")
            # Update task status with error
            try:
                await db.tasks.update_one(
                    {"_id": ObjectId(task_id)},
                    {"$set": {
                        "status": "failed", 
                        "error": str(e), 
                        "completed_at": datetime.now()
                    }}
                )
            except Exception as update_error:
                logger.error(f"Error updating task failure status: {str(update_error)}")
            
            task_done.set()  # Signal that the task is done even though it failed
    
    # Start the task
    task = asyncio.create_task(run_task())
    
    # Wait for the task to complete or timeout (30 minutes)
    try:
        await asyncio.wait_for(task_done.wait(), timeout=1800)  # 30 minutes in seconds
        logger.info(f"Analysis pipeline completed for task {task_id}")
    except asyncio.TimeoutError:
        logger.error(f"Analysis pipeline timed out after 30 minutes for task {task_id}")
        
        # Update the task status
        try:
            await db.tasks.update_one(
                {"_id": ObjectId(task_id)},
                {"$set": {
                    "status": "failed", 
                    "error": "Analysis pipeline timed out after 30 minutes", 
                    "completed_at": datetime.now()
                }}
            )
        except Exception as e:
            logger.error(f"Error updating task timeout status: {str(e)}")
        
        # Cancel the running task
        task.cancel()
        
        # Create a fallback report for this task
        await create_fallback_report_for_task(task_id)

@app.post("/analysis/run", response_model=AnalysisResponse, status_code=status.HTTP_202_ACCEPTED)
async def run_analysis(
    analysis_request: AnalysisRequest,
    background_tasks: BackgroundTasks
):
    """Start an analysis pipeline run with timeout protection"""
    # Create a task record
    task = {
        "type": "manual",
        "description": "Manual climate risk analysis",
        "status": "pending",
        "created_at": datetime.now()
    }
    
    result = await db.tasks.insert_one(task)
    task_id = str(result.inserted_id)
    
    # Create custom sources list if provided
    custom_sources = None
    if analysis_request.news_sources:
        custom_sources = [source.model_dump() for source in analysis_request.news_sources]
    
    # Run the pipeline in the background with timeout protection
    background_tasks.add_task(run_analysis_pipeline_with_timeout, task_id, custom_sources)
    
    return {
        "task_id": task_id,
        "message": "Analysis pipeline started with timeout protection"
    }

@app.get("/analysis/task/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of an analysis task"""
    try:
        task = await db.tasks.find_one({"_id": ObjectId(task_id)})
        if task:
            return {
                "task_id": str(task["_id"]),
                "status": task["status"],
                "description": task["description"],
                "created_at": task["created_at"],
                "completed_at": task.get("completed_at"),
                "error": task.get("error")
            }
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found: {str(e)}")

# Add this function to your app.py file

# In app.py
async def handle_stalled_tasks():
    """
    Identify and update tasks that have been stuck in 'pending' status for too long
    """
    logger.info("Checking for stalled tasks")
    
    # Define the threshold for stalled tasks (e.g., 30 minutes)
    time_threshold = datetime.now() - timedelta(minutes=30)
    
    # Find tasks that have been in 'pending' status for longer than the threshold
    query = {
        "status": "pending",
        "created_at": {"$lt": time_threshold}
    }
    
    stalled_tasks = []
    async for task in db.tasks.find(query):
        stalled_tasks.append(task)
    
    if not stalled_tasks:
        logger.info("No stalled tasks found")
        return
        
    logger.warning(f"Found {len(stalled_tasks)} stalled tasks")
    
    # Update each stalled task
    for task in stalled_tasks:
        task_id = task.get("_id")
        logger.warning(f"Processing stalled task {task_id}")
        
        try:
            # Update the task status to failed
            await db.tasks.update_one(
                {"_id": task_id},
                {"$set": {
                    "status": "failed",
                    "error": "Task automatically marked as failed after being stuck in pending status",
                    "completed_at": datetime.now()
                }}
            )
            
            # Create a fallback report for the stalled task
            await create_fallback_report_for_task(str(task_id))
            
        except Exception as e:
            logger.error(f"Error handling stalled task {task_id}: {str(e)}")

async def create_fallback_report_for_task(task_id):
    """Create a fallback report for a specific failed task"""
    logger.info(f"Creating fallback report for failed task {task_id}")
    
    # Get the most recent structured summaries to use in the report
    recent_summaries = []
    async for summary in db.structured_summaries.find().sort([
        ("confidence", -1), 
        ("created_at", -1)
    ]).limit(20):
        if "_id" in summary:
            summary["id"] = str(summary.pop("_id"))
        recent_summaries.append(summary)
    
    if not recent_summaries:
        logger.error("No structured summaries found for fallback report")
        return
        
    logger.info(f"Found {len(recent_summaries)} summaries for fallback report")
    
    # Extract domains
    domains = set()
    for summary in recent_summaries:
        domains.update(summary.get("insurance_domains", []))
    
    domains = list(domains)
    
    # Extract sources
    sources = set()
    for summary in recent_summaries:
        sources.add(summary.get("source", "Unknown"))
    
    # Create a basic fallback report
    fallback_report = {
        "executive_summary": "This fallback report was automatically generated to recover from a stalled analysis task. It provides a summary of recent climate risk developments affecting the insurance industry based on available structured data.",
        
        "key_developments": "1. Climate regulatory frameworks expanding globally\n2. Extreme weather events increasing in frequency and severity\n3. Rising sea levels threatening coastal properties\n4. Legal precedents for climate liability emerging",
        
        "insurance_domain_impacts": "\n".join([
            f"**{domain.capitalize()} Insurance:**\n" + 
            "\n".join([
                f"• {summary.get('key_event', 'Unknown event')}" 
                for summary in recent_summaries 
                if domain in summary.get("insurance_domains", [])
            ])[:1000] + "\n\n"
            for domain in domains
        ]),
        
        "regional_insights": "Analysis of regional impacts not available in fallback report.",
        
        "regulatory_landscape": "Regulatory frameworks continue to evolve globally with increased focus on climate risk disclosure and management.",
        
        "business_implications": "Insurance companies need to update risk models, adjust pricing strategies, and develop new products to address emerging climate risks.",
        
        "recommended_actions": "1. Enhance catastrophe modeling with climate science\n2. Develop climate stress testing\n3. Review underwriting guidelines for high-risk regions\n4. Increase pricing sophistication for climate risk",
        
        "generated_date": datetime.now().strftime("%Y-%m-%d"),
        "sources": list(sources),
        "article_count": len(recent_summaries),
        "created_at": datetime.now(),
        "task_id": str(task_id),
        "_fallback": True  # Flag indicating this is a fallback report
    }
    
    # Insert the fallback report
    try:
        result = await db.reports.insert_one(fallback_report)
        logger.info(f"Successfully created fallback report with ID: {result.inserted_id} for task {task_id}")
    except Exception as e:
        logger.error(f"Error creating fallback report for task {task_id}: {str(e)}")

@app.get("/domains/risk-scores", response_model=List[DomainRiskScore])
async def get_domain_risk_scores():
    """
    Calculate and return current risk scores for each insurance domain
    based on the structured summaries
    """
    domains = ["property", "casualty", "life", "health", "reinsurance"]
    domain_scores = []
    
    for domain in domains:
        # Find recent summaries for this domain (last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Get relevant summaries
        query = {
            "insurance_domains": domain,
            "date": {"$gte": thirty_days_ago}
        }
        
        # Count how many summaries exist for this domain
        count = await db.structured_summaries.count_documents(query)
        
        # Calculate average confidence and determine top factors
        pipeline = [
            {"$match": query},
            {"$unwind": "$risk_factors"},
            {"$group": {"_id": "$risk_factors", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 3}
        ]
        
        top_factors = []
        async for doc in db.structured_summaries.aggregate(pipeline):
            top_factors.append(doc["_id"])
        
        # Calculate a risk score based on number of recent mentions
        # and normalize between 1-10
        base_score = min(count * 1.5, 10)
        if base_score == 0:
            # Fallback for empty database
            base_score = 5.0 + (domains.index(domain) % 3)
            
        # Determine trend by comparing with previous period
        sixty_days_ago = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
        previous_query = {
            "insurance_domains": domain,
            "date": {"$gte": sixty_days_ago, "$lt": thirty_days_ago}
        }
        previous_count = await db.structured_summaries.count_documents(previous_query)
        
        if count > previous_count * 1.2:
            trend = "increasing"
        elif count < previous_count * 0.8:
            trend = "decreasing"
        else:
            trend = "stable"
            
        # If both counts are 0, set a default trend based on domain
        if count == 0 and previous_count == 0:
            if domain in ["property", "health", "reinsurance"]:
                trend = "increasing"
            else:
                trend = "stable"
                
        # Fallback for empty factor list
        if not top_factors:
            if domain == "property":
                top_factors = ["Floods", "Wildfires", "Hurricanes"]
            elif domain == "casualty":
                top_factors = ["Liability claims", "Disclosure failures"]
            elif domain == "life":
                top_factors = ["Heat-related illness", "Climate mortality"]
            elif domain == "health":
                top_factors = ["Vector-borne diseases", "Heat stress"]
            else:  # reinsurance
                top_factors = ["Capacity constraints", "Pricing increases"]
        
        domain_scores.append({
            "domain": domain,
            "risk_score": round(base_score, 1),
            "contributing_factors": top_factors,
            "trend": trend
        })
    
    return domain_scores

# Add these imports at the top of the file
from sklearn.cluster import KMeans
import numpy as np
from collections import Counter

# Add this function for topic clustering
async def generate_topic_clusters(num_clusters: int = 5) -> List[Dict[str, Any]]:
    """
    Generate topic clusters from structured summaries using vector embeddings.
    
    Args:
        num_clusters: Number of topic clusters to generate
        
    Returns:
        List of topic clusters with representative summaries and labels
    """
    logger.info(f"Generating {num_clusters} topic clusters from structured summaries")
    
    # Get all structured summaries from last 90 days
    ninety_days_ago = datetime.now() - timedelta(days=90)
    recent_summaries = []
    
    async for summary in db.structured_summaries.find({"created_at": {"$gte": ninety_days_ago}}):
        recent_summaries.append(document_helper(summary))
    
    if len(recent_summaries) < num_clusters * 2:
        logger.warning(f"Not enough structured summaries for meaningful clustering. Found {len(recent_summaries)}, need at least {num_clusters * 2}")
        return []
    
    # Generate embeddings for each summary
    embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # Create combined text for each summary
    texts = []
    for summary in recent_summaries:
        combined_text = f"""
        Key Event: {summary.get('key_event', '')}
        Insurance Domains: {', '.join(summary.get('insurance_domains', []))}
        Risk Factors: {', '.join(summary.get('risk_factors', []))}
        Business Implications: {summary.get('business_implications', '')}
        """
        texts.append(combined_text)
    
    # Generate embeddings
    try:
        embeddings = []
        # Process in batches of 100 to avoid memory issues
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            batch_embeddings = embedding_model.embed_documents(batch)
            embeddings.extend(batch_embeddings)
        
        # Convert to numpy array
        embeddings_array = np.array(embeddings)
        
        # Apply K-means clustering
        kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings_array)
        
        # Group summaries by cluster
        clusters = [[] for _ in range(num_clusters)]
        for i, label in enumerate(cluster_labels):
            clusters[label].append(recent_summaries[i])
        
        # Generate results
        results = []
        for cluster_id, cluster_summaries in enumerate(clusters):
            if not cluster_summaries:
                continue
                
            # Identify common themes in the cluster
            domains = []
            risk_factors = []
            for summary in cluster_summaries:
                domains.extend(summary.get("insurance_domains", []))
                risk_factors.extend(summary.get("risk_factors", []))
            
            # Count frequencies
            domain_counts = Counter(domains)
            risk_factor_counts = Counter(risk_factors)
            
            # Get most common elements
            top_domains = [domain for domain, _ in domain_counts.most_common(3)]
            top_risk_factors = [factor for factor, _ in risk_factor_counts.most_common(5)]
            
            # Generate a cluster label
            if top_risk_factors and top_domains:
                cluster_label = f"{', '.join(top_risk_factors[:2])} affecting {', '.join(top_domains)}"
            elif top_risk_factors:
                cluster_label = f"{', '.join(top_risk_factors[:3])}"
            elif top_domains:
                cluster_label = f"Climate risks affecting {', '.join(top_domains)}"
            else:
                cluster_label = f"Topic Cluster {cluster_id + 1}"
            
            # Sort summaries by confidence
            cluster_summaries.sort(key=lambda x: {"High": 3, "Medium": 2, "Low": 1}.get(x.get("confidence", "Low"), 0), reverse=True)
            
            # Take top 5 representatives
            representatives = cluster_summaries[:5]
            
            results.append({
                "cluster_id": cluster_id,
                "label": cluster_label,
                "domains": top_domains,
                "risk_factors": top_risk_factors,
                "representative_summaries": representatives,
                "summary_count": len(cluster_summaries)
            })
        
        return results
    
    except Exception as e:
        logger.error(f"Error generating topic clusters: {str(e)}")
        return []

# Add a new API endpoint for topic clusters
@app.get("/topics/clusters", response_model=List[Dict[str, Any]])
async def get_topic_clusters(num_clusters: int = 5):
    """Get topic clusters from structured summaries"""
    try:
        clusters = await generate_topic_clusters(num_clusters)
        return clusters
    except Exception as e:
        logger.error(f"Error in get_topic_clusters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating topic clusters: {str(e)}")


# Startup and shutdown eventsW
@app.on_event("startup")
async def startup_event():
    try:
        # Create indexes
        await db.articles.create_index("url", unique=True)
        await db.articles.create_index("total_relevance")
        await db.articles.create_index("content_hash")
        await db.articles.create_index("source")
        await db.articles.create_index("date")
        await db.structured_summaries.create_index("insurance_domains")
        await db.structured_summaries.create_index("created_at")
        await db.reports.create_index("created_at")
        
        # Check if vector indices exist and are valid
        try:
            if os.path.exists("summaries_index"):
                embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
                FAISS.load_local("summaries_index", embedding_model, allow_dangerous_deserialization=True)
                logger.info("Verified existing summaries_index is valid")
            else:
                logger.warning("summaries_index does not exist, will be created when needed")
                
            if os.path.exists("articles_index"):
                embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
                FAISS.load_local("articles_index", embedding_model, allow_dangerous_deserialization=True)
                logger.info("Verified existing articles_index is valid")
            else:
                logger.warning("articles_index does not exist, will be created when needed")
        except Exception as e:
            logger.error(f"Error verifying vector indices: {str(e)}")
            # Remove potentially corrupted indices
            for index_path in ["summaries_index", "articles_index"]:
                if os.path.exists(index_path):
                    logger.warning(f"Removing potentially corrupted index: {index_path}")
                    import shutil
                    shutil.rmtree(index_path)
        
        async def scheduled_tasks():
                try:
                    # First handle any stalled tasks
                    await handle_stalled_tasks()
                    
                    # Then do the normal daily analysis
                    # (your existing scheduled_daily_analysis function call)
                    await scheduled_daily_analysis()
                except Exception as e:
                    logger.error(f"Error in scheduled tasks: {str(e)}")

        # Schedule vector index maintenance
        async def update_vector_indexes():
            logger.info("Running scheduled vector index update")
            
            try:
                # Get recent structured summaries
                last_week = datetime.now() - timedelta(days=7)
                recent_summaries = []
                async for summary in db.structured_summaries.find({"created_at": {"$gte": last_week}}):
                    recent_summaries.append(document_helper(summary))
                    
                if recent_summaries:
                    await index_structured_summaries(recent_summaries, update_index=True)
                    logger.info(f"Updated summaries vector index with {len(recent_summaries)} recent summaries")
                    
                # Update articles index if needed (less frequently)
                if datetime.now().weekday() == 0:  # Only on Mondays
                    # Get recent articles
                    recent_articles = []
                    async for article in db.articles.find({"created_at": {"$gte": last_week}}):
                        recent_articles.append(document_helper(article))
                        
                    if recent_articles:
                        await asyncio.to_thread(update_articles_index, recent_articles)
                        logger.info(f"Updated articles vector index with {len(recent_articles)} recent articles")
            except Exception as e:
                logger.error(f"Error updating vector indexes: {str(e)}")
        
        # Start the scheduler
        scheduler.add_job(scheduled_tasks, "cron", hour=1, minute=0)  # Run daily at 1:00 AM
    # Also schedule stalled task handler to run every hour
        scheduler.add_job(handle_stalled_tasks, "interval", hours=1)
        scheduler.add_job(scheduled_daily_analysis, "cron", hour=1, minute=0)  # Run daily at 1:00 AM
        scheduler.add_job(update_vector_indexes, "cron", hour=2, minute=0)  # Run daily at 2:00 AM
        if not scheduler.running:
            scheduler.start()
        logger.info("Scheduler started")
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        # Continue startup despite errors to prevent application from failing to start

@app.on_event("shutdown")
async def shutdown_event():
    # Shutdown the scheduler
    scheduler.shutdown()
    # Close MongoDB connection
    client.close()
    logger.info("API shutdown complete")

@app.get("/hazards/active")
async def get_active_hazards():
    res = await httpx.get("https://api.weather.gov/alerts/active")
    geojson = res.json()
    return [
        {
            "id": f["id"],
            "title": f["properties"]["headline"],
            "severity": f["properties"]["severity"],
            "area": f["geometry"]
        }
        for f in geojson.get("features", []) if f.get("geometry")
    ]
@app.post("/articles/enrich-geo")
async def enrich_geo_articles():
    from .geotag import enrich_all_articles
    await enrich_all_articles()
    return {"status": "ok", "message": "Geolocation enrichment started"}

@app.post("/articles/{article_id}/generate-location")
async def generate_location(article_id: str):
    article = await db["articles"].find_one({"_id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    from .geotag import extract_location_from_article, geocode_location
    location_name = extract_location_from_article(article["title"], article["summary"])
    geodata = geocode_location(location_name)

    if geodata:
        await db["articles"].update_one(
            {"_id": article_id},
            {"$set": {
                "lat": geodata["lat"],
                "lng": geodata["lng"],
                "location_name": location_name
            }}
        )
        return {"status": "success", "location": location_name}
    
    raise HTTPException(status_code=400, detail="Failed to geocode location")

from pymongo import DESCENDING

@app.get("/trends/emerging")
async def get_emerging_trends():
    recent_window = datetime.utcnow() - timedelta(days=30)
    older_window = datetime.utcnow() - timedelta(days=90)

    # Get recent factor counts (last 30 days)
    recent = await db.articles.aggregate([
        {"$match": {"date": {"$gte": recent_window}}},
        {"$unwind": "$risk_factors"},
        {"$group": {"_id": "$risk_factors", "count": {"$sum": 1}}}
    ]).to_list(length=100)

    # Get older factor counts (30–90 days ago)
    older = await db.articles.aggregate([
        {"$match": {"date": {"$gte": older_window, "$lt": recent_window}}},
        {"$unwind": "$risk_factors"},
        {"$group": {"_id": "$risk_factors", "count": {"$sum": 1}}}
    ]).to_list(length=100)

    trend_map = {}
    for r in recent:
        trend_map[r["_id"]] = {"recent": r["count"], "change": 0}

    for o in older:
        if o["_id"] in trend_map:
            prev = o["count"]
            curr = trend_map[o["_id"]]["recent"]
            trend_map[o["_id"]]["change"] = round(((curr - prev) / prev * 100), 1) if prev else 0

    sorted_trends = sorted(
        [{"factor": k, **v} for k, v in trend_map.items()],
        key=lambda x: -x["change"]
    )

    return sorted_trends[:10]



class FloodRiskScore(BaseModel):
    address: str
    latitude: float
    longitude: float
    river_discharge: float
    discharge_max: float
    flood_warning_level: str
    flood_probability: float
    recommended_premium_factor: float
    pricing_note: str

def classify_river_risk(discharge: float) -> tuple[str, float, float, str]:
    if discharge < 200:
        return "Low", 0.1, 1.0, "Minimal risk from current discharge."
    elif discharge < 800:
        return "Medium", 0.5, 1.15, "Moderate discharge; monitor and apply buffer."
    else:
        return "High", 0.85, 1.35, "High discharge – flood possible."

@app.get("/underwriting/flood-risk", response_model=FloodRiskScore)
async def get_flood_risk(
    lat: float = Query(...),
    lon: float = Query(...)
):
    try:
        url = (
            f"https://flood-api.open-meteo.com/v1/flood?"
            f"latitude={lat}&longitude={lon}&daily=river_discharge,river_discharge_max"
        )
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            res.raise_for_status()

        data = res.json()
        daily_data = data.get("daily", {})
        discharges = daily_data.get("river_discharge", [])
        max_discharges = daily_data.get("river_discharge_max", [])

        if not discharges or not max_discharges:
            raise ValueError("No river discharge data available.")

        # Use the first forecasted day
        discharge_today = discharges[0]
        discharge_max_today = max_discharges[0]

        warning, probability, factor, note = classify_river_risk(discharge_today)

        return FloodRiskScore(
            address=f"Lat {lat:.2f}, Lon {lon:.2f}",
            latitude=lat,
            longitude=lon,
            river_discharge=discharge_today,
            discharge_max=discharge_max_today,
            flood_warning_level=warning,
            flood_probability=probability,
            recommended_premium_factor=factor,
            pricing_note=note
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flood API error: {str(e)}")

class TrackedProperty(BaseModel):
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


@app.post("/properties")
async def create_property(property_data: dict):
    try:
        # If an ID is provided, convert it to _id
        if "id" in property_data:
            property_id = property_data.pop("id")
            property_data["_id"] = property_id
            
        result = await db.tracked_properties.insert_one(property_data)
        
        return {"id": str(result.inserted_id), "success": True}
    except Exception as e:
        print(f"Error creating property: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/properties")
async def get_properties():
    try:
        properties = []
        cursor = db.tracked_properties.find()
        
        async for doc in cursor:
            # Convert _id to string
            properties.append(document_helper(doc))
            
        return properties
    except Exception as e:
        print(f"Error fetching properties: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



from bson.errors import InvalidId

@app.delete("/properties/{property_id}")
async def delete_property(property_id: str):
    # 1) convert the string into an ObjectId
    try:
        obj_id = ObjectId(property_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid property ID")

    # 2) perform the delete
    try:
        result = await db.tracked_properties.delete_one({"_id": obj_id})
        if result.deleted_count == 0:
            # no matching document
            raise HTTPException(status_code=404, detail="Property not found")
        return {"success": True}
    except Exception as e:
        print(f"Error deleting property: {e}")
        raise HTTPException(status_code=500, detail="Database error")

    
@app.get("/geocode")
async def geocode_address(address: str):
    try:
        async with httpx.AsyncClient() as client:
            # Use OpenStreetMap Nominatim API for geocoding
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": address,
                "format": "json",
                "limit": 1
            }
            headers = {
                "User-Agent": "ClimateRiskIntelligence/1.0 (contact@example.com)"
            }
            
            response = await client.get(url, params=params, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Geocoding service error")
                
            data = response.json()
            
            if not data:
                # Return default coordinates with an indication they're fallbacks
                return {
                    "latitude": 33.7490,
                    "longitude": -84.3880,
                    "display_name": address,
                    "is_fallback": True
                }
            
            result = data[0]
            return {
                "latitude": float(result["lat"]),
                "longitude": float(result["lon"]),
                "display_name": result["display_name"],
                "is_fallback": False
            }
    except Exception as e:
        print(f"Geocoding error: {str(e)}")
        # Fallback coordinates (Atlanta)
        return {
            "latitude": 33.7490,
            "longitude": -84.3880,
            "display_name": address,
            "is_fallback": True
        }

@app.post("/properties/upload-csv")
async def upload_property_csv(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    inserted = []
    for _, row in df.iterrows():
        lat, lon = await geocode_address(row["Address"])
        prop = TrackedProperty(
            id=str(uuid4()),
            name=row["Name"],
            address=row["Address"],
            latitude=lat,
            longitude=lon,
            notes=row.get("Notes", "")
        )
        await db.tracked_properties.insert_one(prop.dict())
        inserted.append(prop)
    return {"message": f"{len(inserted)} properties imported."}

# Add this to your app.py file

@app.get("/climate-risks/multi-hazard")
async def get_multi_hazard_risks(lat: float, lon: float):
    """
    Fetch comprehensive climate risk data from Open-Meteo and other sources
    
    Args:
        lat: Latitude of the property
        lon: Longitude of the property
        
    Returns:
        Dict containing risk assessments for multiple climate hazards
    """
    try:
        async with httpx.AsyncClient() as client:
            # Fetch weather forecast data from Open-Meteo
            weather_response = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,windgusts_10m_max",
                    "timezone": "auto",
                    "forecast_days": 14
                }
            )
            
            if weather_response.status_code != 200:
                raise HTTPException(status_code=500, detail="Weather API error")
                
            weather_data = weather_response.json()
            
            # Fetch flood risk data from Open-Meteo Flood API
            flood_response = await client.get(
                "https://flood-api.open-meteo.com/v1/flood",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "river_discharge,river_discharge_max"
                }
            )
            
            if flood_response.status_code != 200:
                # If flood API fails, we'll still continue with other risk assessments
                print(f"Flood API error: {flood_response.status_code}")
                flood_data = {"daily": {"river_discharge": [0.1], "river_discharge_max": [0.2]}}
            else:
                flood_data = flood_response.json()
            
            # Process the data to calculate risk levels
            risks = calculate_climate_risks(weather_data, flood_data)
            
            return risks
    except Exception as e:
        print(f"Error fetching climate risks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching climate risks: {str(e)}")
            
def calculate_climate_risks(weather_data, flood_data):
    """Calculate climate risks based on weather and flood data"""
    try:
        # Extract data for analysis
        daily = weather_data.get("daily", {})
        max_temps = daily.get("temperature_2m_max", [20])  # Default if missing
        min_temps = daily.get("temperature_2m_min", [10])
        precip_sums = daily.get("precipitation_sum", [0])
        precip_probs = daily.get("precipitation_probability_max", [0])
        wind_speeds = daily.get("windspeed_10m_max", [10])
        wind_gusts = daily.get("windgusts_10m_max", [15])
        
        flood_daily = flood_data.get("daily", {})
        river_discharge = flood_daily.get("river_discharge", [0.1])
        river_discharge_max = flood_daily.get("river_discharge_max", [0.2])
        
        # FLOOD RISK - based on river discharge
        avg_discharge = sum(river_discharge) / len(river_discharge)
        max_discharge = max(river_discharge)
        discharge_ratio = max_discharge / max(avg_discharge, 0.1)  # Avoid division by zero
        
        if max_discharge > 500 or discharge_ratio > 2:
            flood_level = "High"
            flood_probability = min(90, round(discharge_ratio * 30))
            flood_detail = f"High flood risk with maximum river discharge of {max_discharge:.1f} m³/s"
        elif max_discharge > 200 or discharge_ratio > 1.5:
            flood_level = "Medium"
            flood_probability = min(70, round(discharge_ratio * 20))
            flood_detail = "Moderate flood risk with elevated river discharge levels"
        else:
            flood_level = "Low"
            flood_probability = min(30, round(discharge_ratio * 10))
            flood_detail = "Low flood risk based on current river discharge data"
        
        # WILDFIRE RISK - based on temperature and precipitation
        avg_max_temp = sum(max_temps) / len(max_temps)
        avg_precip = sum(precip_sums) / len(precip_sums)
        dry_days = sum(1 for p in precip_sums if p < 1)
        fire_risk_factor = (avg_max_temp - 15) * (dry_days / len(precip_sums)) * 10
        
        if fire_risk_factor > 100:
            wildfire_level = "High"
            wildfire_probability = min(90, round(fire_risk_factor / 2))
            wildfire_detail = "High fire danger due to high temperatures and dry conditions"
        elif fire_risk_factor > 50:
            wildfire_level = "Medium"
            wildfire_probability = min(60, round(fire_risk_factor / 2))
            wildfire_detail = "Moderate fire risk with periods of elevated temperature"
        else:
            wildfire_level = "Low"
            wildfire_probability = min(30, round(fire_risk_factor / 2))
            wildfire_detail = "Low fire risk based on current temperature and precipitation patterns"
        
        # WIND/HURRICANE RISK - based on wind speeds and gusts
        max_wind_speed = max(wind_speeds)
        max_gust = max(wind_gusts)
        wind_ratio = max_gust / max(max_wind_speed, 1)  # Avoid division by zero
        
        if max_gust > 80 or max_wind_speed > 50:
            wind_level = "High"
            wind_probability = min(80, round(max_gust))
            wind_detail = f"High wind risk with maximum gusts of {max_gust:.1f} km/h"
        elif max_gust > 50 or max_wind_speed > 30:
            wind_level = "Medium"
            wind_probability = min(60, round(max_gust / 1.5))
            wind_detail = f"Moderate wind risk with gusts reaching {max_gust:.1f} km/h"
        else:
            wind_level = "Low"
            wind_probability = min(30, round(max_gust / 2))
            wind_detail = "Low wind risk with maximum gusts below damaging levels"
        
        # DROUGHT RISK - based on precipitation and temperature
        precip_deficit = 10 - avg_precip  # Assuming 10mm/day is normal
        temp_excess = avg_max_temp - 20  # Assuming 20°C is a baseline
        drought_factor = precip_deficit * temp_excess
        
        if drought_factor > 50:
            drought_level = "High"
            drought_probability = min(90, round(50 + drought_factor))
            drought_detail = "High drought risk due to rainfall deficit and high temperatures"
        elif drought_factor > 20:
            drought_level = "Medium"
            drought_probability = min(70, round(30 + drought_factor))
            drought_detail = "Moderate drought potential with below-average precipitation"
        else:
            drought_level = "Low"
            drought_probability = max(10, min(30, round(drought_factor)))
            drought_detail = "Low drought risk based on precipitation patterns"
        
        # STORM RISK - based on precipitation probability and wind
        max_precip_prob = max(precip_probs) if precip_probs else 0
        storm_factor = (max_precip_prob / 100) * (max_gust / 50) * 100
        
        if storm_factor > 100:
            storm_level = "High"
            storm_probability = min(90, round(storm_factor / 2))
            storm_detail = "High storm/hail risk with strong precipitation probability and wind"
        elif storm_factor > 50:
            storm_level = "Medium"
            storm_probability = min(60, round(storm_factor / 2))
            storm_detail = "Moderate storm risk with potential for heavy rainfall periods"
        else:
            storm_level = "Low"
            storm_probability = min(30, round(storm_factor / 2))
            storm_detail = "Low storm/hail risk based on current precipitation and wind patterns"
        
        # Calculate premium multiplier based on all risks
        premium_multiplier = 1.0
        for level in [flood_level, wildfire_level, wind_level, drought_level, storm_level]:
            if level == "High":
                premium_multiplier += 0.5
            elif level == "Medium":
                premium_multiplier += 0.2
        
        premium_multiplier = round(premium_multiplier * 10) / 10  # Round to 1 decimal place
        
        return {
            "flood": {
                "level": flood_level,
                "probability": flood_probability,
                "detail": flood_detail
            },
            "wildfire": {
                "level": wildfire_level,
                "probability": wildfire_probability,
                "detail": wildfire_detail
            },
            "wind": {
                "level": wind_level,
                "probability": wind_probability,
                "detail": wind_detail
            },
            "drought": {
                "level": drought_level,
                "probability": drought_probability,
                "detail": drought_detail
            },
            "storm": {
                "level": storm_level,
                "probability": storm_probability,
                "detail": storm_detail
            },
            "premium_multiplier": premium_multiplier,
            "location": {
                "latitude": weather_data.get("latitude"),
                "longitude": weather_data.get("longitude")
            }
        }
    except Exception as e:
        print(f"Error calculating climate risks: {str(e)}")
        # Return fallback risk assessment
        return {
            "flood": {"level": "Low", "probability": 10, "detail": "Unable to assess flood risk"},
            "wildfire": {"level": "Low", "probability": 10, "detail": "Unable to assess wildfire risk"},
            "wind": {"level": "Low", "probability": 10, "detail": "Unable to assess wind risk"},
            "drought": {"level": "Low", "probability": 10, "detail": "Unable to assess drought risk"},
            "storm": {"level": "Low", "probability": 10, "detail": "Unable to assess storm risk"},
            "premium_multiplier": 1.0,
            "location": {
                "latitude": weather_data.get("latitude"),
                "longitude": weather_data.get("longitude")
            },
            "error": str(e)
        }
class PropertyValuationRequest(BaseModel):
    property_id: str
    name: str
    address: str
    property_type: Optional[str] = None
    year_built: Optional[int] = None
    square_footage: Optional[int] = None
    latitude: float
    longitude: float
    current_value: Optional[float] = None
    notes: Optional[str] = None

class ValuationFactor(BaseModel):
    description: str
    impact: float

class PropertyValuationResponse(BaseModel):
    property_id: str
    baselineValue: float
    adjustedValue: float
    factors: List[ValuationFactor]
    analysis: str

# Portfolio Recommendation Models
class PortfolioRequest(BaseModel):
    properties: List[Dict[str, Any]]

class PortfolioRecommendation(BaseModel):
    type: str
    title: str
    description: str
    riskImpact: str
    financialImpact: str
    propertyIds: List[str]
    portfolioAnalysis: str

class PortfolioResponse(BaseModel):
    recommendations: List[PortfolioRecommendation]

# Premium Optimization Models
class PremiumRequest(BaseModel):
    property_id: str
    name: str
    address: str
    property_type: Optional[str] = None
    year_built: Optional[int] = None
    latitude: float
    longitude: float
    current_value: Optional[float] = None
    current_premium: Optional[float] = None

class RiskFactor(BaseModel):
    name: str
    impact: float

class PremiumResponse(BaseModel):
    property_id: str
    standardPremium: float
    recommendedPremium: float
    riskFactors: List[RiskFactor]
    coverageRecommendations: List[str]
    analysis: str
    riskScore: float
    deductibleRecommendation: float
    coverageLimit: float

@app.post("/property-valuation", response_model=PropertyValuationResponse)
async def generate_property_valuation(request: PropertyValuationRequest):
    """Generate AI-powered property valuation that accounts for climate risks"""
    try:
        # Fetch climate risk data for the property location
        climate_risk_url = f"/climate-risks/multi-hazard?lat={request.latitude}&lon={request.longitude}"
        # In a real app, you would use httpx or similar to make this request
        # Here we'll assume the data is already available
        
        # Create prompt for the LLM
        system_prompt = """
        You are an expert in real estate valuation and climate risk assessment. 
        Analyze the provided property details and climate risk information to 
        generate a risk-adjusted property valuation with detailed factors.
        """
        
        human_prompt = f"""
        Property Information:
        - Name: {request.name}
        - Address: {request.address}
        - Type: {request.property_type or 'Residential'}
        - Year Built: {request.year_built or 'Unknown'}
        - Square Footage: {request.square_footage or 'Unknown'}
        - Current Estimated Value: ${request.current_value or 'Unknown'}
        - Location: Latitude {request.latitude}, Longitude {request.longitude}
        - Notes: {request.notes or 'None'}
        
        Current climate risk assessment indicates this property has exposure to various hazards.
        
        Based on this information:
        1. Estimate a baseline property value (without climate risk factors)
        2. Calculate a risk-adjusted value considering climate hazards
        3. Identify 3-5 specific factors affecting the valuation (with percentage impact)
        4. Provide a brief analysis explaining the valuation adjustment
        
        Return ONLY valid JSON in this format:
        {{
          "property_id": "{request.property_id}",
          "baselineValue": 500000,
          "adjustedValue": 475000,
          "factors": [
            {{ "description": "Flood risk in the area", "impact": -5.2 }},
            {{ "description": "Recent climate resilience improvements", "impact": 3.7 }}
          ],
          "analysis": "This property shows vulnerability to several climate hazards..."
        }}
        """
        
        # Call the LLM
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        llm_response = llm.invoke(messages)
        
        # Extract and parse JSON from LLM response
        try:
            # Look for JSON within the response
            response_text = llm_response.content
            
            # Try to find JSON block if present
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            
            if json_match:
                result = json.loads(json_match.group(1).strip())
            else:
                # If no JSON block markers, try to parse the whole response
                result = json.loads(response_text.strip())
                
            return PropertyValuationResponse(**result)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating property valuation: {str(e)}")

@app.post("/portfolio-recommendations", response_model=PortfolioResponse)
async def generate_portfolio_recommendations(request: PortfolioRequest):
    """Generate AI-powered portfolio optimization recommendations"""
    try:
        # Prepare the property data for analysis
        properties_text = ""
        for i, prop in enumerate(request.properties[:10]):  # Limit to 10 properties for context length
            properties_text += f"""
            Property {i+1}:
            - Name: {prop.get('name', 'Unknown')}
            - Address: {prop.get('address', 'Unknown')}
            - Type: {prop.get('property_type', 'Residential')}
            - Location: Lat {prop.get('latitude', 'Unknown')}, Lon {prop.get('longitude', 'Unknown')}
            - Current Value: ${prop.get('current_value', 'Unknown')}
            - ID: {prop.get('id', 'Unknown')}
            """
        
        system_prompt = """
        You are an expert in real estate portfolio management with special expertise in climate risk. 
        Analyze the provided property portfolio and generate strategic recommendations to optimize 
        the portfolio for climate resilience while maintaining financial performance.
        """
        
        human_prompt = f"""
        Portfolio Information:
        {properties_text}
        
        Based on these properties, provide strategic recommendations to:
        1. Reduce overall climate risk exposure
        2. Optimize financial performance
        3. Balance the portfolio across different risk categories
        
        For each recommendation, specify:
        - Type (divest, invest, modify)
        - Title (short, action-oriented)
        - Description (detailed explanation)
        - Risk impact (how it affects the portfolio's risk profile)
        - Financial impact (potential costs and returns)
        - Related property IDs (from the portfolio)
        
        Also provide an overall portfolio analysis.
        
        Return ONLY valid JSON in this format:
        {{
          "recommendations": [
            {{
              "type": "divest",
              "title": "Divest high-risk coastal properties",
              "description": "Consider selling properties in low-lying coastal areas...",
              "riskImpact": "Would reduce overall portfolio risk score by 18%",
              "financialImpact": "May result in a 5-7% reduction in short-term returns...",
              "propertyIds": ["property_id_1", "property_id_2"],
              "portfolioAnalysis": "Your portfolio of X properties shows..."
            }},
            ...
          ]
        }}
        """
        
        # Call the LLM
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        llm_response = llm.invoke(messages)
        
        # Extract and parse JSON from LLM response
        try:
            # Look for JSON within the response
            response_text = llm_response.content
            
            # Try to find JSON block if present
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            
            if json_match:
                result = json.loads(json_match.group(1).strip())
            else:
                # If no JSON block markers, try to parse the whole response
                result = json.loads(response_text.strip())
                
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating portfolio recommendations: {str(e)}")

@app.post("/premium-recommendation", response_model=PremiumResponse)
async def generate_premium_recommendation(request: PremiumRequest):
    """Generate AI-powered insurance premium recommendation"""
    try:
        # Fetch climate risk data for the property location
        climate_risk_url = f"/climate-risks/multi-hazard?lat={request.latitude}&lon={request.longitude}"
        # In a real app, you would use httpx or similar to make this request
        
        system_prompt = """
        You are an expert in insurance underwriting and climate risk assessment. 
        Analyze the provided property details and climate risk information to 
        generate a risk-adjusted insurance premium recommendation with detailed factors.
        """
        
        human_prompt = f"""
        Property Information:
        - Name: {request.name}
        - Address: {request.address}
        - Type: {request.property_type or 'Residential'}
        - Year Built: {request.year_built or 'Unknown'}
        - Current Value: ${request.current_value or 'Unknown'}
        - Current Premium: ${request.current_premium or 'Unknown'}
        - Location: Latitude {request.latitude}, Longitude {request.longitude}
        
        Current climate risk assessment indicates this property has exposure to various hazards.
        
        Based on this information:
        1. Estimate a standard market premium (without specific risk factors)
        2. Calculate a risk-adjusted premium considering climate hazards
        3. Identify 3-5 specific risk factors affecting the premium (with percentage impact)
        4. Provide 2-3 coverage recommendations
        5. Suggest appropriate deductible and coverage limits
        6. Assign an overall risk score (1-10)
        7. Provide a brief analysis explaining the premium adjustment
        
        Return ONLY valid JSON in this format:
        {{
          "property_id": "{request.property_id}",
          "standardPremium": 2500,
          "recommendedPremium": 2750,
          "riskFactors": [
            {{ "name": "Flood zone proximity", "impact": 12.5 }},
            {{ "name": "Building construction type", "impact": -7.3 }}
          ],
          "coverageRecommendations": [
            "Increase flood coverage limit due to elevated risk",
            "Add extended replacement cost endorsement"
          ],
          "analysis": "Based on climate risk assessment...",
          "riskScore": 6.5,
          "deductibleRecommendation": 2500,
          "coverageLimit": 500000
        }}
        """
        
        # Call the LLM
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        llm_response = llm.invoke(messages)
        
        # Extract and parse JSON from LLM response
        try:
            # Look for JSON within the response
            response_text = llm_response.content
            
            # Try to find JSON block if present
            import re
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            
            if json_match:
                result = json.loads(json_match.group(1).strip())
            else:
                # If no JSON block markers, try to parse the whole response
                result = json.loads(response_text.strip())
                
            return PremiumResponse(**result)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating premium recommendation: {str(e)}")

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)