# app.py
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import asyncio
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging

# Import the analysis functions from your existing module
# In a real app, you'd properly restructure these imports
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
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
database_name = "climate_risk_intelligence"

# Connect to MongoDB
client = AsyncIOMotorClient(MONGODB_URL)
db = client[database_name]

# Initialize scheduler
scheduler = AsyncIOScheduler()

# Pydantic models for requests and responses
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class NewsSourceModel(BaseModel):
    name: str
    url: str
    type: str
    
class ArticleBase(BaseModel):
    source: str
    source_type: str
    title: str
    url: str
    date: str
    content: str
    
class ArticleModel(ArticleBase):
    id: Optional[PyObjectId] = None
    insurance_relevance: Optional[float] = None
    climate_relevance: Optional[float] = None
    total_relevance: Optional[float] = None
    created_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {ObjectId: str}
        schema_extra = {
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

class StructuredSummaryModel(BaseModel):
    id: Optional[PyObjectId] = None
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
    
    class Config:
        json_encoders = {ObjectId: str}

class ReportModel(BaseModel):
    id: Optional[PyObjectId] = None
    executive_summary: str
    key_developments: str
    insurance_domain_impacts: str
    regional_insights: str
    regulatory_landscape: str
    business_implications: str
    recommended_actions: str
    generated_date: str
    sources: List[str]
    article_count: int
    created_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {ObjectId: str}

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

# Helper function to convert MongoDB documents to Pydantic models
def document_helper(document) -> dict:
    if document:
        document["id"] = str(document.pop("_id"))
    return document

# Background tasks
async def run_analysis_pipeline(task_id: str, custom_sources: List[Dict[str, Any]] = None):
    """Run the full analysis pipeline as a background task"""
    try:
        logger.info(f"Starting analysis pipeline for task {task_id}")
        
        # Step 1: Scrape news sources
        sources_to_use = custom_sources if custom_sources else NEWS_SOURCES
        articles = await asyncio.to_thread(scrape_news_sources, sources_to_use)
        logger.info(f"Scraped {len(articles)} articles")
        
        # Store raw articles in MongoDB
        for article in articles:
            article["created_at"] = datetime.now()
            await db.articles.insert_one(article)
        
        # Step 2: Analyze relevance
        relevant_articles = await asyncio.to_thread(analyze_insurance_relevance, articles)
        logger.info(f"Found {len(relevant_articles)} relevant articles")
        
        # Update articles with relevance scores
        for article in relevant_articles:
            query = {"url": article["url"]}
            update = {
                "$set": {
                    "insurance_relevance": article.get("insurance_relevance", 0),
                    "climate_relevance": article.get("climate_relevance", 0),
                    "total_relevance": article.get("total_relevance", 0)
                }
            }
            await db.articles.update_one(query, update)
        
        # Step 3: Extract structured information
        structured_info = await asyncio.to_thread(extract_structured_info, relevant_articles)
        logger.info(f"Extracted structured information from {len(structured_info)} articles")
        
        # Store structured summaries in MongoDB
        for info in structured_info:
            info["created_at"] = datetime.now()
            await db.structured_summaries.insert_one(info)
        
        # Step 4: Generate reports
        report_data = await asyncio.to_thread(generate_summary_reports, structured_info)
        logger.info("Generated summary report")
        
        # Transform the report data to match our model
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
            "created_at": datetime.now()
        }
        
        # Store the report in MongoDB
        await db.reports.insert_one(report)
        
        # Update task status
        await db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"status": "completed", "completed_at": datetime.now()}}
        )
        
        logger.info(f"Analysis pipeline completed for task {task_id}")
        
    except Exception as e:
        logger.error(f"Error in analysis pipeline for task {task_id}: {str(e)}")
        # Update task status with error
        await db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"status": "failed", "error": str(e), "completed_at": datetime.now()}}
        )

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
        summaries.append(document_helper(document))
    
    return summaries

@app.get("/reports", response_model=List[ReportModel])
async def get_reports(skip: int = 0, limit: int = 10):
    """Get summary reports"""
    reports = []
    cursor = db.reports.find().sort("created_at", -1).skip(skip).limit(limit)
    
    async for document in cursor:
        reports.append(document_helper(document))
    
    return reports

@app.get("/reports/{report_id}", response_model=ReportModel)
async def get_report(report_id: str):
    """Get a specific report by ID"""
    try:
        report = await db.reports.find_one({"_id": ObjectId(report_id)})
        if report:
            return document_helper(report)
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    except:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")

@app.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
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
    recent_report = document_helper(recent_report) if recent_report else None
    
    return {
        "total_articles": total_articles,
        "total_reports": total_reports,
        "source_distribution": source_distribution,
        "domain_distribution": domain_distribution,
        "risk_factor_frequency": risk_factor_frequency,
        "recent_report": recent_report
    }

@app.post("/analysis/run", response_model=AnalysisResponse, status_code=status.HTTP_202_ACCEPTED)
async def run_analysis(
    analysis_request: AnalysisRequest,
    background_tasks: BackgroundTasks
):
    """Start an analysis pipeline run"""
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
        custom_sources = [source.dict() for source in analysis_request.news_sources]
    
    # Run the pipeline in the background
    background_tasks.add_task(run_analysis_pipeline, task_id, custom_sources)
    
    return {
        "task_id": task_id,
        "message": "Analysis pipeline started"
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
    except:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

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
        
        domain_scores.append({
            "domain": domain,
            "risk_score": round(base_score, 1),
            "contributing_factors": top_factors,
            "trend": trend
        })
    
    return domain_scores

@app.get("/reports/latest", response_model=ReportModel)
async def get_latest_report():
    """Get the most recent climate risk report"""
    report = await db.reports.find_one({}, sort=[("created_at", -1)])
    
    if report:
        return document_helper(report)
    
    raise HTTPException(status_code=404, detail="No reports found")

# Startup and shutdown events
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
    
    # Start the scheduler
    scheduler.add_job(scheduled_daily_analysis, "cron", hour=1, minute=0)  # Run daily at 1:00 AM
    scheduler.start()
    logger.info("Scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    # Shutdown the scheduler
    scheduler.shutdown()
    # Close MongoDB connection
    client.close()
    logger.info("API shutdown complete")

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)