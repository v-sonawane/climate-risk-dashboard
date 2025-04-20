import asyncio
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_core.runnables import RunnableLambda

# Import existing tools and generator functions
from api import (
    scrape_news_sources,
    analyze_insurance_relevance,
    extract_structured_info,
    generate_summary_reports
)
from app import (
    generate_regulatory_frameworks,
    generate_esg_impacts,
    generate_underwriting_challenges,
    generate_coverage_gaps,
)

# Define the joint pipeline state
typical_keys = [
    'raw_articles', 'relevant_articles',
    'frameworks', 'esg_impacts',
    'underwriting_challenges', 'coverage_gaps',
    'structured_info', 'summary_report'
]

class PipelineState(TypedDict):
    raw_articles: List[Dict[str, Any]]
    relevant_articles: List[Dict[str, Any]]
    frameworks: List[Dict[str, Any]]
    esg_impacts: List[Dict[str, Any]]
    underwriting_challenges: List[Dict[str, Any]]
    coverage_gaps: List[Dict[str, Any]]
    structured_info: List[Dict[str, Any]]
    summary_report: Dict[str, Any]

# Node: fetch raw news articles
fetch_articles = RunnableLambda(
    lambda _: {"raw_articles": scrape_news_sources.invoke({})}
)

# Node: filter for insurance relevance
analyze_relevance = RunnableLambda(
    lambda state: {"relevant_articles": analyze_insurance_relevance.invoke({"articles": state["raw_articles"]})}
)

# Node: extract structured summaries
def _extract_struct(state: PipelineState) -> Dict[str, Any]:
    info = extract_structured_info.invoke({"articles": state["relevant_articles"]})
    return {"structured_info": info}
structured_info_node = RunnableLambda(_extract_struct)

# Node: generate human-readable summary report
def _gen_report(state: PipelineState) -> Dict[str, Any]:
    report = generate_summary_reports.invoke({"structured_info": state["structured_info"]})
    return {"summary_report": report}
summary_node = RunnableLambda(_gen_report)

# Wrappers for async structured info generators
def _gen_frameworks(state: PipelineState) -> Dict[str, Any]:
    frameworks = asyncio.run(generate_regulatory_frameworks(state["relevant_articles"]))
    return {"frameworks": frameworks}

def _gen_esg(state: PipelineState) -> Dict[str, Any]:
    esg = asyncio.run(generate_esg_impacts(state["relevant_articles"]))
    return {"esg_impacts": esg}

def _gen_challenges(state: PipelineState) -> Dict[str, Any]:
    challenges = asyncio.run(generate_underwriting_challenges(state["relevant_articles"]))
    return {"underwriting_challenges": challenges}

def _gen_gaps(state: PipelineState) -> Dict[str, Any]:
    gaps = asyncio.run(generate_coverage_gaps(state["relevant_articles"]))
    return {"coverage_gaps": gaps}

generate_frameworks_node = RunnableLambda(_gen_frameworks)
generate_esg_node = RunnableLambda(_gen_esg)
generate_challenges_node = RunnableLambda(_gen_challenges)
generate_gaps_node = RunnableLambda(_gen_gaps)

# Build the state graph
graph = StateGraph(PipelineState)

# Add nodes
graph.add_node("scrape", fetch_articles)
graph.add_node("relevance", analyze_relevance)
graph.add_node("frameworks", generate_frameworks_node)
graph.add_node("esg", generate_esg_node)
graph.add_node("challenges", generate_challenges_node)
graph.add_node("gaps", generate_gaps_node)
graph.add_node("structured_info", structured_info_node)
graph.add_node("summary", summary_node)

# Define edges for sequencing and parallelism
graph.set_entry_point("scrape")
# After scraping, analyze relevance
graph.add_edge("scrape", "relevance")
# After relevance, branch into data generators
for next_node in ["frameworks", "esg", "challenges", "gaps", "structured_info"]:
    graph.add_edge("relevance", next_node)
# After structured info, generate summary
graph.add_edge("structured_info", "summary")

# Terminal edges for leaf nodes
for end_node in ["frameworks", "esg", "challenges", "gaps", "summary"]:
    graph.add_edge(end_node, END)

# Compile the pipeline
climate_pipeline = graph.compile()

def run_climate_pipeline() -> Dict[str, Any]:
    """
    Invoke the LangGraph-based climate risk data pipeline.
    Returns a dict containing all results: raw_articles, relevant_articles,
    frameworks, esg_impacts, underwriting_challenges, coverage_gaps,
    structured_info, and summary_report.
    """
    return climate_pipeline.invoke({})
