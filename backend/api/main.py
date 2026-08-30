import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import query, export
from backend.api.jobs import jobs

# Load environment variables from backend/.env before anything else
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("scholargraph.api.main")

app = FastAPI(
    title="ScholarGraph API",
    description="Agentic AI system for automated literature review and gap discovery",
    version="1.0"
)

# CORS configuration for local React development frontend
# NOTE: allow_origins=["*"] combined with allow_credentials=True is invalid
# per the CORS spec — browsers will refuse credentialed requests against a
# wildcard origin. Since this API doesn't rely on cookies/credentials, we
# turn credentials off instead of enumerating explicit origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(query.router, tags=["Query & Pipeline"])
app.include_router(export.router, tags=["Report Export"])

@app.get("/status/{job_id}")
def get_job_status(job_id: str):
    """
    Polls the live execution progress of the 6 agents in the pipeline.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")
        
    job = jobs[job_id]
    state = job["state"]
    
    # Extract agent status from state. Now that the pipeline is executed via
    # pipeline_app.stream() (see execute_pipeline in routes/query.py), the
    # job's state — and therefore agent_status — is updated after every
    # single agent completes, so this reflects real, live progress instead
    # of a guess.
    agent_status = {}
    if state and "agent_status" in state:
        agent_status = state["agent_status"]
    else:
        # Job accepted but the background task hasn't written state yet.
        agent_status = {
            "planner": "pending",
            "search": "pending",
            "extraction": "pending",
            "synthesis": "pending",
            "graph_gap": "pending",
            "report": "pending"
        }
            
    return {
        "status": job["status"],
        "agent_status": agent_status,
        "error": job["error"]
    }

@app.get("/health")
def health_check():
    """
    Basic health check.
    """
    return {"status": "healthy"}
