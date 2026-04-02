import dotenv
import os
import argparse
# Import the function that creates the flow
from utils.flow import create_tutorial_flow

dotenv.load_dotenv()

# Default file patterns
DEFAULT_INCLUDE_PATTERNS = {
    "*.py", "*.js", "*.jsx", "*.ts", "*.tsx", "*.go", "*.java", "*.pyi", "*.pyx",
    "*.c", "*.cc", "*.cpp", "*.h", "*.md", "*.rst", "*Dockerfile",
    "*Makefile", "*.yaml", "*.yml",
}

DEFAULT_EXCLUDE_PATTERNS = {
    "assets/*", "data/*", "images/*", "public/*", "static/*", "temp/*",
    "*docs/*",
    "*venv/*",
    "*.venv/*",
    "*test*",
    "*tests/*",
    "*examples/*",
    "v1/*",
    "*dist/*",
    "*build/*",
    "*experimental/*",
    "*deprecated/*",
    "*misc/*",
    "*legacy/*",
    ".git/*", ".github/*", ".next/*", ".vscode/*",
    "*obj/*",
    "*bin/*",
    "*node_modules/*",
    "*.log",
    "*.tmp",
    "*.pyc"

}

def generate_tutorial(
    repo_url=None,
    local_dir=None,
    project_name=None,
    github_token=None,
    output_dir="output",
    include_patterns=None,
    exclude_patterns=None,
    max_file_size=100000,
    language="english",
    use_cache=True,
    max_abstraction_num=10,
    generate_readme=False
):
    """
    Generate a tutorial for a GitHub codebase or local directory.
    
    Args:
        repo_url: URL of the public GitHub repository
        local_dir: Path to local directory
        project_name: Project name (optional, derived from repo/directory if omitted)
        github_token: GitHub personal access token
        output_dir: Base directory for output
        include_patterns: Include file patterns
        exclude_patterns: Exclude file patterns
        max_file_size: Maximum file size in bytes
        language: Language for the generated tutorial
        use_cache: Enable LLM response caching
        max_abstraction_num: Maximum number of abstractions to identify
        generate_readme: Generate a comprehensive README.md file
        
    Returns:
        dict: Contains the final_output_dir and other results
    """
    # Use default patterns if not provided
    if include_patterns is None:
        include_patterns = DEFAULT_INCLUDE_PATTERNS
    if exclude_patterns is None:
        exclude_patterns = DEFAULT_EXCLUDE_PATTERNS
    
    # Get GitHub token from environment if not provided and repo_url is given
    if repo_url and not github_token:
        github_token = os.environ.get('GITHUB_TOKEN')
        if not github_token:
            print("Warning: No GitHub token provided. You might hit rate limits for public repositories.")

    # Initialize the shared dictionary with inputs
    shared = {
        "repo_url": repo_url,
        "local_dir": local_dir,
        "project_name": project_name, # Can be None, FetchRepo will derive it
        "github_token": github_token,
        "output_dir": output_dir, # Base directory for CombineTutorial output

        # Add include/exclude patterns and max file size
        "include_patterns": set(include_patterns),
        "exclude_patterns": set(exclude_patterns),
        "max_file_size": max_file_size,

        # Add language for multi-language support
        "language": language,
        
        # Add use_cache flag
        "use_cache": use_cache,
        
        # Add max_abstraction_num parameter
        "max_abstraction_num": max_abstraction_num,

        # Outputs will be populated by the nodes
        "files": [],
        "abstractions": [],
        "relationships": {},
        "chapter_order": [],
        "chapters": [],
        "final_output_dir": None
    }

    # Display starting message with repository/directory and language
    print(f"Starting tutorial generation for: {repo_url or local_dir} in {language.capitalize()} language")
    print(f"LLM caching: {'Disabled' if not use_cache else 'Enabled'}")
    print(f"Generate README: {'Yes' if generate_readme else 'No'}")

    # Create the flow instance with optional README generation
    tutorial_flow = create_tutorial_flow(generate_readme=generate_readme)

    # Run the flow
    tutorial_flow.run(shared)
    
    return shared

# --- Main Function ---
def main():
    parser = argparse.ArgumentParser(description="Generate a tutorial for a GitHub codebase or local directory.")

    # Create mutually exclusive group for source
    source_group = parser.add_mutually_exclusive_group(required=True)
    source_group.add_argument("--repo", help="URL of the public GitHub repository.")
    source_group.add_argument("--dir", help="Path to local directory.")

    parser.add_argument("-n", "--name", help="Project name (optional, derived from repo/directory if omitted).")
    parser.add_argument("-t", "--token", help="GitHub personal access token (optional, reads from GITHUB_TOKEN env var if not provided).")
    parser.add_argument("-o", "--output", default="output", help="Base directory for output (default: ./output).")
    parser.add_argument("-i", "--include", nargs="+", help="Include file patterns (e.g. '*.py' '*.js'). Defaults to common code files if not specified.")
    parser.add_argument("-e", "--exclude", nargs="+", help="Exclude file patterns (e.g. 'tests/*' 'docs/*'). Defaults to test/build directories if not specified.")
    parser.add_argument("-s", "--max-size", type=int, default=100000, help="Maximum file size in bytes (default: 100000, about 100KB).")
    # Add language parameter for multi-language support
    parser.add_argument("--language", default="english", help="Language for the generated tutorial (default: english)")
    # Add use_cache parameter to control LLM caching
    parser.add_argument("--no-cache", action="store_true", help="Disable LLM response caching (default: caching enabled)")
    # Add max_abstraction_num parameter to control the number of abstractions
    parser.add_argument("--max-abstractions", type=int, default=10, help="Maximum number of abstractions to identify (default: 10)")
    # Add generate_readme parameter to optionally generate README.md
    parser.add_argument("--generate-readme", action="store_true", help="Generate a comprehensive README.md file (default: disabled)")

    args = parser.parse_args()

    # Call the refactored function
    result = generate_tutorial(
        repo_url=args.repo,
        local_dir=args.dir,
        project_name=args.name,
        github_token=args.token,
        output_dir=args.output,
        include_patterns=args.include,
        exclude_patterns=args.exclude,
        max_file_size=args.max_size,
        language=args.language,
        use_cache=not args.no_cache,
        max_abstraction_num=args.max_abstractions,
        generate_readme=args.generate_readme
    )

if __name__ == "__main__":
    main()
