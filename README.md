# Markdown Nested-Block Formatter

A zero-dependency Node.js CLI utility implementing the **Markdown Nested-Block Formatter Skill 1.0**.

The utility formats, maps, validates, repairs, and extracts multi-layer nested Markdown fenced code blocks for staged extraction and display. It operates strictly under **CommonMark specification semantics** (Node.js 18+ built-ins only, no npm dependencies, no external binaries, and no network access).

---

## The Core Concept: Literal-Source Semantics

In CommonMark Markdown, **fenced code blocks do not nest automatically**. When a parser encounters an opening code fence, the entire body is treated as literal text until a matching closing fence is reached. Any internal fences within that block do not render as active Markdown—they remain literal source.

To render nested structures, an author must perform **staged extraction and reparsing**, processing content one layer at a time:
1. **Stage 1**: Only the outermost block is active; inner blocks are literal content.
2. **Subsequent Stages**: When an outer block's fences are stripped, the immediate child blocks become active Markdown code blocks.
3. **Delimiter Collision Hazard**: If an inner block uses the same fence character (e.g. backticks `` ` `` or tildes `~`) with a length greater than or equal to an enclosing ancestor, the inner fence will **prematurely terminate the ancestor block** when extracted, breaking the document structure.

This utility automates fence mapping, collision detection, bottom-up auto-repair, safe display wrapping, and ordered extraction checklist generation.

---

## Installation & Requirements

- **Runtime:** Node.js 18 or newer
- **Dependencies:** None (uses built-in `fs`, `readline`, `process`)
- **File:** `markdown-nest-block.js`

Make executable (optional):
```bash
chmod +x markdown-nest-block.js
```

---

## CLI Usage

```text
Markdown Nested-Block Formatter

Usage:
  node markdown-nest-block.js <input.md> [options]
  cat <input.md> | node markdown-nest-block.js --stdin [options]

Options:
  -o, --output <file>     Write report and formatted source to a file
  -l, --label <label>     Info string for the display wrapper (default: markdown)
  -c, --check             Validation/lint mode: exits with 0 if valid, 1 if issues found
  -r, --repair            Force auto-repair of unclosed blocks and fence collisions
  -s, --source-only       Output only the formatted/repaired Markdown source
  -j, --json              Output analysis, AST, and checklist as JSON
  -e, --extract <id>      Extract the body of a specific block by ID
  --stdin                 Read Markdown source from standard input
  -h, --help              Show this help message
```

### Examples

#### 1. Generate full Markdown report
```bash
node markdown-nest-block.js use_case_1.txt
```

#### 2. Lint a document in CI/CD (exits with code 1 if collisions or unclosed blocks exist)
```bash
node markdown-nest-block.js use_case_9_collision_and_autorepair.md --check
```

#### 3. Automatically repair collisions and unclosed fences, outputting repaired source
```bash
node markdown-nest-block.js "Examples 1 and 2.txt" --repair --source-only
```

#### 4. Extract the literal body of a specific nested block (e.g., Block #3)
```bash
node markdown-nest-block.js use_case_3.txt --extract 3
```

#### 5. Output structural JSON AST
```bash
node markdown-nest-block.js use_case_2.txt --json
```

---

## Skill 1.0 Rules & Implementation Details

1. **Hierarchy & Fence Mapping (Rule 1)**: Identifies every fenced code block, assigns a unique ID, tracks parent IDs, and determines exact nesting depth (from document root at depth 1 down to arbitrary nesting depths).
2. **CommonMark Fence Compliance (Rule 2)**:
   - Recognizes code fences starting with 0–3 spaces of indentation.
   - Fences require at least 3 identical backticks or tildes.
   - Closing fences must use the same character, have at least the opener's length, and contain no info string.
3. **Delimiter Collision Detection (Rules 3 & 4)**:
   - Detects when an inner block or standalone fence line uses the same character with length $\ge$ an enclosing ancestor.
   - Identifies which blocks will be prematurely terminated during staged extraction.
4. **Bottom-Up Auto-Repair & Non-Duplicating Ancestor Recovery**:
   - Matches closing fences to open ancestors when an inner block was left unclosed, recognizing existing closing fences rather than treating them as new openers.
   - Inserts missing closing fences at their exact missing line locations in strict LIFO order, avoiding duplicate fences ("dupping").
   - Computes minimum safe fence lengths using a bottom-up post-order traversal:
     $$\text{Length}(B) \ge \max\left(3, \text{currentLength}, \text{directLiteralMax} + 1, \max_{D \in \text{descendants}(B), D.\text{char}=B.\text{char}}(\text{Length}(D)) + 1\right)$$
   - Updates existing opening and closing fence lengths in-place, ensuring strictly one closing fence exists for each open block.
5. **Safe Display Wrapper (Rule 5)**:
   - Scans the entire source for the longest runs of backticks and tildes.
   - Chooses the fence character that minimizes required length while strictly exceeding all matching internal runs.
   - Emits display-only comment headers stating the wrapper is not part of the Markdown document.
6. **Staged Extraction Checklist (Rule 6)**:
   - Produces an ordered, actionable checklist from outermost to innermost blocks.
   - Explicitly instructs which opening and closing fences to retain (for literal code display) or strip (to promote the body to active Markdown for the next parsing pass).
7. **Inline Code Span Distinction (Rule 7)**:
   - Accurately distinguishes inline spans (e.g. ```` ```hello``` ````, `~~text~~`, or ` `code` `) from block fences, ensuring zero false positives.
8. **Literal-Source Semantics (Rule 8)**:
   - Never describes inner fences as "recursively rendered Markdown"; preserves them strictly as data until explicitly promoted.

---

## Validation & Test Suite

The test suite validates both valid and invalid nesting hierarchies across various topologies:

| File | Structure & Features Tested | Validation Status |
| :--- | :--- | :--- |
| `use_case_1.txt` | Alternating tilde/backtick 6-layer nesting (`shell` $\to$ `md` $\to$ `python` $\to$ `markdown` $\to$ `r` $\to$ `md`) | **PASSED** (0 issues) |
| `use_case_2.txt` | Deep pure-backtick nesting (8 down to 3 backticks across 6 layers) | **PASSED** (0 issues) |
| `use_case_3.txt` | Outer 5-backtick block with 4-backtick sub-block and sibling 3-backtick block | **PASSED** (0 issues) |
| `Examples 1 and 2.txt` | Example 1 (collision error benchmark) and Example 2 (clean fixed version) | Example 1: 6 collisions detected & repaired; Example 2: **PASSED** |
| `use_case_4_interleaved_siblings.md` | Multi-level sibling blocks interleaved with narrative prose and headings | **PASSED** (0 issues) |
| `use_case_5_inline_and_fenced_delimiters.md` | Inline code spans (` ```inline``` `), strikethroughs (`~~ ~~~ ~~`), and attribute info strings | **PASSED** (0 issues) |
| `use_case_6_indented_blocks_and_quotes.md` | CommonMark 0–3 space leading indentation preservation on parent and child blocks | **PASSED** (0 issues) |
| `use_case_7_extreme_nesting_and_wrapper_safety.md` | Deep 7-layer nesting with embedded 10-mark fence runs; tests wrapper delimiter optimization | **PASSED** (0 issues) |
| `use_case_8_llm_agent_transcript_and_tools.md` | Agentic AI transcript with system prompts, user questions, and JSON tool arguments | **PASSED** (0 issues) |
| `use_case_9_collision_and_autorepair.md` | Intentional multi-tier collisions and unclosed blocks; tests non-duplicating repair | **PASSED** (Verified failure on check, clean non-duplicated repair) |
| `use_case_10_mega_ultima.md` | Comprehensive mega-benchmark combining all scenarios (alternating, deep backticks, siblings, attributes, indented, LLM transcript) | **PASSED** (0 issues) |
| `use_case_11_tremendously_messed.md` | Stress test with inverted lengths, unclosed tilde/ruby/yaml blocks, irregular indentation; tests full auto-repair recovery | **PASSED** (Verified failure on check, clean 1-to-1 pair repair) |
