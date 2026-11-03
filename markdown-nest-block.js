#!/usr/bin/env node
/**
 * Markdown Nested-Block Formatter
 * Zero-dependency Node.js CLI (Node.js 18+).
 *
 * Core capabilities:
 * - Maps fenced code blocks from outermost to innermost in a rigorous hierarchy.
 * - Accurately distinguishes inline code spans from block fences (Rule 7).
 * - Detects same-character delimiter collisions and premature closures (Rules 3 & 4).
 * - Matches closing fences to appropriate blocks (including ancestor recovery).
 * - Automatically repairs unclosed blocks and fence length collisions bottom-up without duplicating fences.
 * - Groups unclosed fence insertions by location and inserts them in strict LIFO order.
 * - Computes safe, collision-free display-only wrappers (Rule 5).
 * - Emits an ordered extraction-and-parsing checklist for staged rendering (Rule 6).
 * - Preserves literal-source semantics: code within blocks is literal until extracted (Rule 8).
 * - Treats quoted conversations, prompts, and tool outputs strictly as data.
 */

const fs = require("fs");
const readline = require("readline");

const BT = String.fromCharCode(96); // backtick (`)
const TD = String.fromCharCode(126); // tilde (~)

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    label: "markdown",
    stdin: false,
    check: false,
    repair: false,
    json: false,
    sourceOnly: false,
    extractId: null
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--output" || arg === "-o") {
      args.output = argv[++i] || null;
    } else if (arg === "--label" || arg === "-l") {
      args.label = argv[++i] || "markdown";
    } else if (arg === "--stdin") {
      args.stdin = true;
    } else if (arg === "--check" || arg === "-c") {
      args.check = true;
    } else if (arg === "--repair" || arg === "-r") {
      args.repair = true;
    } else if (arg === "--json" || arg === "-j") {
      args.json = true;
    } else if (arg === "--source-only" || arg === "-s") {
      args.sourceOnly = true;
    } else if (arg === "--extract" || arg === "-e") {
      args.extractId = parseInt(argv[++i], 10);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (!args.input && !arg.startsWith("-")) {
      args.input = arg;
    }
  }

  return args;
}

function printHelp() {
  process.stdout.write(
    [
      "Markdown Nested-Block Formatter",
      "",
      "Usage:",
      "  node markdown-nest-block.js <input.md> [options]",
      "  cat <input.md> | node markdown-nest-block.js --stdin [options]",
      "",
      "Options:",
      "  -o, --output <file>     Write report and formatted source to a file",
      "  -l, --label <label>     Info string for the display wrapper (default: markdown)",
      "  -c, --check             Validation/lint mode: exits with 0 if valid, 1 if issues found",
      "  -r, --repair            Force auto-repair of unclosed blocks and fence collisions",
      "  -s, --source-only       Output only the formatted/repaired Markdown source",
      "  -j, --json              Output analysis, AST, and checklist as JSON",
      "  -e, --extract <id>      Extract the body of a specific block by ID",
      "  --stdin                 Read Markdown source from standard input",
      "  -h, --help              Show this help message",
      "",
      "Dependencies:",
      "  Node.js 18+ only. No npm packages or external binaries required."
    ].join("\n") + "\n"
  );
}

async function readStdin() {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false
  });

  const chunks = [];
  for await (const line of rl) {
    chunks.push(line);
  }
  return chunks.join("\n");
}

function fenceMatch(line) {
  // CommonMark spec: 0-3 spaces indentation, followed by 3+ backticks or 3+ tildes
  const pattern = new RegExp("^([ ]{0,3})([" + BT + TD + "]{3,})(.*)$");
  const match = line.match(pattern);
  if (!match) return null;

  const indent = match[1].length;
  const fenceStr = match[2];
  const char = fenceStr[0];
  const length = fenceStr.length;
  const rest = match[3];

  // Rule 7: Distinguish inline code spans from fenced code blocks.
  // Backtick fences: CommonMark forbids backticks in info string or rest of line.
  // Also, lines containing matched closing inline spans (e.g. ```hello```) are inline code.
  if (char === BT && rest.includes(BT)) return null;
  if (char === TD && rest.includes(TD)) return null;

  const info = rest.trim();
  return {
    char,
    length,
    info,
    indent,
    raw: line
  };
}

function isClosingFence(match, openBlock) {
  if (!match || !openBlock) return false;
  return (
    match.char === openBlock.char &&
    match.length >= openBlock.length &&
    match.info.length === 0
  );
}

function buildFenceMap(source) {
  const lines = source.split(/\r?\n/);
  const stack = [];
  const blocks = [];
  const unclosed = [];
  let blockId = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const match = fenceMatch(line);
    if (!match) continue;

    if (match.info === "") {
      const top = stack.length > 0 ? stack[stack.length - 1] : null;

      // 1. Direct match with top of stack
      if (top && match.char === top.char && match.length >= top.length) {
        top.closeLine = lineIndex;
        top.closeFence = match.char.repeat(match.length);
        top.closeLength = match.length;
        top.closeIndent = match.indent;
        stack.pop();
        continue;
      }

      // 2. Ancestor match: check if this closing fence matches an open ancestor on stack
      let matchedAncestorIndex = -1;
      for (let j = stack.length - 2; j >= 0; j--) {
        const ancestor = stack[j];
        if (match.char === ancestor.char) {
          matchedAncestorIndex = j;
          break;
        }
      }

      if (matchedAncestorIndex !== -1) {
        // All blocks above matchedAncestorIndex were abandoned unclosed inside this ancestor
        while (stack.length - 1 > matchedAncestorIndex) {
          const abandoned = stack.pop();
          abandoned.missingCloseLine = lineIndex;
          unclosed.push(abandoned);
        }

        const ancestor = stack.pop();
        ancestor.closeLine = lineIndex;
        ancestor.closeFence = match.char.repeat(match.length);
        ancestor.closeLength = match.length;
        ancestor.closeIndent = match.indent;
        continue;
      }
    }

    // Opening fence
    const top = stack.length > 0 ? stack[stack.length - 1] : null;
    blockId += 1;
    const block = {
      id: blockId,
      parentId: top ? top.id : null,
      parent: top,
      depth: stack.length + 1,
      openLine: lineIndex,
      closeLine: null,
      missingCloseLine: null,
      openFence: match.char.repeat(match.length),
      closeFence: null,
      closeLength: null,
      closeIndent: 0,
      char: match.char,
      length: match.length,
      info: match.info,
      indent: match.indent,
      children: [],
      contentLines: []
    };

    if (top) {
      top.children.push(block);
    }
    blocks.push(block);
    stack.push(block);
  }

  // Any blocks remaining on the stack are unclosed at the end of the file
  while (stack.length > 0) {
    const unclosedBlock = stack.pop();
    unclosedBlock.missingCloseLine = lines.length;
    unclosed.push(unclosedBlock);
  }

  for (const block of blocks) {
    if (block.closeLine !== null) {
      block.contentLines = lines.slice(block.openLine + 1, block.closeLine);
    } else {
      block.contentLines = lines.slice(block.openLine + 1);
    }
  }

  return {
    blocks,
    lines,
    unclosed
  };
}

function longestFenceRun(source, char) {
  const escaped = char === BT ? "\\" + BT : char;
  const pattern = new RegExp(escaped + "{3,}", "g");
  let max = 0;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    max = Math.max(max, match[0].length);
  }

  return max;
}

function chooseDisplayWrapper(source) {
  const backtickMax = longestFenceRun(source, BT);
  const tildeMax = longestFenceRun(source, TD);

  const btReq = backtickMax === 0 ? 3 : backtickMax + 1;
  const tdReq = tildeMax === 0 ? 3 : tildeMax + 1;

  let char;
  let length;

  if (tildeMax === 0) {
    char = TD;
    length = 3;
  } else if (backtickMax === 0) {
    char = BT;
    length = 3;
  } else if (tdReq < btReq) {
    char = TD;
    length = tdReq;
  } else {
    char = BT;
    length = btReq;
  }

  return {
    char,
    length: Math.max(3, length),
    innerBacktickMax: backtickMax,
    innerTildeMax: tildeMax
  };
}

function validateSource(source, blocks, unclosed) {
  const issues = [];

  if (unclosed.length > 0) {
    issues.push(
      "Unclosed fenced block(s): " +
      unclosed.map((b) => "#" + b.id + " (" + (b.info || "unlabeled") + ", line " + (b.openLine + 1) + ")").join(", ")
    );
  }

  const wrapper = chooseDisplayWrapper(source);

  if (wrapper.char === BT && wrapper.length <= wrapper.innerBacktickMax) {
    issues.push("Backtick display wrapper length (" + wrapper.length + ") does not exceed inner backtick run (" + wrapper.innerBacktickMax + ").");
  }

  if (wrapper.char === TD && wrapper.length <= wrapper.innerTildeMax) {
    issues.push("Tilde display wrapper length (" + wrapper.length + ") does not exceed inner tilde run (" + wrapper.innerTildeMax + ").");
  }

  const isLineInDescendant = (lineIdx, block) => {
    return block.children.some((ch) => {
      const close = ch.closeLine !== null ? ch.closeLine : Infinity;
      return (lineIdx >= ch.openLine && lineIdx <= close) || isLineInDescendant(lineIdx, ch);
    });
  };

  for (const block of blocks) {
    if (block.closeLine === null) continue;

    // Check descendant blocks with the same character
    const checkDescendants = (node) => {
      for (const ch of node.children) {
        if (ch.char === block.char) {
          if (block.length <= ch.length) {
            issues.push(
              "Block #" + block.id + " (" + (block.info || "unlabeled") + ", line " + (block.openLine + 1) + ") uses " +
              block.length + " " + block.char + " marks, but nested child Block #" + ch.id + " (" + (ch.info || "unlabeled") +
              ", line " + (ch.openLine + 1) + ") uses " + ch.length + " " + ch.char + " marks. The inner block will prematurely close or collide with the ancestor during staged extraction."
            );
          }
          if (ch.closeLength && block.length <= ch.closeLength) {
            issues.push(
              "Block #" + block.id + " (" + (block.info || "unlabeled") + ", line " + (block.openLine + 1) + ") uses " +
              block.length + " " + block.char + " marks, but child Block #" + ch.id + " closing fence at line " + (ch.closeLine + 1) +
              " uses " + ch.closeLength + " " + ch.char + " marks."
            );
          }
        }
        checkDescendants(ch);
      }
    };
    checkDescendants(block);

    // Check standalone literal fence runs within direct content
    const standalonePattern = new RegExp("^([ ]{0,3})([" + BT + TD + "]{3,})([ \t]*)$");
    for (let i = 0; i < block.contentLines.length; i++) {
      const lineIdx = block.openLine + 1 + i;
      if (!isLineInDescendant(lineIdx, block)) {
        const text = block.contentLines[i];
        const m = text.match(standalonePattern);
        if (m && m[2][0] === block.char) {
          const runLen = m[2].length;
          if (block.length <= runLen) {
            issues.push(
              "Block #" + block.id + " (" + (block.info || "unlabeled") + ", line " + (block.openLine + 1) + ") uses " +
              block.length + " " + block.char + " marks, but contains a standalone fence run of " + runLen + " " + block.char +
              " marks at line " + (lineIdx + 1) + " which will prematurely terminate the block."
            );
          }
        }
      }
    }
  }

  return {
    wrapper,
    issues
  };
}

function repairSource(source) {
  let { blocks, lines, unclosed } = buildFenceMap(source);

  // 1. Group unclosed insertions by missingCloseLine and insert in exact LIFO order
  if (unclosed.length > 0) {
    const groups = new Map();
    for (const u of unclosed) {
      const lineIdx = u.missingCloseLine;
      if (!groups.has(lineIdx)) groups.set(lineIdx, []);
      groups.get(lineIdx).push(u);
    }

    // Sort insertion line positions descending so earlier line numbers stay valid
    const sortedLines = [...groups.keys()].sort((a, b) => b - a);
    const lineArray = [...lines];

    for (const lineIdx of sortedLines) {
      const group = groups.get(lineIdx);
      // Sort deepest first (highest depth first)
      group.sort((a, b) => b.depth - a.depth);
      const closers = group.map((u) => {
        const spaces = " ".repeat(u.indent || 0);
        return spaces + u.char.repeat(u.length);
      });

      if (lineIdx >= lineArray.length) {
        lineArray.push(...closers);
      } else {
        lineArray.splice(lineIdx, 0, ...closers);
      }
    }

    source = lineArray.join("\n");
    const reparse = buildFenceMap(source);
    blocks = reparse.blocks;
    lines = reparse.lines;
    unclosed = reparse.unclosed;
  }

  // 2. Adjust fence lengths bottom-up
  const isLineInDescendant = (lineIdx, block) => {
    return block.children.some((ch) => {
      const close = ch.closeLine !== null ? ch.closeLine : Infinity;
      return (lineIdx >= ch.openLine && lineIdx <= close) || isLineInDescendant(lineIdx, ch);
    });
  };

  const getDirectLiteralMax = (block) => {
    let max = 0;
    const standalonePattern = new RegExp("^([ ]{0,3})([" + BT + TD + "]{3,})([ \t]*)$");
    for (let i = block.openLine + 1; i < (block.closeLine || lines.length); i++) {
      if (!isLineInDescendant(i, block)) {
        const m = lines[i].match(standalonePattern);
        if (m && m[2][0] === block.char) {
          max = Math.max(max, m[2].length);
        }
      }
    }
    return max;
  };

  const sortedByDepthDesc = [...blocks].sort((a, b) => b.depth - a.depth);
  const newLengths = new Map();

  for (const b of sortedByDepthDesc) {
    const litMax = getDirectLiteralMax(b);
    let minReq = Math.max(3, b.length, litMax + 1);

    const checkDescendants = (node) => {
      for (const ch of node.children) {
        if (ch.char === b.char) {
          const chLen = newLengths.get(ch.id) || ch.length;
          minReq = Math.max(minReq, chLen + 1);
        }
        checkDescendants(ch);
      }
    };
    checkDescendants(b);
    newLengths.set(b.id, minReq);
  }

  let changed = false;
  for (const b of blocks) {
    if (newLengths.get(b.id) !== b.length) {
      changed = true;
      break;
    }
  }

  if (!changed) return source;

  const modifiedLines = [...lines];
  for (const b of blocks) {
    const targetLen = newLengths.get(b.id);
    const spaces = " ".repeat(b.indent || 0);
    modifiedLines[b.openLine] = spaces + b.char.repeat(targetLen) + (b.info ? b.info : "");
    if (b.closeLine !== null) {
      modifiedLines[b.closeLine] = spaces + b.char.repeat(targetLen);
    }
  }

  return modifiedLines.join("\n");
}

function makeFenceMapReport(blocks) {
  if (blocks.length === 0) {
    return "No fenced code blocks were detected.";
  }

  const rows = blocks.map((block) => {
    const parent = block.parentId ? "Block #" + block.parentId : "document root";
    const state = block.closeLine === null ? "unclosed" : "closed (L" + (block.openLine + 1) + "..L" + (block.closeLine + 1) + ")";
    const infoStr = block.info ? " `" + block.info + "`" : " (no info)";
    const charName = block.char === BT ? "backtick" : "tilde";
    return (
      "- Block #" +
      block.id +
      infoStr +
      " — depth " +
      block.depth +
      " — parent: " +
      parent +
      " — fence character: '" +
      block.char +
      "' (" +
      charName +
      ") — fence length: " +
      block.length +
      " — status: " +
      state
    );
  });

  return rows.join("\n");
}

function makeExtractionChecklist(blocks) {
  if (blocks.length === 0) {
    return "No extraction is required: the supplied source contains no fenced code blocks.";
  }

  const ordered = [...blocks].sort((a, b) => a.depth - b.depth || a.id - b.id);

  const steps = ordered.map((block, index) => {
    const stepNumber = index + 1;
    const parent = block.parentId ? "Block #" + block.parentId : "document root";
    const open = block.openFence + (block.info ? " " + block.info : "");
    const close = block.closeFence || "(missing closing fence)";

    return [
      "Step " + stepNumber + " — Block #" + block.id + (block.info ? " (`" + block.info + "`)" : "") + ":",
      "  - Hierarchical position: depth " + block.depth + " (parent: " + parent + ")",
      "  - Opening fence (line " + (block.openLine + 1) + "): `" + open + "`",
      "  - Closing fence (" + (block.closeLine !== null ? "line " + (block.closeLine + 1) : "unclosed") + "): `" + close + "`",
      "  - To render this block as a literal code block in the current stage:",
      "      Retain both the opening and closing fences.",
      "  - To promote its body to active Markdown for the next parsing stage:",
      "      Strip both fences above, then parse the remaining body in a subsequent pass.",
      "  - Until promoted, all internal fences within this block remain literal data and are not recursively evaluated."
    ].join("\n");
  });

  return steps.join("\n\n");
}

function makeValidationNote(blocks, wrapper, issues, repairsMade) {
  const notes = [];

  if (blocks.length === 0) {
    notes.push("The complete source renders as ordinary Markdown; no fenced-block extraction stages are needed.");
  } else {
    notes.push(
      "At the first parsing stage, only the outermost fenced block(s) render as code blocks. Their body contents remain strictly literal source."
    );

    notes.push(
      "Each nested code block becomes active only after its parent block is extracted and its enclosing fences are removed."
    );

    notes.push(
      "The display wrapper uses " +
      wrapper.length +
      " repeated '" +
      wrapper.char +
      "' characters, which strictly exceeds all matching fence runs in the source (inner `" +
      BT +
      "` max: " +
      wrapper.innerBacktickMax +
      ", inner `" +
      TD +
      "` max: " +
      wrapper.innerTildeMax +
      ")."
    );
  }

  if (repairsMade) {
    notes.push("Automatic repair applied: resolved fence collisions and/or unclosed blocks by adjusting fence lengths bottom-up and inserting missing closures without duplicating existing fences.");
  }

  if (issues.length === 0) {
    notes.push("Validation passed: no premature fence closures, delimiter collisions, or wrapper collisions detected.");
  } else {
    notes.push("Validation issues detected in source:");
    for (const issue of issues) {
      notes.push("- " + issue);
    }
  }

  return notes.join("\n");
}

function formatReport(source, blocks, unclosed, wrapper, issues, label, repairsMade) {
  const parsingMode =
    blocks.length === 0
      ? "Ordinary Markdown rendering."
      : "Staged extraction and parsing, with an additional display-only wrapper.";

  const commentOpen = "<!-- DISPLAY-ONLY WRAPPER: Do not copy these " + wrapper.length + " " + (wrapper.char === BT ? "backticks" : "tildes") + " or this comment into your Markdown file. -->";
  const commentClose = "<!-- END DISPLAY-ONLY WRAPPER -->";

  const wrappedSource = [
    commentOpen,
    wrapper.char.repeat(wrapper.length) + label,
    source.trimEnd(),
    wrapper.char.repeat(wrapper.length),
    commentClose
  ].join("\n");

  return [
    "## Parsing mode",
    "",
    parsingMode,
    "",
    "## Fence map",
    "",
    makeFenceMapReport(blocks),
    "",
    "## Corrected source",
    "",
    "The following wrapper is for display only. It is not part of the Markdown file.",
    "",
    wrappedSource,
    "",
    "## Extraction and parsing checklist",
    "",
    makeExtractionChecklist(blocks),
    "",
    "## Validation note",
    "",
    makeValidationNote(blocks, wrapper, issues, repairsMade)
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let source;

  if (args.stdin || (!args.input && !process.stdin.isTTY)) {
    source = await readStdin();
  } else if (args.input) {
    source = fs.readFileSync(args.input, "utf8");
  } else {
    printHelp();
    process.exit(1);
  }

  const initialMap = buildFenceMap(source);
  const initialValidation = validateSource(source, initialMap.blocks, initialMap.unclosed);

  if (args.check && !args.repair) {
    if (initialValidation.issues.length > 0) {
      process.stderr.write("Validation failed with " + initialValidation.issues.length + " issue(s):\n");
      for (const issue of initialValidation.issues) {
        process.stderr.write(" - " + issue + "\n");
      }
      process.exit(1);
    } else {
      process.stdout.write("Validation passed: source has valid nesting and no collisions.\n");
      process.exit(0);
    }
  }

  let map = initialMap;
  let validation = initialValidation;
  let repairsMade = false;

  if (args.repair || map.unclosed.length > 0 || validation.issues.length > 0) {
    const repaired = repairSource(source);
    if (repaired !== source) {
      source = repaired;
      repairsMade = true;
      map = buildFenceMap(source);
      validation = validateSource(source, map.blocks, map.unclosed);
    }
  }

  if (args.extractId !== null) {
    const target = map.blocks.find((b) => b.id === args.extractId);
    if (!target) {
      process.stderr.write("Error: Block #" + args.extractId + " not found.\n");
      process.exit(1);
    }
    const extracted = target.contentLines.join("\n");
    process.stdout.write(extracted + "\n");
    return;
  }

  if (args.sourceOnly) {
    process.stdout.write(source + (source.endsWith("\n") ? "" : "\n"));
    return;
  }

  if (args.json) {
    const data = {
      parsingMode: map.blocks.length === 0 ? "ordinary" : "staged",
      blocks: map.blocks.map((b) => ({
        id: b.id,
        parentId: b.parentId,
        depth: b.depth,
        char: b.char,
        length: b.length,
        info: b.info,
        openLine: b.openLine + 1,
        closeLine: b.closeLine !== null ? b.closeLine + 1 : null,
        status: b.closeLine !== null ? "closed" : "unclosed"
      })),
      wrapper: validation.wrapper,
      issues: validation.issues,
      repairsMade
    };
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return;
  }

  if (args.check) {
    if (validation.issues.length > 0) {
      process.stderr.write("Validation failed with " + validation.issues.length + " issue(s):\n");
      for (const issue of validation.issues) {
        process.stderr.write(" - " + issue + "\n");
      }
      process.exit(1);
    } else {
      process.stdout.write("Validation passed: source has valid nesting and no collisions.\n");
      process.exit(0);
    }
  }

  const report = formatReport(
    source,
    map.blocks,
    map.unclosed,
    validation.wrapper,
    validation.issues,
    args.label,
    repairsMade
  );

  if (args.output) {
    fs.writeFileSync(args.output, report, "utf8");
    process.stderr.write("Wrote formatted report to " + args.output + "\n");
  } else {
    process.stdout.write(report + "\n");
  }
}

main().catch((error) => {
  process.stderr.write("Error: " + error.message + "\n");
  process.exit(1);
});
