# memory-organizer

![Audit](https://img.shields.io/badge/audit%3A%20PASS-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![OpenClaw](https://img.shields.io/badge/OpenClaw-skill-orange)

> Automatically categorizes and structures memory data into organized sections to improve retrieval and prevent information loss.

## Features

- Scan memory directories and files for categorizable content
- Classify entries into predefined sections: projects, contacts, workflows, decisions, references, notes
- Detect and resolve duplicate or conflicting entries
- Preserve original data while creating organized structure
- Support custom categorization rules via templates
- Generate organization reports with statistics
- Handle various formats: Markdown, JSON, plain text

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

## GitHub

Source code: [github.com/NeoSkillFactory/memory-organizer](https://github.com/NeoSkillFactory/memory-organizer)

## License

MIT © NeoSkillFactory