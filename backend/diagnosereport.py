# diagnostic_report.py
# Add this script to manually diagnose and fix report generation issues

import asyncio
import logging
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import json
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("report-diagnostics")

# MongoDB configuration - update with your actual connection string
MONGODB_URL = "mongodb://localhost:27017"
database_name = "climate_risk_intelligence"

# Connect to MongoDB
client = AsyncIOMotorClient(MONGODB_URL)
db = client[database_name]

async def diagnose_report_generation():
    """Diagnose issues with report generation"""
    logger.info("Starting report generation diagnostics")
    
    # 1. Check the most recent task
    logger.info("Checking most recent task...")
    most_recent_task = await db.tasks.find_one({}, sort=[("created_at", -1)])
    
    if not most_recent_task:
        logger.error("No tasks found in database")
        return
        
    task_id = most_recent_task.get("_id")
    task_status = most_recent_task.get("status")
    task_created = most_recent_task.get("created_at")
    task_error = most_recent_task.get("error", "None")
    
    logger.info(f"Most recent task: {task_id}")
    logger.info(f"Status: {task_status}")
    logger.info(f"Created at: {task_created}")
    logger.info(f"Error: {task_error}")
    
    # 2. Check if there are any reports created after this task
    logger.info("Checking for reports created after this task...")
    reports_after_task = await db.reports.count_documents({"created_at": {"$gte": task_created}})
    logger.info(f"Found {reports_after_task} reports created after this task")
    
    if reports_after_task == 0:
        logger.warning("No reports were created after the task started")
    
    # 3. Check the total number of structured summaries
    summaries_count = await db.structured_summaries.count_documents({})
    logger.info(f"Total structured summaries in database: {summaries_count}")
    
    # 4. Verify that summaries would be retrieved by vector search
    # This is a manual check - just log some metadata about available summaries
    recent_summaries = []
    async for summary in db.structured_summaries.find().sort("created_at", -1).limit(5):
        if "_id" in summary:
            summary["id"] = str(summary.pop("_id"))
        recent_summaries.append(summary)
        
    if recent_summaries:
        logger.info(f"Most recent summary: {recent_summaries[0].get('key_event', 'Unknown')}")
        domains = set()
        for summary in recent_summaries:
            domains.update(summary.get("insurance_domains", []))
        logger.info(f"Insurance domains in recent summaries: {domains}")
    else:
        logger.warning("No structured summaries found")
    
    # 5. Check if vector index exists
    import os
    if os.path.exists("summaries_index"):
        logger.info("summaries_index directory exists")
        # You could add more checks here to verify the index is valid
    else:
        logger.warning("summaries_index directory not found")
    
    # 6. Check latest reports to see if they're valid
    latest_report = await db.reports.find_one({}, sort=[("created_at", -1)])
    if latest_report:
        if "_id" in latest_report:
            latest_report["id"] = str(latest_report.pop("_id"))
        logger.info(f"Latest report ID: {latest_report.get('id')}")
        logger.info(f"Report date: {latest_report.get('generated_date')}")
        
        # Check for essential fields
        essential_fields = ["executive_summary", "key_developments", "insurance_domain_impacts"]
        missing_fields = [field for field in essential_fields if field not in latest_report]
        
        if missing_fields:
            logger.error(f"Latest report is missing essential fields: {missing_fields}")
        else:
            logger.info("Latest report has all essential fields")
            
        # Check for empty or very short content
        for field in essential_fields:
            if field in latest_report:
                content_length = len(str(latest_report.get(field, "")))
                if content_length < 20:
                    logger.warning(f"Field '{field}' has very short content: {content_length} chars")
                else:
                    logger.info(f"Field '{field}' length: {content_length} chars")
    else:
        logger.warning("No reports found in database")
    
    # 7. Generate a manual fix if necessary
    if task_status == "failed" or reports_after_task == 0:
        logger.info("Attempting to create a manual fallback report...")
        await create_fallback_report()

async def create_fallback_report():
    """Create a fallback report to recover from failed report generation"""
    logger.info("Creating fallback report")
    
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
        "executive_summary": "This fallback report was automatically generated to recover from a report generation failure. It provides a summary of recent climate risk developments affecting the insurance industry based on available structured data.",
        
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
        "_fallback": True  # Flag indicating this is a fallback report
    }
    
    # Insert the fallback report
    try:
        result = await db.reports.insert_one(fallback_report)
        logger.info(f"Successfully created fallback report with ID: {result.inserted_id}")
    except Exception as e:
        logger.error(f"Error creating fallback report: {str(e)}")

# Run the diagnostic function
if __name__ == "__main__":
    asyncio.run(diagnose_report_generation())