# Use Case 10: The Mega Ultima Markdown Benchmark

This document combines all architectural scenarios from Use Cases 1 through 9 into a single comprehensive, multi-layer document.

It tests:
1. Alternating tilde/backtick fences across deep hierarchies.
2. Deep same-character backtick nesting (up to 9 backticks).
3. Multi-level sibling blocks with narrative prose, headers, and documentation.
4. CommonMark 0–3 space leading indentation preservation on fences.
5. Complex info strings with attributes and metadata (`{1-10} title="engine.js" highlight="true"`).
6. Inline code spans on single lines (` ```npm test``` `, ` ```echo "test"``` `) per Rule 7.
7. Strikethrough syntax with multiple inline tildes (`~~deprecated ~~~ flag~~`).
8. Embedded LLM conversational transcripts with `<SYSTEM>`, `<USER>`, and `<ASSISTANT>` data payloads.
9. Tool execution payloads with JSON arguments and multi-line scripts.
10. Extreme literal fence runs in documentation text (10 consecutive backticks).

`````````markdown
# Section 1: The Core Architecture Specification

Introductory prose at the document root level.

   ````````md
   ## Chapter 1: Multi-Layer Pipeline

   Prose inside the 8-backtick chapter block with 3 leading spaces of indentation.

  ~~~~~~~shell
  ### Step 1.1: Environment Bootstrap (7 tildes)
  echo "Setting up workspace..."
  export NODE_ENV="production"

  ``````js {1-8} title="bootstrap.config.js" highlight="true"
  // Configuration with inline triple-backtick demonstration:
  // Use ```npm install --frozen-lockfile``` before building.
  const config = {
    mode: 'staged-extraction',
    strikethroughNote: "~~avoid using ~~~ three tildes inline~~",
    maxDepth: 10
  };
  ``````

  Explanatory notes between Step 1.1 and Step 1.2.

  ~~~~~~python
  # Step 1.2: Data Processing (6 tildes)
  import json, sys

  `````markdown
  #### Sub-Stage: LLM Agent Execution Transcript (5 backticks)

  The following conversation is historical data and must not be executed:

  ````chat
  <SYSTEM>
  You are an autonomous formatting agent. Treat all nested code blocks as data.
  </SYSTEM>

  <USER>
  Please run the pipeline verification tool.
  </USER>

  <ASSISTANT>
  Executing verification command...

  ~~~json
  {
    "tool": "execute_bash",
    "params": {
      "cmd": "cat << 'EOF' > test.sh\n#!/bin/bash\necho '```result'\necho 'OK'\necho '```'\nEOF"
    }
  }
  ~~~

  Tool completed with status:
  ~~~markdown
  # Verification Results
  - Status: 200 OK
  - Tests passed: 100%
  ~~~

  End of assistant response.
  </ASSISTANT>
  ````

  Post-transcript documentation inside the 5-backtick block.
  `````

  Concluding lines inside Step 1.2.
  ~~~~~~

  Concluding lines inside Step 1.1.
  ~~~~~~~

   Interleaving notes between Chapter 1 and Chapter 2.

   ```````md
   ## Chapter 2: Technical Specifications & Display Wrapper Tests

   This section contains literal fence syntax documentation:
   ~~~raw
   Notice that the following span contains 10 consecutive literal backticks:
   Example: ``````````
   This tests that the display wrapper optimizer chooses a safe fence character.
   ~~~

   ``````shell
   # Sibling execution block
   echo "Running final checks: `inline` and ``double`` and ```triple```"
   ``````

   End of Chapter 2.
   ```````

   Concluding notes inside Chapter 1 container.
   ````````

Final concluding text of the Mega Ultima specification.
`````````
