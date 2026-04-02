import os
import re
import yaml
from pocketflow import Node, BatchNode
from utils.crawl_github_files import crawl_github_files
from utils.call_llm import call_llm
from utils.crawl_local_files import crawl_local_files
# from crawl_github_files import crawl_github_files
# from call_llm import call_llm
# from crawl_local_files import crawl_local_files


# Helper to get content for specific file indices
def get_content_for_indices(files_data, indices):
    content_map = {}
    for i in indices:
        if 0 <= i < len(files_data):
            path, content = files_data[i]
            content_map[f"{i} # {path}"] = (
                content  # Use index + path as key for context
            )
    return content_map


class FetchRepo(Node):
    def prep(self, shared):
        repo_url = shared.get("repo_url")
        local_dir = shared.get("local_dir")
        project_name = shared.get("project_name")

        if not project_name:
            # Basic name derivation from URL or directory
            if repo_url:
                project_name = repo_url.split("/")[-1].replace(".git", "")
            else:
                project_name = os.path.basename(os.path.abspath(local_dir))
            shared["project_name"] = project_name

        # Get file patterns directly from shared
        include_patterns = shared["include_patterns"]
        exclude_patterns = shared["exclude_patterns"]
        max_file_size = shared["max_file_size"]

        return {
            "repo_url": repo_url,
            "local_dir": local_dir,
            "token": shared.get("github_token"),
            "include_patterns": include_patterns,
            "exclude_patterns": exclude_patterns,
            "max_file_size": max_file_size,
            "use_relative_paths": True,
        }

    def exec(self, prep_res):
        if prep_res["repo_url"]:
            print(f"Crawling repository: {prep_res['repo_url']}...")
            result = crawl_github_files(
                repo_url=prep_res["repo_url"],
                token=prep_res["token"],
                include_patterns=prep_res["include_patterns"],
                exclude_patterns=prep_res["exclude_patterns"],
                max_file_size=prep_res["max_file_size"],
                use_relative_paths=prep_res["use_relative_paths"],
            )
        else:
            print(f"Crawling directory: {prep_res['local_dir']}...")

            result = crawl_local_files(
                directory=prep_res["local_dir"],
                include_patterns=prep_res["include_patterns"],
                exclude_patterns=prep_res["exclude_patterns"],
                max_file_size=prep_res["max_file_size"],
                use_relative_paths=prep_res["use_relative_paths"]
            )

        # Convert dict to list of tuples: [(path, content), ...]
        files_list = list(result.get("files", {}).items())
        if len(files_list) == 0:
            raise (ValueError("Failed to fetch files"))
        print(f"Fetched {len(files_list)} files.")
        return files_list

    def post(self, shared, prep_res, exec_res):
        shared["files"] = exec_res  # List of (path, content) tuples


class IdentifyAbstractions(Node):
    def prep(self, shared):
        files_data = shared["files"]
        project_name = shared["project_name"]  # Get project name
        language = shared.get("language", "english")  # Get language
        use_cache = shared.get("use_cache", True)  # Get use_cache flag, default to True
        max_abstraction_num = shared.get("max_abstraction_num", 10)  # Get max_abstraction_num, default to 10

        # Helper to create context from files, respecting limits (basic example)
        def create_llm_context(files_data):
            context = ""
            file_info = []  # Store tuples of (index, path)
            for i, (path, content) in enumerate(files_data):
                entry = f"--- File Index {i}: {path} ---\n{content}\n\n"
                context += entry
                file_info.append((i, path))

            return context, file_info  # file_info is list of (index, path)

        context, file_info = create_llm_context(files_data)
        # Format file info for the prompt (comment is just a hint for LLM)
        file_listing_for_prompt = "\n".join(
            [f"- {idx} # {path}" for idx, path in file_info]
        )
        return (
            context,
            file_listing_for_prompt,
            len(files_data),
            project_name,
            language,
            use_cache,
            max_abstraction_num,
        )  # Return all parameters

    def exec(self, prep_res):
        (
            context,
            file_listing_for_prompt,
            file_count,
            project_name,
            language,
            use_cache,
            max_abstraction_num,
        ) = prep_res  # Unpack all parameters
        print(f"Identifying abstractions using LLM...")

        # Add language instruction and hints only if not English
        language_instruction = ""
        name_lang_hint = ""
        desc_lang_hint = ""
        if language.lower() != "english":
            language_instruction = f"IMPORTANT: Generate the `name` and `description` for each abstraction in **{language.capitalize()}** language. Do NOT use English for these fields.\n\n"
            # Keep specific hints here as name/description are primary targets
            name_lang_hint = f" (value in {language.capitalize()})"
            desc_lang_hint = f" (value in {language.capitalize()})"

        prompt = f"""
For the project `{project_name}`:

Codebase Context:
{context}

{language_instruction}Analyze the codebase context.
Identify the top 5-{max_abstraction_num} core most important abstractions to help those new to the codebase.

For each abstraction, provide:
1. A concise `name`{name_lang_hint}.
2. A beginner-friendly `description` explaining what it is with a simple analogy, in around 100 words{desc_lang_hint}.
3. A list of relevant `file_indices` (integers) using the format `idx # path/comment`.

List of file indices and paths present in the context:
{file_listing_for_prompt}

Format the output as a YAML list of dictionaries:

```yaml
- name: |
    Query Processing{name_lang_hint}
  description: |
    Explains what the abstraction does.
    It's like a central dispatcher routing requests.{desc_lang_hint}
  file_indices:
    - 0 # path/to/file1.py
    - 3 # path/to/related.py
- name: |
    Query Optimization{name_lang_hint}
  description: |
    Another core concept, similar to a blueprint for objects.{desc_lang_hint}
  file_indices:
    - 5 # path/to/another.js
# ... up to {max_abstraction_num} abstractions
```"""
        response = call_llm(prompt, use_cache=(use_cache and self.cur_retry == 0))  # Use cache only if enabled and not retrying

        # --- Validation ---
        yaml_str = response.strip().split("```yaml")[1].split("```")[0].strip()
        abstractions = yaml.safe_load(yaml_str)

        if not isinstance(abstractions, list):
            raise ValueError("LLM Output is not a list")

        validated_abstractions = []
        for item in abstractions:
            if not isinstance(item, dict) or not all(
                k in item for k in ["name", "description", "file_indices"]
            ):
                raise ValueError(f"Missing keys in abstraction item: {item}")
            if not isinstance(item["name"], str):
                raise ValueError(f"Name is not a string in item: {item}")
            if not isinstance(item["description"], str):
                raise ValueError(f"Description is not a string in item: {item}")
            if not isinstance(item["file_indices"], list):
                raise ValueError(f"file_indices is not a list in item: {item}")

            # Validate indices
            validated_indices = []
            for idx_entry in item["file_indices"]:
                try:
                    if isinstance(idx_entry, int):
                        idx = idx_entry
                    elif isinstance(idx_entry, str) and "#" in idx_entry:
                        idx = int(idx_entry.split("#")[0].strip())
                    else:
                        idx = int(str(idx_entry).strip())

                    if not (0 <= idx < file_count):
                        raise ValueError(
                            f"Invalid file index {idx} found in item {item['name']}. Max index is {file_count - 1}."
                        )
                    validated_indices.append(idx)
                except (ValueError, TypeError):
                    raise ValueError(
                        f"Could not parse index from entry: {idx_entry} in item {item['name']}"
                    )

            item["files"] = sorted(list(set(validated_indices)))
            # Store only the required fields
            validated_abstractions.append(
                {
                    "name": item["name"],  # Potentially translated name
                    "description": item[
                        "description"
                    ],  # Potentially translated description
                    "files": item["files"],
                }
            )

        print(f"Identified {len(validated_abstractions)} abstractions.")
        return validated_abstractions

    def post(self, shared, prep_res, exec_res):
        shared["abstractions"] = (
            exec_res  # List of {"name": str, "description": str, "files": [int]}
        )


class AnalyzeRelationships(Node):
    def prep(self, shared):
        abstractions = shared[
            "abstractions"
        ]  # Now contains 'files' list of indices, name/description potentially translated
        files_data = shared["files"]
        project_name = shared["project_name"]  # Get project name
        language = shared.get("language", "english")  # Get language
        use_cache = shared.get("use_cache", True)  # Get use_cache flag, default to True

        # Get the actual number of abstractions directly
        num_abstractions = len(abstractions)

        # Create context with abstraction names, indices, descriptions, and relevant file snippets
        context = "Identified Abstractions:\\n"
        all_relevant_indices = set()
        abstraction_info_for_prompt = []
        for i, abstr in enumerate(abstractions):
            # Use 'files' which contains indices directly
            file_indices_str = ", ".join(map(str, abstr["files"]))
            # Abstraction name and description might be translated already
            info_line = f"- Index {i}: {abstr['name']} (Relevant file indices: [{file_indices_str}])\\n  Description: {abstr['description']}"
            context += info_line + "\\n"
            abstraction_info_for_prompt.append(
                f"{i} # {abstr['name']}"
            )  # Use potentially translated name here too
            all_relevant_indices.update(abstr["files"])

        context += "\\nRelevant File Snippets (Referenced by Index and Path):\\n"
        # Get content for relevant files using helper
        relevant_files_content_map = get_content_for_indices(
            files_data, sorted(list(all_relevant_indices))
        )
        # Format file content for context
        file_context_str = "\\n\\n".join(
            f"--- File: {idx_path} ---\\n{content}"
            for idx_path, content in relevant_files_content_map.items()
        )
        context += file_context_str

        return (
            context,
            "\n".join(abstraction_info_for_prompt),
            num_abstractions, # Pass the actual count
            project_name,
            language,
            use_cache,
        )  # Return use_cache

    def exec(self, prep_res):
        (
            context,
            abstraction_listing,
            num_abstractions, # Receive the actual count
            project_name,
            language,
            use_cache,
         ) = prep_res  # Unpack use_cache
        print(f"Analyzing relationships using LLM...")

        # Add language instruction and hints only if not English
        language_instruction = ""
        lang_hint = ""
        list_lang_note = ""
        if language.lower() != "english":
            language_instruction = f"IMPORTANT: Generate the `summary` and relationship `label` fields in **{language.capitalize()}** language. Do NOT use English for these fields.\n\n"
            lang_hint = f" (in {language.capitalize()})"
            list_lang_note = f" (Names might be in {language.capitalize()})"  # Note for the input list

        prompt = f"""
Based on the following abstractions and relevant code snippets from the project `{project_name}`:

List of Abstraction Indices and Names{list_lang_note}:
{abstraction_listing}

Context (Abstractions, Descriptions, Code):
{context}

{language_instruction}Please provide:
1. A high-level `summary` of the project's main purpose and functionality in a few beginner-friendly sentences{lang_hint}. Use markdown formatting with **bold** and *italic* text to highlight important concepts.
2. A list (`relationships`) describing the key interactions between these abstractions. For each relationship, specify:
    - `from_abstraction`: Index of the source abstraction (e.g., `0 # AbstractionName1`)
    - `to_abstraction`: Index of the target abstraction (e.g., `1 # AbstractionName2`)
    - `label`: A brief label for the interaction **in just a few words**{lang_hint} (e.g., "Manages", "Inherits", "Uses").
    Ideally the relationship should be backed by one abstraction calling or passing parameters to another.
    Simplify the relationship and exclude those non-important ones.

IMPORTANT: Make sure EVERY abstraction is involved in at least ONE relationship (either as source or target). Each abstraction index must appear at least once across all relationships.

Format the output as YAML:

```yaml
summary: |
  A brief, simple explanation of the project{lang_hint}.
  Can span multiple lines with **bold** and *italic* for emphasis.
relationships:
  - from_abstraction: 0 # AbstractionName1
    to_abstraction: 1 # AbstractionName2
    label: "Manages"{lang_hint}
  - from_abstraction: 2 # AbstractionName3
    to_abstraction: 0 # AbstractionName1
    label: "Provides config"{lang_hint}
  # ... other relationships
```

Now, provide the YAML output:
"""
        response = call_llm(prompt, use_cache=(use_cache and self.cur_retry == 0)) # Use cache only if enabled and not retrying

        # --- Validation ---
        yaml_str = response.strip().split("```yaml")[1].split("```")[0].strip()
        relationships_data = yaml.safe_load(yaml_str)

        if not isinstance(relationships_data, dict) or not all(
            k in relationships_data for k in ["summary", "relationships"]
        ):
            raise ValueError(
                "LLM output is not a dict or missing keys ('summary', 'relationships')"
            )
        if not isinstance(relationships_data["summary"], str):
            raise ValueError("summary is not a string")
        if not isinstance(relationships_data["relationships"], list):
            raise ValueError("relationships is not a list")

        # Validate relationships structure
        validated_relationships = []
        for rel in relationships_data["relationships"]:
            # Check for 'label' key
            if not isinstance(rel, dict) or not all(
                k in rel for k in ["from_abstraction", "to_abstraction", "label"]
            ):
                raise ValueError(
                    f"Missing keys (expected from_abstraction, to_abstraction, label) in relationship item: {rel}"
                )
            # Validate 'label' is a string
            if not isinstance(rel["label"], str):
                raise ValueError(f"Relationship label is not a string: {rel}")

            # Validate indices
            try:
                from_idx = int(str(rel["from_abstraction"]).split("#")[0].strip())
                to_idx = int(str(rel["to_abstraction"]).split("#")[0].strip())
                if not (
                    0 <= from_idx < num_abstractions and 0 <= to_idx < num_abstractions
                ):
                    raise ValueError(
                        f"Invalid index in relationship: from={from_idx}, to={to_idx}. Max index is {num_abstractions-1}."
                    )
                validated_relationships.append(
                    {
                        "from": from_idx,
                        "to": to_idx,
                        "label": rel["label"],  # Potentially translated label
                    }
                )
            except (ValueError, TypeError):
                raise ValueError(f"Could not parse indices from relationship: {rel}")

        print("Generated project summary and relationship details.")
        return {
            "summary": relationships_data["summary"],  # Potentially translated summary
            "details": validated_relationships,  # Store validated, index-based relationships with potentially translated labels
        }

    def post(self, shared, prep_res, exec_res):
        # Structure is now {"summary": str, "details": [{"from": int, "to": int, "label": str}]}
        # Summary and label might be translated
        shared["relationships"] = exec_res


class OrderChapters(Node):
    def prep(self, shared):
        abstractions = shared["abstractions"]  # Name/description might be translated
        relationships = shared["relationships"]  # Summary/label might be translated
        project_name = shared["project_name"]  # Get project name
        language = shared.get("language", "english")  # Get language
        use_cache = shared.get("use_cache", True)  # Get use_cache flag, default to True

        # Prepare context for the LLM
        abstraction_info_for_prompt = []
        for i, a in enumerate(abstractions):
            abstraction_info_for_prompt.append(
                f"- {i} # {a['name']}"
            )  # Use potentially translated name
        abstraction_listing = "\n".join(abstraction_info_for_prompt)

        # Use potentially translated summary and labels
        summary_note = ""
        if language.lower() != "english":
            summary_note = (
                f" (Note: Project Summary might be in {language.capitalize()})"
            )

        context = f"Project Summary{summary_note}:\n{relationships['summary']}\n\n"
        context += "Relationships (Indices refer to abstractions above):\n"
        for rel in relationships["details"]:
            from_name = abstractions[rel["from"]]["name"]
            to_name = abstractions[rel["to"]]["name"]
            # Use potentially translated 'label'
            context += f"- From {rel['from']} ({from_name}) to {rel['to']} ({to_name}): {rel['label']}\n"  # Label might be translated

        list_lang_note = ""
        if language.lower() != "english":
            list_lang_note = f" (Names might be in {language.capitalize()})"

        return (
            abstraction_listing,
            context,
            len(abstractions),
            project_name,
            list_lang_note,
            use_cache,
        )  # Return use_cache

    def exec(self, prep_res):
        (
            abstraction_listing,
            context,
            num_abstractions,
            project_name,
            list_lang_note,
            use_cache,
        ) = prep_res  # Unpack use_cache
        print("Determining chapter order using LLM...")
        # No language variation needed here in prompt instructions, just ordering based on structure
        # The input names might be translated, hence the note.
        prompt = f"""
Given the following project abstractions and their relationships for the project ```` {project_name} ````:

Abstractions (Index # Name){list_lang_note}:
{abstraction_listing}

Context about relationships and project summary:
{context}

If you are going to make a tutorial for ```` {project_name} ````, what is the best order to explain these abstractions, from first to last?
Ideally, first explain those that are the most important or foundational, perhaps user-facing concepts or entry points. Then move to more detailed, lower-level implementation details or supporting concepts.

Output the ordered list of abstraction indices, including the name in a comment for clarity. Use the format `idx # AbstractionName`.

```yaml
- 2 # FoundationalConcept
- 0 # CoreClassA
- 1 # CoreClassB (uses CoreClassA)
- ...
```

Now, provide the YAML output:
"""
        response = call_llm(prompt, use_cache=(use_cache and self.cur_retry == 0)) # Use cache only if enabled and not retrying

        # --- Validation ---
        yaml_str = response.strip().split("```yaml")[1].split("```")[0].strip()
        ordered_indices_raw = yaml.safe_load(yaml_str)

        if not isinstance(ordered_indices_raw, list):
            raise ValueError("LLM output is not a list")

        ordered_indices = []
        seen_indices = set()
        for entry in ordered_indices_raw:
            try:
                if isinstance(entry, int):
                    idx = entry
                elif isinstance(entry, str) and "#" in entry:
                    idx = int(entry.split("#")[0].strip())
                else:
                    idx = int(str(entry).strip())

                if not (0 <= idx < num_abstractions):
                    raise ValueError(
                        f"Invalid index {idx} in ordered list. Max index is {num_abstractions-1}."
                    )
                if idx in seen_indices:
                    raise ValueError(f"Duplicate index {idx} found in ordered list.")
                ordered_indices.append(idx)
                seen_indices.add(idx)

            except (ValueError, TypeError):
                raise ValueError(
                    f"Could not parse index from ordered list entry: {entry}"
                )

        # Check if all abstractions are included
        if len(ordered_indices) != num_abstractions:
            raise ValueError(
                f"Ordered list length ({len(ordered_indices)}) does not match number of abstractions ({num_abstractions}). Missing indices: {set(range(num_abstractions)) - seen_indices}"
            )

        print(f"Determined chapter order (indices): {ordered_indices}")
        return ordered_indices  # Return the list of indices

    def post(self, shared, prep_res, exec_res):
        # exec_res is already the list of ordered indices
        shared["chapter_order"] = exec_res  # List of indices


class WriteChapters(BatchNode):
    def prep(self, shared):
        chapter_order = shared["chapter_order"]  # List of indices
        abstractions = shared[
            "abstractions"
        ]  # List of {"name": str, "description": str, "files": [int]}
        files_data = shared["files"]  # List of (path, content) tuples
        project_name = shared["project_name"]
        language = shared.get("language", "english")
        use_cache = shared.get("use_cache", True)  # Get use_cache flag, default to True

        # Get already written chapters to provide context
        # We store them temporarily during the batch run, not in shared memory yet
        # The 'previous_chapters_summary' will be built progressively in the exec context
        self.chapters_written_so_far = (
            []
        )  # Use instance variable for temporary storage across exec calls

        # Create a complete list of all chapters
        all_chapters = []
        chapter_filenames = {}  # Store chapter filename mapping for linking
        for i, abstraction_index in enumerate(chapter_order):
            if 0 <= abstraction_index < len(abstractions):
                chapter_num = i + 1
                chapter_name = abstractions[abstraction_index][
                    "name"
                ]  # Potentially translated name
                # Create safe filename (from potentially translated name)
                safe_name = "".join(
                    c if c.isalnum() else "_" for c in chapter_name
                ).lower()
                filename = f"{i+1:02d}_{safe_name}.md"
                # Format with link (using potentially translated name)
                all_chapters.append(f"{chapter_num}. [{chapter_name}]({filename})")
                # Store mapping of chapter index to filename for linking
                chapter_filenames[abstraction_index] = {
                    "num": chapter_num,
                    "name": chapter_name,
                    "filename": filename,
                }

        # Create a formatted string with all chapters
        full_chapter_listing = "\n".join(all_chapters)

        items_to_process = []
        for i, abstraction_index in enumerate(chapter_order):
            if 0 <= abstraction_index < len(abstractions):
                abstraction_details = abstractions[
                    abstraction_index
                ]  # Contains potentially translated name/desc
                # Use 'files' (list of indices) directly
                related_file_indices = abstraction_details.get("files", [])
                # Get content using helper, passing indices
                related_files_content_map = get_content_for_indices(
                    files_data, related_file_indices
                )

                # Get previous chapter info for transitions (uses potentially translated name)
                prev_chapter = None
                if i > 0:
                    prev_idx = chapter_order[i - 1]
                    prev_chapter = chapter_filenames[prev_idx]

                # Get next chapter info for transitions (uses potentially translated name)
                next_chapter = None
                if i < len(chapter_order) - 1:
                    next_idx = chapter_order[i + 1]
                    next_chapter = chapter_filenames[next_idx]

                items_to_process.append(
                    {
                        "chapter_num": i + 1,
                        "abstraction_index": abstraction_index,
                        "abstraction_details": abstraction_details,  # Has potentially translated name/desc
                        "related_files_content_map": related_files_content_map,
                        "project_name": shared["project_name"],  # Add project name
                        "full_chapter_listing": full_chapter_listing,  # Add the full chapter listing (uses potentially translated names)
                        "chapter_filenames": chapter_filenames,  # Add chapter filenames mapping (uses potentially translated names)
                        "prev_chapter": prev_chapter,  # Add previous chapter info (uses potentially translated name)
                        "next_chapter": next_chapter,  # Add next chapter info (uses potentially translated name)
                        "language": language,  # Add language for multi-language support
                        "use_cache": use_cache, # Pass use_cache flag
                        # previous_chapters_summary will be added dynamically in exec
                    }
                )
            else:
                print(
                    f"Warning: Invalid abstraction index {abstraction_index} in chapter_order. Skipping."
                )

        print(f"Preparing to write {len(items_to_process)} chapters...")
        return items_to_process  # Iterable for BatchNode

    def _get_diagram_requirement(self, abstraction_name):
        """Determine the required diagram type based on abstraction name patterns."""
        name_lower = abstraction_name.lower()
        
        # Mandatory sequence diagrams for API/communication patterns
        api_patterns = ['api', 'endpoint', 'route', 'handler', 'request', 'response', 
                       'integration', 'interface', 'chat', 'message', 'webhook']
        if any(pattern in name_lower for pattern in api_patterns):
            return f"**MANDATORY: Use sequenceDiagram** ('{abstraction_name}' involves communication/API interactions)"
        
        # Component/class diagrams for structural patterns
        component_patterns = ['component', 'function', 'module', 'service', 'frontend', 'ui']
        if any(pattern in name_lower for pattern in component_patterns):
            return f"**REQUIRED: Use classDiagram** ('{abstraction_name}' is a structural component)"
        
        # State diagrams for lifecycle/state patterns
        state_patterns = ['session', 'state', 'lifecycle', 'connection', 'management']
        if any(pattern in name_lower for pattern in state_patterns):
            return f"**REQUIRED: Use stateDiagram-v2** ('{abstraction_name}' has state transitions)"
        
        # ER diagrams for data/config patterns
        data_patterns = ['config', 'configuration', 'environment', 'settings', 'data', 'model', 'schema']
        if any(pattern in name_lower for pattern in data_patterns):
            return f"**REQUIRED: Use erDiagram** ('{abstraction_name}' is about data/configuration)"
        
        # Flowcharts for processing/logic patterns
        process_patterns = ['process', 'processing', 'workflow', 'setup', 'docker', 'audio', 'video']
        if any(pattern in name_lower for pattern in process_patterns):
            return f"**REQUIRED: Use flowchart TD** ('{abstraction_name}' involves processing/workflows)"
        
        # Default to analyzing the abstraction description
        return f"**ANALYZE '{abstraction_name}'** and choose the MOST appropriate diagram (NOT flowchart unless it's truly processing logic)"

    def exec(self, item):
        # This runs for each item prepared above
        abstraction_name = item["abstraction_details"][
            "name"
        ]  # Potentially translated name
        abstraction_description = item["abstraction_details"][
            "description"
        ]  # Potentially translated description
        chapter_num = item["chapter_num"]
        project_name = item.get("project_name")
        language = item.get("language", "english")
        use_cache = item.get("use_cache", True) # Read use_cache from item
        print(f"Writing chapter {chapter_num} for: {abstraction_name} using LLM...")

        # Prepare file context string from the map
        file_context_str = "\n\n".join(
            f"--- File: {idx_path.split('# ')[1] if '# ' in idx_path else idx_path} ---\n{content}"
            for idx_path, content in item["related_files_content_map"].items()
        )

        # Get summary of chapters written *before* this one
        # Use the temporary instance variable
        previous_chapters_summary = "\n---\n".join(self.chapters_written_so_far)

        # Add language instruction and context notes only if not English
        language_instruction = ""
        concept_details_note = ""
        structure_note = ""
        prev_summary_note = ""
        instruction_lang_note = ""
        mermaid_lang_note = ""
        code_comment_note = ""
        link_lang_note = ""
        tone_note = ""
        if language.lower() != "english":
            lang_cap = language.capitalize()
            language_instruction = f"IMPORTANT: Write this ENTIRE tutorial chapter in **{lang_cap}**. Some input context (like concept name, description, chapter list, previous summary) might already be in {lang_cap}, but you MUST translate ALL other generated content including explanations, examples, technical terms, and potentially code comments into {lang_cap}. DO NOT use English anywhere except in code syntax, required proper nouns, or when specified. The entire output MUST be in {lang_cap}.\n\n"
            concept_details_note = f" (Note: Provided in {lang_cap})"
            structure_note = f" (Note: Chapter names might be in {lang_cap})"
            prev_summary_note = f" (Note: This summary might be in {lang_cap})"
            instruction_lang_note = f" (in {lang_cap})"
            mermaid_lang_note = f" (Use {lang_cap} for labels/text if appropriate)"
            code_comment_note = f" (Translate to {lang_cap} if possible, otherwise keep minimal English for clarity)"
            link_lang_note = (
                f" (Use the {lang_cap} chapter title from the structure above)"
            )
            tone_note = f" (appropriate for {lang_cap} readers)"

        prompt = f"""
{language_instruction}Write a very beginner-friendly tutorial chapter (in Markdown format) for the project `{project_name}` about the concept: "{abstraction_name}". This is Chapter {chapter_num}.

Concept Details{concept_details_note}:
- Name: {abstraction_name}
- Description:
{abstraction_description}

Complete Tutorial Structure{structure_note}:
{item["full_chapter_listing"]}

Context from previous chapters{prev_summary_note}:
{previous_chapters_summary if previous_chapters_summary else "This is the first chapter."}

Relevant Code Snippets (Code itself remains unchanged):
{file_context_str if file_context_str else "No specific code snippets provided for this abstraction."}

Instructions for the chapter (Generate content in {language.capitalize()} unless specified otherwise):
- Start with a clear heading (e.g., `# Chapter {chapter_num}: {abstraction_name}`). Use the provided concept name.

- If this is not the first chapter, begin with a brief transition from the previous chapter{instruction_lang_note}, referencing it with a proper Markdown link using its name{link_lang_note}.

- Begin with a high-level motivation explaining what problem this abstraction solves{instruction_lang_note}. Start with a central use case as a concrete example. The whole chapter should guide the reader to understand how to solve this use case. Make it very minimal and friendly to beginners.

- If the abstraction is complex, break it down into key concepts. Explain each concept one-by-one in a very beginner-friendly way{instruction_lang_note}.

- Explain how to use this abstraction to solve the use case{instruction_lang_note}. Give example inputs and outputs for code snippets (if the output isn't values, describe at a high level what will happen{instruction_lang_note}).

- Each code block should be BELOW 10 lines! If longer code blocks are needed, break them down into smaller pieces and walk through them one-by-one. Aggresively simplify the code to make it minimal. Use comments{code_comment_note} to skip non-important implementation details. Each code block should have a beginner friendly explanation right after it{instruction_lang_note}.

- Describe the internal implementation to help understand what's under the hood{instruction_lang_note}. First provide a non-code or code-light walkthrough on what happens step-by-step when the abstraction is called{instruction_lang_note}. 

**🚨 MANDATORY DIAGRAM SELECTION RULES:**

**Step 1: Check if this abstraction MUST use sequenceDiagram (REQUIRED for these patterns):**
- If name contains: "API", "Endpoint", "Route", "Handler", "Request", "Response", "Integration", "Interface", "Chat" → **USE sequenceDiagram**
- If it's about communication between components → **USE sequenceDiagram**

**Step 2: If NOT a sequence diagram, choose based on abstraction type:**
- **classDiagram**: For "Component", "Function", "Module", "Service" with properties/methods, React/Vue components, classes, or object structures
  Example: `Chat Interface` → classDiagram showing MessageBubble, ChatInput, etc.
  
- **stateDiagram-v2**: For "Session", "Connection", "State", "Lifecycle", "Management" with clear state transitions
  Example: `Session Management` → stateDiagram-v2 showing idle → active → expired
  
- **erDiagram**: For "Configuration", "Settings", "Data Model", "Schema" showing data relationships
  Example: `Environment Configuration` → erDiagram showing config tables/objects
  
- **flowchart TD/LR**: For "Processing", "Setup", "Workflow" with decision trees or algorithmic steps
  Example: `Audio Processing` → flowchart showing audio input → processing → output

**Step 3: Current abstraction is "{abstraction_name}" - YOU MUST:**
{self._get_diagram_requirement(abstraction_name)}

Keep it minimal with at most 5 participants/nodes/states. Use descriptive aliases: `participant User as Web User` or `A["Input Handler"]`. {mermaid_lang_note}.

- Then dive deeper into code for the internal implementation with references to files. Provide example code blocks, but make them similarly simple and beginner-friendly. Explain{instruction_lang_note}.

- IMPORTANT: When you need to refer to other core abstractions covered in other chapters, ALWAYS use proper Markdown links like this: [Chapter Title](filename.md). Use the Complete Tutorial Structure above to find the correct filename and the chapter title{link_lang_note}. Translate the surrounding text.

- **CHAPTER-SPECIFIC DIAGRAM REQUIREMENT:** Each chapter MUST use a DIFFERENT diagram type from previous chapters. Review what types were used before and choose something new. Prioritize:
  * APIs/Endpoints/Handlers → **MUST use sequenceDiagram**
  * Components/Modules → classDiagram
  * Sessions/States → stateDiagram-v2
  * Config/Data → erDiagram
  * Logic/Processing → flowchart
  Keep diagrams simple and focused on ONE concept per diagram. {mermaid_lang_note}.

- Heavily use analogies and examples throughout{instruction_lang_note} to help beginners understand.

- End the chapter with a brief conclusion that summarizes what was learned{instruction_lang_note} and provides a transition to the next chapter{instruction_lang_note}. If there is a next chapter, use a proper Markdown link: [Next Chapter Title](next_chapter_filename){link_lang_note}.

- Ensure the tone is welcoming and easy for a newcomer to understand{tone_note}.

- Output *only* the Markdown content for this chapter.

Now, directly provide a super beginner-friendly Markdown output (DON'T need ```markdown``` tags):
"""
        chapter_content = call_llm(prompt, use_cache=(use_cache and self.cur_retry == 0)) # Use cache only if enabled and not retrying
        # Basic validation/cleanup
        actual_heading = f"# Chapter {chapter_num}: {abstraction_name}"  # Use potentially translated name
        if not chapter_content.strip().startswith(f"# Chapter {chapter_num}"):
            # Add heading if missing or incorrect, trying to preserve content
            lines = chapter_content.strip().split("\n")
            if lines and lines[0].strip().startswith(
                "#"
            ):  # If there's some heading, replace it
                lines[0] = actual_heading
                chapter_content = "\n".join(lines)
            else:  # Otherwise, prepend it
                chapter_content = f"{actual_heading}\n\n{chapter_content}"

        # Add the generated content to our temporary list for the next iteration's context
        self.chapters_written_so_far.append(chapter_content)

        return chapter_content  # Return the Markdown string (potentially translated)

    def post(self, shared, prep_res, exec_res_list):
        # exec_res_list contains the generated Markdown for each chapter, in order
        shared["chapters"] = exec_res_list
        # Clean up the temporary instance variable
        del self.chapters_written_so_far
        print(f"Finished writing {len(exec_res_list)} chapters.")


class CombineTutorial(Node):
    def prep(self, shared):
        project_name = shared["project_name"]
        output_base_dir = shared.get("output_dir", "output")  # Default output dir
        output_path = os.path.join(output_base_dir, project_name)
        repo_url = shared.get("repo_url")  # Get the repository URL
        # language = shared.get("language", "english") # No longer needed for fixed strings

        # Get potentially translated data
        relationships_data = shared[
            "relationships"
        ]  # {"summary": str, "details": [{"from": int, "to": int, "label": str}]} -> summary/label potentially translated
        chapter_order = shared["chapter_order"]  # indices
        abstractions = shared[
            "abstractions"
        ]  # list of dicts -> name/description potentially translated
        chapters_content = shared[
            "chapters"
        ]  # list of strings -> content potentially translated
        use_cache = shared.get("use_cache", True)  # Get use_cache flag

        # --- Generate Mermaid Diagram via LLM ---
        # Prepare abstraction list for prompt
        abstraction_list = []
        for i, abstr in enumerate(abstractions):
            abstraction_list.append(f"- {i}: {abstr['name']}")
        abstraction_listing = "\n".join(abstraction_list)
        
        # Prepare relationship list for prompt
        relationship_list = []
        for rel in relationships_data["details"]:
            from_name = abstractions[rel["from"]]["name"]
            to_name = abstractions[rel["to"]]["name"]
            relationship_list.append(
                f"- From {rel['from']} ({from_name}) to {rel['to']} ({to_name}): {rel['label']}"
            )
        relationship_listing = "\n".join(relationship_list)
        
        # Call LLM to generate the best diagram
        diagram_prompt = f"""Based on the following project structure, generate the MOST appropriate Mermaid diagram to visualize the architecture and relationships.

Project: {project_name}
Summary: {relationships_data['summary']}

Abstractions:
{abstraction_listing}

Relationships:
{relationship_listing}

**Choose the best diagram type:**
- **flowchart TD**: Use for general architecture, coordinators, workflows with multiple components
- **classDiagram**: Use for object-oriented designs with inheritance/composition (BaseClass <|-- SubClass)
- **erDiagram**: Use for data models with entity relationships (User ||--o{{ Post)
- **stateDiagram-v2**: Use for state machines with clear state transitions
- **C4Context**: Use for system architecture with external systems

**Requirements:**
1. Choose the MOST appropriate diagram type based on the project structure
2. Include ALL {len(abstractions)} abstractions as nodes
3. Include ALL {len(relationships_data['details'])} relationships as connections
4. Keep node/edge labels concise (max 30 chars)
5. Use proper Mermaid syntax

Output ONLY the Mermaid diagram code (no markdown fencing, no explanation):
"""
        
        mermaid_diagram = call_llm(diagram_prompt, use_cache=False).strip()
        
        # Remove markdown fencing if LLM added it
        if mermaid_diagram.startswith("```mermaid"):
            mermaid_diagram = mermaid_diagram.split("```mermaid")[1].split("```")[0].strip()
        elif mermaid_diagram.startswith("```"):
            mermaid_diagram = mermaid_diagram.split("```")[1].split("```")[0].strip()
        
        print(f"Generated index diagram using LLM (type: {mermaid_diagram.split()[0] if mermaid_diagram else 'unknown'})")
        # --- End Mermaid ---

        # --- Prepare index.md content ---
        index_content = f"# Tutorial: {project_name}\n\n"
        index_content += f"{relationships_data['summary']}\n\n"  # Use the potentially translated summary directly
        # Keep fixed strings in English
        index_content += f"**Source Repository:** [{repo_url}]({repo_url})\n\n"

        # Add Mermaid diagram for relationships (diagram itself uses potentially translated names/labels)
        index_content += "```mermaid\n"
        index_content += mermaid_diagram + "\n"
        index_content += "```\n\n"

        # Keep fixed strings in English
        index_content += f"## Chapters\n\n"

        chapter_files = []
        # Generate chapter links based on the determined order, using potentially translated names
        for i, abstraction_index in enumerate(chapter_order):
            # Ensure index is valid and we have content for it
            if 0 <= abstraction_index < len(abstractions) and i < len(chapters_content):
                abstraction_name = abstractions[abstraction_index][
                    "name"
                ]  # Potentially translated name
                # Sanitize potentially translated name for filename
                safe_name = "".join(
                    c if c.isalnum() else "_" for c in abstraction_name
                ).lower()
                filename = f"{i+1:02d}_{safe_name}.md"
                index_content += f"{i+1}. [{abstraction_name}]({filename})\n"  # Use potentially translated name in link text

                # Add attribution to chapter content (using English fixed string)
                chapter_content = chapters_content[i]  # Potentially translated content
                if not chapter_content.endswith("\n\n"):
                    chapter_content += "\n\n"
                # Keep fixed strings in English
                chapter_content += f"---\n\n"

                # Store filename and corresponding content
                chapter_files.append({"filename": filename, "content": chapter_content})
            else:
                print(
                    f"Warning: Mismatch between chapter order, abstractions, or content at index {i} (abstraction index {abstraction_index}). Skipping file generation for this entry."
                )

        # Add attribution to index content (using English fixed string)
        index_content += f"\n\n---\n\n"

        return {
            "output_path": output_path,
            "index_content": index_content,
            "chapter_files": chapter_files,  # List of {"filename": str, "content": str}
        }

    def exec(self, prep_res):
        output_path = prep_res["output_path"]
        index_content = prep_res["index_content"]
        chapter_files = prep_res["chapter_files"]

        print(f"Combining tutorial into directory: {output_path}")
        # Rely on Node's built-in retry/fallback
        os.makedirs(output_path, exist_ok=True)

        # Write index.md
        index_filepath = os.path.join(output_path, "index.md")
        with open(index_filepath, "w", encoding="utf-8") as f:
            f.write(index_content)
        print(f"  - Wrote {index_filepath}")

        # Write chapter files
        for chapter_info in chapter_files:
            chapter_filepath = os.path.join(output_path, chapter_info["filename"])
            with open(chapter_filepath, "w", encoding="utf-8") as f:
                f.write(chapter_info["content"])
            print(f"  - Wrote {chapter_filepath}")

        return output_path  # Return the final path

    def post(self, shared, prep_res, exec_res):
        shared["final_output_dir"] = exec_res  # Store the output path
        print(f"\nTutorial generation complete! Files are in: {exec_res}")


class GenerateREADME(Node):
    """
    Generate a comprehensive README.md file for the codebase.
    Includes: Overview, Features, Tech Stack, Installation, Usage, File Structure, 
    API Endpoints, Configuration, Architecture, Troubleshooting.
    """
    def prep(self, shared):
        output_path = shared.get("final_output_dir")
        if not output_path:
            raise ValueError("No output directory found. CombineTutorial must run first.")
        
        project_name = shared.get("project_name", "Project")
        repo_url = shared.get("repo_url", "N/A")
        files_list = shared.get("files", [])  # List of tuples: [(path, content), ...]
        abstractions = shared.get("abstractions", [])  # List of dicts with 'name', 'description', 'file_indices'
        relationships = shared.get("relationships", {})
        language = shared.get("language", "english")
        use_cache = shared.get("use_cache", True)
        
        # Convert list of tuples to dict for easier access
        files_dict = dict(files_list) if files_list else {}
        
        # Get file list for directory tree
        file_list = list(files_dict.keys())
        
        # Extract abstraction names (abstractions are dicts with 'name' key)
        abstraction_names = [abs_item["name"] for abs_item in abstractions if isinstance(abs_item, dict) and "name" in abs_item]
        
        # Detect tech stack from files
        tech_stack = self._detect_tech_stack(files_dict)
        
        # Detect APIs (if any)
        api_info = self._detect_apis(files_dict)
        
        # Detect environment variables
        env_vars = self._detect_env_vars(files_dict)
        
        # Language-specific notes
        lang_notes = {
            "english": "",
            "chinese": " (请注意中文内容应保持专业和准确)",
            "spanish": " (ten en cuenta que el contenido debe ser profesional)",
            "french": " (notez que le contenu doit être professionnel)",
            "german": " (beachten Sie, dass der Inhalt professionell sein sollte)",
            "japanese": " （専門的な内容を維持してください）",
            "korean": " (전문적인 내용을 유지하세요)",
            "portuguese": " (observe que o conteúdo deve ser profissional)",
        }
        instruction_lang_note = lang_notes.get(language, "")
        
        prompt = f"""You are creating a comprehensive, professional README.md file for a GitHub repository.

**Project Name:** {project_name}
**Repository URL:** {repo_url}
**Target Language:** {language.upper()}{instruction_lang_note}

**Detected Information:**
- Tech Stack: {', '.join(tech_stack) if tech_stack else 'Unknown'}
- Total Files: {len(file_list)}
- Core Abstractions: {', '.join(abstraction_names) if abstraction_names else 'None identified'}
- Has APIs: {'Yes' if api_info else 'No'}
- Has Environment Config: {'Yes' if env_vars else 'No'}

**Generate a professional, comprehensive README.md with these sections:**

## 1. Project Title & Badges (Optional)
Use `# {project_name}` as the title. Add relevant badges if appropriate (build status, license, etc.).

## 2. Overview/Description
Provide a clear, concise 2-3 paragraph description of what this project does, its purpose, and who it's for.

## 3. Features
List the key features as bullet points. Be specific and highlight what makes this project valuable.

## 4. Tech Stack
List the technologies, frameworks, and libraries used:
{', '.join(tech_stack) if tech_stack else 'Analyze the codebase to determine the tech stack'}

## 5. Architecture
Include a high-level Mermaid **flowchart** or **C4 diagram** showing the main components and their relationships.
Use the abstractions: {', '.join(abstraction_names[:10]) if abstraction_names else 'Identify from codebase'}

```mermaid
flowchart TD
    %% Create a clear, professional architecture diagram
```

## 6. Installation
Provide step-by-step installation instructions:
- Prerequisites (Node.js, Python, etc.)
- Clone the repository
- Install dependencies
- Setup instructions

## 7. Configuration
Document environment variables and configuration files:
{self._format_env_vars(env_vars) if env_vars else 'List any required configuration'}

## 8. Usage/Getting Started
Explain how to run the application:
- Development mode
- Production build
- Common commands

## 9. File Structure
Provide a clean directory tree showing the main directories and key files:
```
{project_name}/
├── src/           # Source code
├── docs/          # Documentation
└── README.md      # This file
```
Expand based on the actual structure.

## 10. API Documentation (if applicable)
{f'''Document the API endpoints:
{api_info}
''' if api_info else 'Skip this section if no APIs detected.'}

## 11. Troubleshooting/FAQ
Include common issues and solutions (3-5 items).

## 12. Contributing (Optional)
Brief guidelines for contributing to the project.

## 13. License
Mention the license (if detectable from files, otherwise use "MIT" as default).

---

**IMPORTANT INSTRUCTIONS:**
- Write in {language.upper()} language{instruction_lang_note}
- Use professional, clear, and concise language
- Use proper Markdown formatting (headings, lists, code blocks, links)
- Include at least ONE Mermaid diagram for architecture
- Make it look like a high-quality open-source project README
- Be specific - use actual file names, commands, and details from the project
- Keep each section focused and scannable

Generate ONLY the README.md content (no ```markdown``` wrapper):
"""
        
        print(f"Generating README.md for {project_name}...")
        readme_content = call_llm(prompt, use_cache=use_cache)
        
        return {
            "output_path": output_path,
            "readme_content": readme_content
        }
    
    def exec(self, prep_res):
        output_path = prep_res["output_path"]
        readme_content = prep_res["readme_content"]
        
        readme_path = os.path.join(output_path, "README.md")
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(readme_content)
        
        print(f"  - Wrote {readme_path}")
        return readme_path
    
    def post(self, shared, prep_res, exec_res):
        shared["readme_path"] = exec_res
        print(f"README.md generated: {exec_res}")
    
    def _detect_tech_stack(self, files):
        """Detect technologies from file extensions and content."""
        tech = set()
        
        for filepath in files.keys():
            if filepath.endswith('.py'):
                tech.add('Python')
            elif filepath.endswith(('.js', '.jsx', '.ts', '.tsx')):
                tech.add('JavaScript/TypeScript')
                if 'react' in files[filepath].lower():
                    tech.add('React')
            elif filepath.endswith('.java'):
                tech.add('Java')
            elif filepath.endswith(('.cpp', '.c', '.h')):
                tech.add('C/C++')
            elif filepath.endswith('.go'):
                tech.add('Go')
            elif filepath.endswith('.rs'):
                tech.add('Rust')
            elif 'Dockerfile' in filepath:
                tech.add('Docker')
            elif 'package.json' in filepath:
                tech.add('Node.js')
            elif 'requirements.txt' in filepath or 'Pipfile' in filepath:
                tech.add('Python')
            elif 'pom.xml' in filepath or 'build.gradle' in filepath:
                tech.add('Java/Maven/Gradle')
        
        return sorted(tech)
    
    def _detect_apis(self, files):
        """Detect API routes/endpoints from common frameworks."""
        apis = []
        for filepath, content in files.items():
            content_lower = content.lower()
            # FastAPI/Flask
            if '@app.route' in content or '@router.' in content or 'app.get(' in content:
                apis.append(f"API routes detected in {filepath}")
            # Express.js
            elif 'app.get(' in content or 'router.get(' in content:
                apis.append(f"Express routes in {filepath}")
        
        return '\n'.join(apis[:5]) if apis else None
    
    def _detect_env_vars(self, files):
        """Detect environment variables from .env files or config."""
        env_vars = {}
        for filepath, content in files.items():
            if '.env' in filepath.lower() or 'config' in filepath.lower():
                lines = content.split('\n')
                for line in lines[:20]:  # First 20 lines
                    if '=' in line and not line.strip().startswith('#'):
                        parts = line.split('=', 1)
                        if len(parts) == 2:
                            key = parts[0].strip()
                            if key and key.isupper():
                                env_vars[key] = 'Required'
        
        return env_vars
    
    def _format_env_vars(self, env_vars):
        """Format environment variables for README."""
        if not env_vars:
            return "No environment variables detected."
        
        result = "Environment variables:\n\n```env\n"
        for key in list(env_vars.keys())[:10]:  # Show first 10
            result += f"{key}=your_value_here\n"
        result += "```"
        return result
