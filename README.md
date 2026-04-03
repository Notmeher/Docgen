# Docgen - AI-Powered Documentation Generator

![Build Status](https://img.shields.io/badge/build-passing-brightgreen) ![Python](https://img.shields.io/badge/python-3.8%2B-blue) ![React](https://img.shields.io/badge/react-18.2-61dafb) ![FastAPI](https://img.shields.io/badge/fastapi-0.104%2B-009688)

## 📋 Overview

**Docgen** is an intelligent documentation and tutorial generation tool that automatically analyzes codebases and creates comprehensive, structured tutorials using Large Language Models (LLMs). It crawls GitHub repositories or local directories, identifies key abstractions and relationships, and generates well-organized documentation with diagrams and examples.

Perfect for:
- 📚 Creating onboarding documentation for new developers
- 🎓 Generating educational tutorials from existing codebases
- 📖 Maintaining up-to-date project documentation
- 🔍 Understanding complex codebases through AI-generated insights

## ✨ Features

### Core Capabilities
- 🤖 **AI-Powered Analysis**: Uses LLMs (OpenAI, Google Gemini) to understand code structure and relationships
- 🌐 **Multi-Source Support**: Works with GitHub repositories and local directories
- 📊 **Intelligent Workflow**: Multi-stage pipeline for comprehensive documentation generation
- 🎨 **Mermaid Diagrams**: Automatically generates architecture and relationship diagrams
- 🌍 **Multi-Language Support**: Generate documentation in multiple languages
- 💾 **Caching**: Optional LLM response caching for faster regeneration

### Web Interface
- 🖥️ **Modern React UI**: Clean, responsive interface built with React and Tailwind CSS
- 🌙 **Dark/Light Mode**: Theme toggle for comfortable viewing
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔍 **Search & Filter**: Quickly find specific documentation sections
- 📑 **Table of Contents**: Easy navigation through generated tutorials
- 🎯 **Syntax Highlighting**: Code snippets with language-specific highlighting
- 📈 **Real-Time Monitoring**: Track generation progress in real-time

## 🏗️ Architecture

### Backend Workflow

The documentation generation follows a sophisticated multi-stage pipeline:

```
┌─────────────────┐
│   FetchRepo     │  Crawl GitHub repo or local files
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│IdentifyAbstract │  LLM identifies key concepts/components
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│AnalyzeRelation  │  LLM analyzes component relationships
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OrderChapters   │  LLM determines optimal chapter ordering
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WriteChapters   │  LLM writes individual chapters (parallel)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│CombineTutorial  │  Combines chapters + generates diagrams
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│GenerateREADME   │  Optional: Generate project README
└─────────────────┘
```

### Tech Stack

**Backend:**
- 🐍 **Python 3.8+**
- ⚡ **FastAPI** - Modern, high-performance web framework
- 🔄 **Pocketflow** - Workflow orchestration engine
- 🧠 **LangChain** - LLM integration framework
- 🤖 **OpenAI API** / **Google Gemini** - AI models
- 📝 **PyYAML** - Configuration management
- 🔌 **GitPython** - Git repository handling

**Frontend:**
- ⚛️ **React 18.2** - UI framework
- ⚡ **Vite** - Build tool and dev server
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🧭 **React Router** - Client-side routing
- 📊 **Mermaid** - Diagram rendering
- 🔤 **React Markdown** - Markdown rendering
- 💡 **React Syntax Highlighter** - Code syntax highlighting
- 🎯 **Lucide React** - Icon library
- 🔥 **React Hot Toast** - Notifications

## 🚀 Installation

### Prerequisites

- Python 3.8 or higher
- Node.js 16+ and npm
- Git (for GitHub repository crawling)
- OpenAI API key or Google AI API key

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Notmeher/Docgen.git
   cd Docgen
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   # OpenAI Configuration (choose one)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # OR Google AI Configuration
   GOOGLE_API_KEY=your_google_api_key_here
   
   # Optional: GitHub token for private repos
   GITHUB_TOKEN=your_github_token_here
   ```

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Build the frontend:**
   ```bash
   npm run build
   ```

4. **Return to root directory:**
   ```bash
   cd ..
   ```

## 💻 Usage

### Starting the Application

1. **Start the backend server:**
   ```bash
   # From the root directory
   uvicorn main:app --reload --port 8000
   ```

2. **For development with hot reload (frontend):**
   ```bash
   # In a separate terminal
   cd frontend
   npm run dev
   ```

3. **Access the application:**
   - Production: `http://localhost:8000`
   - Development: `http://localhost:5173` (frontend dev server)

### Using the Web Interface

1. **Navigate to the Generate Tutorial page**
2. **Choose your source:**
   - Enter a GitHub repository URL, or
   - Specify a local directory path
3. **Configure options:**
   - Project name (optional)
   - Output directory
   - File patterns to include/exclude
   - Maximum file size
   - Language for documentation
   - Enable/disable caching
   - Maximum number of abstractions
4. **Click "Generate Tutorial"**
5. **Monitor progress** in real-time
6. **View the generated documentation** in the Tutorials section

### Command-Line Usage

You can also use the core library directly in Python:

```python
from utils.core import generate_tutorial

result = generate_tutorial(
    repo_url="https://github.com/username/repository",
    # OR local_dir="/path/to/local/project",
    project_name="MyProject",
    output_dir="output",
    language="english",
    use_cache=True,
    max_abstraction_num=10,
    generate_readme=True
)

print(f"Tutorial generated at: {result['final_output_dir']}")
```

### API Endpoints

The FastAPI backend provides the following endpoints:

- `POST /api/generate` - Start tutorial generation
- `GET /api/status/{task_id}` - Check generation status
- `POST /api/validate-directory` - Validate local directory
- `GET /api/tutorials` - List all generated tutorials
- `GET /api/tutorials/{project_name}` - Get specific tutorial
- `GET /api/tutorials/{project_name}/files` - List files in a tutorial

## ⚙️ Configuration

### File Patterns

Customize which files to include/exclude in `.env` or through the API:

**Default Include Patterns:**
```python
*.py, *.js, *.jsx, *.ts, *.tsx, *.go, *.java, *.c, *.cpp, *.h,
*.md, *.rst, Dockerfile, Makefile, *.yaml, *.yml
```

**Default Exclude Patterns:**
```python
*node_modules/*, *venv/*, *dist/*, *build/*, .git/*, *test*/,
*.log, *.tmp, *.pyc
```

### LLM Configuration

Edit `utils/call_llm.py` to switch between different LLM providers:
- OpenAI (GPT-4, GPT-3.5)
- Google Gemini
- Custom LLM endpoints

### Workflow Customization

Modify `utils/flow.py` to adjust the workflow:
- Change node retry limits
- Adjust wait times between retries
- Add or remove workflow stages

## 📁 Project Structure

```
Docgen/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (create this)
├── utils/                  # Core utilities
│   ├── core.py            # Main generation logic
│   ├── flow.py            # Workflow definition
│   ├── nodes.py           # Workflow nodes (stages)
│   ├── call_llm.py        # LLM integration
│   ├── crawl_github_files.py  # GitHub crawler
│   └── crawl_local_files.py   # Local file crawler
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts (API, Theme)
│   │   └── utils/         # Frontend utilities
│   ├── package.json       # Node.js dependencies
│   └── vite.config.js     # Vite configuration
├── output/                # Generated tutorials (auto-created)
├── logs/                  # Application logs
└── assets/                # Static assets
```

## 📝 Generated Output

Each generated tutorial includes:

- **README.md** - Project overview and summary (if enabled)
- **index.md** - Tutorial index with all chapters
- **Individual chapter files** - Detailed explanations of components
- **Mermaid diagrams** - Visual representations of architecture
- **Code examples** - Relevant code snippets
- **Relationship maps** - How components interact

Example output structure:
```
output/
└── project-name/
    ├── README.md
    ├── index.md
    ├── 01_component_name.md
    ├── 02_another_component.md
    └── ...
```

## 🔧 Troubleshooting

### Common Issues

**Issue: LLM API errors**
- Verify your API keys in `.env`
- Check your API quota/limits
- Ensure you have sufficient credits

**Issue: GitHub rate limiting**
- Provide a `GITHUB_TOKEN` in `.env`
- Use a personal access token with appropriate permissions

**Issue: Frontend not loading**
- Ensure you've built the frontend: `cd frontend && npm run build`
- Check that the dist folder exists in the frontend directory

**Issue: No files found**
- Verify your include/exclude patterns
- Check directory permissions
- Ensure the repository/directory exists and is accessible

**Issue: Generation fails**
- Check logs in the `logs/` directory
- Verify LLM model availability
- Reduce `max_abstraction_num` for large codebases

## 📧 Contact & Support

- **Repository**: [github.com/Notmeher/Docgen](https://github.com/Notmeher/Docgen)
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join the conversation in GitHub Discussions

---
