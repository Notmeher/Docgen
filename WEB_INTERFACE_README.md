# Tutorial Generator - Web Interface

This project provides both a command-line interface and a web-based interface for generating comprehensive tutorials from GitHub repositories or local codebases.

## 🌟 Features

### Command Line Interface
- Generate tutorials from GitHub repositories or local directories
- Customizable file inclusion/exclusion patterns
- Multiple language support
- LLM caching for faster processing
- Configurable abstraction levels

### Web Interface
- **FastAPI Backend**: RESTful API for tutorial generation
- **Streamlit Frontend**: Interactive web interface for managing tutorials
- **Background Processing**: Asynchronous tutorial generation with progress monitoring
- **File Management**: View, browse, and delete generated tutorials
- **Real-time Status**: Live updates on generation progress

##  Quick Start

### Prerequisites

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up Environment Variables**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # For Windows: copy .env.example .env
   ```
   
   Edit `.env` and add your API keys (see `.env.example` for all options):
   ```env
   # Azure OpenAI (Default)
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_OPENAI_API_KEY=your-api-key
   AZURE_OPENAI_DEPLOYMENT=your-deployment
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   
   # Or Google Gemini
   # GEMINI_API_KEY=your-api-key
   
   # Optional: GitHub token for private repos
   GITHUB_TOKEN=your-github-token
   ```
   
   **Note**: The active LLM provider is configured in `utils/call_llm.py`. See the main README.md for switching providers.

### Running the Web Interface

#### Option 1: Easy Startup Script
```bash
# Windows
start_web_interface.bat

# Or using Python directly
python start_web_interface.py
```

#### Option 2: Manual Startup
Start the FastAPI server:
```bash
python main.py
# Or using uvicorn directly:
# python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

In another terminal, start the Streamlit app:
```bash
streamlit run streamlit_app.py --server.port 8501
```

### Accessing the Application

- **Streamlit Frontend**: http://localhost:8501
- **FastAPI Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

##  Usage

### Web Interface

1. **Navigate to the Streamlit app** at http://localhost:8501
2. **Generate Tutorial**: 
   - Choose between GitHub repository or local directory
   - Configure generation parameters
   - Start the generation process
3. **Monitor Progress**: Track real-time generation status
4. **View Tutorials**: Browse and read generated markdown files
5. **Manage Tutorials**: Delete tutorials you no longer need

### Command Line Interface

```bash
# Generate from GitHub repository
python main.py --repo https://github.com/owner/repo --output my_tutorials

# Generate from local directory
python main.py --dir /path/to/local/project --language spanish

# Advanced options
python main.py --repo https://github.com/owner/repo \
               --include "*.py" "*.js" \
               --exclude "test*" "docs/*" \
               --max-size 200000 \
               --max-abstractions 15 \
               --no-cache
```

## 🔧 API Endpoints

### FastAPI Endpoints

- `POST /generate-tutorial`: Start tutorial generation
- `GET /tutorial-status/{task_id}`: Check generation progress
- `GET /list-tutorials`: List all available tutorials
- `GET /tutorial/{name}/files`: List files in a tutorial
- `GET /tutorial/{name}/file/{filename}`: Get file content
- `DELETE /tutorial/{name}`: Delete a tutorial
- `GET /`: API information and health check

### Example API Usage

```python
import requests

# Start tutorial generation
response = requests.post("http://localhost:8000/generate-tutorial", json={
    "repo_url": "https://github.com/owner/repo",
    "language": "english",
    "use_cache": True
})

task_id = response.json()["task_id"]

# Check status
status_response = requests.get(f"http://localhost:8000/tutorial-status/{task_id}")
print(status_response.json())
```

## 📁 Project Structure

```
├── main.py                 # FastAPI backend server & CLI interface
├── streamlit_app.py        # Streamlit frontend application
├── flow.py                 # Tutorial generation flow logic
├── nodes.py                # Processing nodes for the flow
├── start_web_interface.py  # Startup script for web interface
├── start_web_interface.bat # Windows batch startup script
├── requirements.txt        # Python dependencies
├── output/                 # Generated tutorial directories
│   └── [tutorial-name]/
│       ├── index.md
│       ├── 01_chapter.md
│       └── ...
└── utils/                  # Utility modules
    ├── call_llm.py
    └── ...
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub personal access token | Optional* |
| `OPENAI_API_KEY` | OpenAI API key | Required** |
| `GOOGLE_API_KEY` | Google AI API key | Required** |

*Required for private repositories or to avoid rate limits
**Required based on your chosen LLM provider

### Generation Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `max_file_size` | Maximum file size in bytes | 100,000 |
| `max_abstractions` | Maximum number of abstractions | 10 |
| `language` | Tutorial language | english |
| `use_cache` | Enable LLM response caching | true |
| `include_patterns` | File patterns to include | Common code files |
| `exclude_patterns` | File patterns to exclude | Test/build directories |

## 🔍 Troubleshooting

### Common Issues

1. **API Connection Error**
   - Ensure FastAPI server is running on port 8000
   - Check firewall settings

2. **Module Import Errors**
   - Install all dependencies: `pip install -r requirements.txt`
   - Ensure you're using the correct Python environment

3. **Generation Failures**
   - Check API keys in `.env` file
   - Verify repository URL or local directory path
   - Check logs in the `logs/` directory

4. **Performance Issues**
   - Enable caching for faster subsequent runs
   - Adjust `max_file_size` to exclude large files
   - Use appropriate `max_abstractions` setting

### Logs

Check the following for debugging:
- `logs/llm_calls_*.log`: LLM interaction logs
- Console output from FastAPI server
- Streamlit app console for frontend issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review existing issues in the repository
3. Create a new issue with detailed information about your problem

---

**Happy Tutorial Generating! 🎉**