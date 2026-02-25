# Agent Integration Examples

## Programmatic API

```javascript
const { organizeMemory, generateReport, validateDirectory } = require('./scripts/organizer');

// Organize with default settings
const result = await organizeMemory('./memory');
console.log(result.summary);
// result.stats: { total, categorized, uncategorized }
// result.organized: { category: [{ filePath, relativePath, confidence }] }

// Dry run
const preview = await organizeMemory('./memory', { dryRun: true, verbose: true });
console.log(preview.summary);

// With custom template
const custom = await organizeMemory('./memory', {
  template: './assets/templates/default.json'
});

// Generate report
const report = await generateReport('./memory');
console.log(report.report);

// Validate directory
const validation = await validateDirectory('./memory');
if (!validation.valid) {
  console.error('Issues:', validation.issues);
}
```

## OpenClaw Agent Hook

```javascript
// In your agent's workflow, call the organizer after memory updates
async function onMemoryUpdate(memoryDir) {
  const { organizeMemory } = require('memory-organizer/scripts/organizer');

  const result = await organizeMemory(memoryDir, {
    dryRun: false,
    verbose: false
  });

  if (result.stats.uncategorized > 0) {
    console.warn(`${result.stats.uncategorized} files could not be categorized`);
  }

  return result;
}
```

## CI/CD Integration

```yaml
# In your pipeline config
steps:
  - name: Organize Memory
    run: node node_modules/memory-organizer/scripts/cli.js organize ./memory
  - name: Validate Structure
    run: node node_modules/memory-organizer/scripts/cli.js validate ./memory
```

## Error Handling

```javascript
const { organizeMemory, OrganizerError } = require('./scripts/organizer');
const { ConfigError } = require('./scripts/config');

try {
  await organizeMemory('./memory');
} catch (err) {
  if (err instanceof OrganizerError) {
    // Input validation or file system error
    console.error(`Organizer error (exit ${err.exitCode}): ${err.message}`);
  } else if (err instanceof ConfigError) {
    // Configuration issue
    console.error(`Config error: ${err.message}`);
  } else {
    // Unexpected error
    console.error(`Internal error: ${err.message}`);
  }
}
```
