---
name: memory-organizer
description: Automatically categorizes and structures memory data into organized sections to improve retrieval and prevent information loss.
version: 1.0.0
author: openclaw
tags:
  - memory
  - organization
  - categorization
  - automation
---

# Memory Organizer

Automatically scans, categorizes, and structures memory data into organized sections (projects, contacts, workflows, decisions, etc.) to improve retrieval and prevent information loss.

## Core Capabilities

- Scan memory directories and files for categorizable content
- Classify entries into predefined sections: projects, contacts, workflows, decisions, references, notes
- Detect and resolve duplicate or conflicting entries
- Preserve original data while creating organized structure
- Support custom categorization rules via templates
- Generate organization reports with statistics
- Handle various formats: Markdown, JSON, plain text

## Out of Scope

- Creating new memory data (only organizes existing data)
- AI-powered content generation or summarization
- Integration with external APIs or cloud storage beyond OpenClaw
- Visualization dashboards or GUI interfaces
- Real-time monitoring of memory changes

## Trigger Scenarios

- "Organize my memory data"
- "Categorize my files by project"
- "Sort my contacts and workflows automatically"
- "Structure my memory data better"
- "Auto-organize my OpenClaw workspace"
- "Classify my information into sections"
- "Clean up my memory structure"

## Directory Structure

```
skill/
├── SKILL.md
├── package.json
├── README.md
├── scripts/
│   ├── cli.js          # CLI entry point
│   ├── organizer.js    # Core categorization engine
│   └── config.js       # Configuration management
├── references/
│   └── memory-structure.md
├── assets/
│   ├── templates/
│   │   └── default.json
│   └── examples/
│       ├── basic-usage.md
│       └── agent-integration.md
└── tests/
    └── organizer.test.js
```

## Usage

### CLI

```bash
# Organize a memory directory
node scripts/cli.js organize ./memory

# Organize with a custom template
node scripts/cli.js organize ./memory --template custom-rules.json

# Dry run (preview changes without applying)
node scripts/cli.js organize ./memory --dry-run

# Generate organization report
node scripts/cli.js report ./memory

# Validate memory structure
node scripts/cli.js validate ./memory
```

### Agent Integration

```javascript
const { organizeMemory } = require('./scripts/organizer');

const result = await organizeMemory('./memory', {
  dryRun: false,
  template: 'default',
  verbose: true
});

console.log(result.summary);
```

## Configuration

Place a `memory-organizer.json` in your project root or pass `--template` to override defaults.

```json
{
  "categories": {
    "projects": { "patterns": ["project", "repo", "codebase"], "priority": 1 },
    "contacts": { "patterns": ["contact", "person", "team", "email"], "priority": 2 },
    "workflows": { "patterns": ["workflow", "process", "pipeline", "automation"], "priority": 3 },
    "decisions": { "patterns": ["decision", "chose", "decided", "rationale"], "priority": 4 },
    "references": { "patterns": ["reference", "link", "resource", "docs"], "priority": 5 },
    "notes": { "patterns": ["note", "todo", "reminder", "idea"], "priority": 6 }
  },
  "outputDir": "organized",
  "preserveOriginals": true,
  "minConfidence": 0.3
}
```

## Error Handling

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | Input validation error |
| 2 | File system error |
| 3 | Configuration error |
| 4 | Internal error |

## Technical Requirements

- Node.js >= 14.0.0
- No external runtime dependencies (uses Node.js built-in modules only)
