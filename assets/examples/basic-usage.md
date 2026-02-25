# Basic Usage Examples

## Organize a Memory Directory

```bash
# Organize all files in a memory directory
node scripts/cli.js organize ./my-memory

# Preview changes first with --dry-run
node scripts/cli.js organize ./my-memory --dry-run

# Use verbose mode for detailed output
node scripts/cli.js organize ./my-memory --verbose
```

## Example Input

Given a memory directory with these files:

```
my-memory/
├── project-alpha-notes.md
├── team-contacts.md
├── deploy-pipeline.md
├── why-we-chose-react.md
├── useful-links.md
├── random-thoughts.txt
└── meeting-notes.md
```

## Expected Output

After running `node scripts/cli.js organize ./my-memory`:

```
my-memory/
├── (original files preserved)
└── organized/
    ├── _index.md
    ├── projects/
    │   ├── _index.md
    │   └── project-alpha-notes.md
    ├── contacts/
    │   ├── _index.md
    │   └── team-contacts.md
    ├── workflows/
    │   ├── _index.md
    │   └── deploy-pipeline.md
    ├── decisions/
    │   ├── _index.md
    │   └── why-we-chose-react.md
    ├── references/
    │   ├── _index.md
    │   └── useful-links.md
    └── notes/
        ├── _index.md
        ├── random-thoughts.txt
        └── meeting-notes.md
```

## Using a Custom Template

```bash
# Create a custom template
cat > my-template.json << 'EOF'
{
  "categories": {
    "frontend": {
      "patterns": ["react", "css", "html", "ui", "component"],
      "priority": 1,
      "description": "Frontend code and documentation"
    },
    "backend": {
      "patterns": ["api", "server", "database", "sql", "node"],
      "priority": 2,
      "description": "Backend services and APIs"
    }
  },
  "minConfidence": 0.2
}
EOF

# Use the custom template
node scripts/cli.js organize ./memory --template my-template.json
```

## Generating a Report

```bash
node scripts/cli.js report ./my-memory
```

Output:
```
# Memory Organization Report

Directory: /path/to/my-memory
Total files: 7
Categories detected: 5

## Notes (2 files, avg confidence: 52%)
- random-thoughts.txt (60%)
- meeting-notes.md (45%)

## Projects (1 files, avg confidence: 80%)
- project-alpha-notes.md (80%)
...
```

## Validating a Directory

```bash
node scripts/cli.js validate ./my-memory
```

Output:
```
Directory is valid for organization.
Found 7 organizable file(s).
```
