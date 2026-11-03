# Use Case 4: Interleaved Sibling Blocks at Multiple Depths

This document tests hierarchical sibling isolation, tree branch restoration, and arbitrary text interleaving between nested blocks.

``````markdown
# Top-level Document

Narrative paragraph before any nested blocks.

`````md
## Section 1: Data Pipeline Specification

Here is the specification for the extraction pipeline:

````bash
# Step 1: Ingestion
curl -s https://api.example.com/data | jq .
````

Some explanatory notes between the two sibling code blocks:
- Sibling A runs the ingestion bash command.
- Sibling B processes the output using Python.

````python
# Step 2: Processing
import json, sys
data = json.load(sys.stdin)
print(f"Processed {len(data)} records")
````

Post-processing documentation inside Section 1.
`````

Interleaving text between Section 1 and Section 2.

`````md
## Section 2: Verification Suite

This section contains a tilde-fenced verification block:

~~~~python
# Test assertions
def test_pipeline():
    assert True
~~~~

Final concluding notes inside Section 2.
`````

Final concluding text of the outer document.
``````
