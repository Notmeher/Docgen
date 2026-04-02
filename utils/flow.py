from pocketflow import Flow
# Import all node classes from nodes.py
from utils.nodes import (
    FetchRepo,
    IdentifyAbstractions,
    AnalyzeRelationships,
    OrderChapters,
    WriteChapters,
    CombineTutorial,
    GenerateREADME
)

def create_tutorial_flow(generate_readme=False):
    """Creates and returns the codebase tutorial generation flow.
    
    Args:
        generate_readme (bool): Whether to generate README.md file
    """

    # Instantiate nodes
    fetch_repo = FetchRepo()
    identify_abstractions = IdentifyAbstractions(max_retries=5, wait=20)
    analyze_relationships = AnalyzeRelationships(max_retries=5, wait=20)
    order_chapters = OrderChapters(max_retries=5, wait=20)
    write_chapters = WriteChapters(max_retries=5, wait=20) # This is a BatchNode
    combine_tutorial = CombineTutorial(max_retries=5, wait=20) # Now uses LLM for diagram generation
    
    # Connect nodes in sequence based on the design
    fetch_repo >> identify_abstractions
    identify_abstractions >> analyze_relationships
    analyze_relationships >> order_chapters
    order_chapters >> write_chapters
    write_chapters >> combine_tutorial
    
    # Optionally add README generation
    if generate_readme:
        generate_readme_node = GenerateREADME(max_retries=3, wait=20)
        combine_tutorial >> generate_readme_node

    # Create the flow starting with FetchRepo
    tutorial_flow = Flow(start=fetch_repo)

    return tutorial_flow
