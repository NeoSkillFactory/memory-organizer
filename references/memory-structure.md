# Memory Structure Reference

## Overview

Memory data in OpenClaw agents is stored as files in a memory directory. This document describes the supported structures and categorization rules.

## Supported File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| Markdown | .md | Primary format for notes, docs, decisions |
| Plain text | .txt | Simple notes, logs |
| JSON | .json | Structured data, configs |
| YAML | .yaml, .yml | Configuration files |

## Default Categories

### Projects
Information about codebases, repositories, services, and applications.
**Patterns:** project, repo, codebase, repository, app, service, module, package

### Contacts
People, teams, and organizational information.
**Patterns:** contact, person, team, email, colleague, member, contributor, author

### Workflows
Process definitions, CI/CD pipelines, and automation scripts.
**Patterns:** workflow, process, pipeline, automation, ci, cd, deploy, build, script

### Decisions
Architectural decisions, tradeoffs, and rationale.
**Patterns:** decision, chose, decided, rationale, tradeoff, trade-off, why, because, reasoning

### References
External links, documentation, and resource pointers.
**Patterns:** reference, link, resource, docs, documentation, api, url, http, guide

### Notes
General notes, TODOs, reminders, and scratch ideas.
**Patterns:** note, todo, reminder, idea, thought, memo, scratch, draft, temp

## Confidence Scoring

Files are classified based on a confidence score (0-1):

- **Filename match** carries 3x weight (filenames are strong category signals)
- **Content matches** are counted up to 5 per pattern (to avoid bias from repetition)
- The **minimum confidence threshold** (default: 0.3) determines the cutoff for categorization
- Files below the threshold are placed in an **uncategorized** bucket

## Organization Output

The organizer creates an `organized/` directory with:

```
organized/
├── _index.md          # Master index linking all categories
├── projects/
│   ├── _index.md      # Category index with confidence scores
│   └── ...files...
├── contacts/
│   └── ...
├── workflows/
│   └── ...
├── decisions/
│   └── ...
├── references/
│   └── ...
├── notes/
│   └── ...
└── uncategorized/
    └── ...
```

Each category directory contains:
- Copied files (originals are preserved by default)
- An `_index.md` with a table of files and their confidence scores
