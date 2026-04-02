from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import glob
from pathlib import Path
import json
from utils.core import generate_tutorial, DEFAULT_INCLUDE_PATTERNS, DEFAULT_EXCLUDE_PATTERNS
from utils.crawl_local_files import crawl_local_files
import uuid
import asyncio
from datetime import datetime
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
app = FastAPI(title="Tutorial Generator API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Serve static files directly from dist folder (if it exists)
if os.path.exists("dist/assets"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
# Store for background tasks
generation_tasks = {}

class TutorialRequest(BaseModel):
    repo_url: Optional[str] = None
    local_dir: Optional[str] = None
    project_name: Optional[str] = None
    github_token: Optional[str] = None
    output_dir: str = "output"
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    max_file_size: int = 100000
    language: str = "english"
    use_cache: bool = True
    max_abstraction_num: int = 10
    generate_readme: bool = False

class TutorialResponse(BaseModel):
    task_id: str
    status: str
    message: str
    final_output_dir: Optional[str] = None
    error: Optional[str] = None

class DirectoryValidationRequest(BaseModel):
    directory_path: str
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    max_file_size: int = 100000

class DirectoryValidationResponse(BaseModel):
    exists: bool
    totalFiles: int
    codeFiles: int
    sampleFiles: List[str]
    error: Optional[str] = None

class MarkdownFile(BaseModel):
    filename: str
    path: str
    content: str
    size: int
    modified: str

def run_tutorial_generation(task_id: str, request: TutorialRequest):
    """Background task to run tutorial generation"""
    try:
        generation_tasks[task_id]["status"] = "running"
        generation_tasks[task_id]["message"] = "Generating tutorial..."
        
        # Convert patterns to sets if provided
        include_patterns = set(request.include_patterns) if request.include_patterns else DEFAULT_INCLUDE_PATTERNS
        exclude_patterns = set(request.exclude_patterns) if request.exclude_patterns else DEFAULT_EXCLUDE_PATTERNS
        
        result = generate_tutorial(
            repo_url=request.repo_url,
            local_dir=request.local_dir,
            project_name=request.project_name,
            github_token=request.github_token,
            output_dir=request.output_dir,
            include_patterns=include_patterns,
            exclude_patterns=exclude_patterns,
            max_file_size=request.max_file_size,
            language=request.language,
            use_cache=request.use_cache,
            max_abstraction_num=request.max_abstraction_num,
            generate_readme=request.generate_readme
        )
        
        generation_tasks[task_id]["status"] = "completed"
        generation_tasks[task_id]["message"] = "Tutorial generation completed successfully"
        generation_tasks[task_id]["final_output_dir"] = result.get("final_output_dir")
        generation_tasks[task_id]["result"] = result
        
    except Exception as e:
        generation_tasks[task_id]["status"] = "error"
        generation_tasks[task_id]["message"] = f"Error during tutorial generation: {str(e)}"
        generation_tasks[task_id]["error"] = str(e)

@app.post("/validate-directory", response_model=DirectoryValidationResponse)
async def validate_directory(request: DirectoryValidationRequest):
    """
    Validate a local directory and return file statistics
    """
    try:
        directory_path = request.directory_path.strip()
        
        # Check if directory exists
        if not os.path.exists(directory_path):
            return DirectoryValidationResponse(
                exists=False,
                totalFiles=0,
                codeFiles=0,
                sampleFiles=[],
                error="Directory does not exist"
            )
        
        if not os.path.isdir(directory_path):
            return DirectoryValidationResponse(
                exists=False,
                totalFiles=0,
                codeFiles=0,
                sampleFiles=[],
                error="Path is not a directory"
            )
        
        # Use crawl_local_files to get actual file list
        include_patterns = set(request.include_patterns) if request.include_patterns else DEFAULT_INCLUDE_PATTERNS
        exclude_patterns = set(request.exclude_patterns) if request.exclude_patterns else DEFAULT_EXCLUDE_PATTERNS
        
        files_data = crawl_local_files(
            directory_path,
            include_patterns=include_patterns,
            exclude_patterns=exclude_patterns,
            max_file_size=request.max_file_size
        )
        
        # Extract file paths from the returned dict
        files_list = list(files_data.get("files", {}).keys())
        
        # Count code files (files with code extensions)
        code_extensions = {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', 
                          '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala'}
        code_files = [f for f in files_list if any(f.endswith(ext) for ext in code_extensions)]
        
        # Get sample files (first 5 basenames only)
        sample_files = [os.path.basename(f) for f in files_list[:5]]
        
        return DirectoryValidationResponse(
            exists=True,
            totalFiles=len(files_list),
            codeFiles=len(code_files),
            sampleFiles=sample_files,
            error=None
        )
        
    except Exception as e:
        return DirectoryValidationResponse(
            exists=False,
            totalFiles=0,
            codeFiles=0,
            sampleFiles=[],
            error=f"Error validating directory: {str(e)}"
        )

@app.post("/generate-tutorial", response_model=TutorialResponse)
async def generate_tutorial_endpoint(request: TutorialRequest, background_tasks: BackgroundTasks):
    """
    Start tutorial generation process in the background
    """
    # Validate input
    if not request.repo_url and not request.local_dir:
        raise HTTPException(status_code=400, detail="Either repo_url or local_dir must be provided")
    
    if request.repo_url and request.local_dir:
        raise HTTPException(status_code=400, detail="Only one of repo_url or local_dir should be provided")
    
    # Generate unique task ID
    task_id = str(uuid.uuid4())
    
    # Initialize task status
    generation_tasks[task_id] = {
        "status": "queued",
        "message": "Tutorial generation queued",
        "created_at": datetime.now(),
        "final_output_dir": None,
        "error": None,
        "result": None
    }
    
    # Start background task
    background_tasks.add_task(run_tutorial_generation, task_id, request)
    
    return TutorialResponse(
        task_id=task_id,
        status="queued",
        message="Tutorial generation started",
        final_output_dir=None
    )

@app.get("/tutorial-status/{task_id}", response_model=TutorialResponse)
async def get_tutorial_status(task_id: str):
    """
    Get the status of a tutorial generation task
    """
    if task_id not in generation_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = generation_tasks[task_id]
    return TutorialResponse(
        task_id=task_id,
        status=task["status"],
        message=task["message"],
        final_output_dir=task.get("final_output_dir"),
        error=task.get("error")
    )

@app.get("/list-tutorials")
async def list_tutorials():
    """
    List all available tutorial directories in the output folder
    """
    try:
        output_base = "output"
        if not os.path.exists(output_base):
            return {"tutorials": []}
        
        tutorials = []
        for item in os.listdir(output_base):
            item_path = os.path.join(output_base, item)
            if os.path.isdir(item_path):
                # Check if it contains markdown files
                md_files = glob.glob(os.path.join(item_path, "*.md"))
                if md_files:
                    tutorials.append({
                        "name": item,
                        "path": item_path,
                        "markdown_files": len(md_files),
                        "created": datetime.fromtimestamp(os.path.getctime(item_path)).isoformat()
                    })
        
        return {"tutorials": tutorials}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing tutorials: {str(e)}")

@app.get("/tutorial/{tutorial_name}/files")
async def list_tutorial_files(tutorial_name: str):
    """
    List all markdown files in a specific tutorial directory
    """
    try:
        tutorial_path = os.path.join("output", tutorial_name)
        if not os.path.exists(tutorial_path):
            raise HTTPException(status_code=404, detail="Tutorial not found")
        
        md_files = []
        for md_file in glob.glob(os.path.join(tutorial_path, "*.md")):
            file_path = Path(md_file)
            stat = file_path.stat()
            md_files.append({
                "filename": file_path.name,
                "path": str(file_path),
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        
        # Sort by filename
        md_files.sort(key=lambda x: x["filename"])
        
        return {"files": md_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

@app.get("/tutorial/{tutorial_name}/file/{filename}", response_model=MarkdownFile)
async def get_markdown_file(tutorial_name: str, filename: str):
    """
    Get the content of a specific markdown file
    """
    try:
        file_path = os.path.join("output", tutorial_name, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        if not filename.endswith('.md'):
            raise HTTPException(status_code=400, detail="Only markdown files are supported")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        stat = os.stat(file_path)
        
        return MarkdownFile(
            filename=filename,
            path=file_path,
            content=content,
            size=stat.st_size,
            modified=datetime.fromtimestamp(stat.st_mtime).isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

@app.delete("/tutorial/{tutorial_name}")
async def delete_tutorial(tutorial_name: str):
    """
    Delete a tutorial directory and all its contents
    """
    try:
        tutorial_path = os.path.join("output", tutorial_name)
        if not os.path.exists(tutorial_path):
            raise HTTPException(status_code=404, detail="Tutorial not found")
        
        import shutil
        shutil.rmtree(tutorial_path)
        
        return {"message": f"Tutorial '{tutorial_name}' deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting tutorial: {str(e)}")

@app.get("/check")
async def root():
    """
    API root endpoint
    """
    return {
        "message": "Tutorial Generator API",
        "version": "1.0.0",
        "endpoints": {
            "POST /generate-tutorial": "Start tutorial generation",
            "GET /tutorial-status/{task_id}": "Get generation status",
            "GET /list-tutorials": "List all tutorials",
            "GET /tutorial/{name}/files": "List files in tutorial",
            "GET /tutorial/{name}/file/{filename}": "Get file content",
            "DELETE /tutorial/{name}": "Delete tutorial"
        }
    }
# Catch-all handler for React Router (SPA)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # If it's an API route, let FastAPI handle it normally
    if full_path.startswith("api/"):
        return {"error": "API endpoint not found"}
    
    # Check if it's a file in dist directory
    file_path = f"dist/{full_path}"
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # For all other routes, serve index.html (React Router will handle routing)
    return FileResponse("dist/index.html")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)