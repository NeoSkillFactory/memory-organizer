'use strict';

const fs = require('fs');
const path = require('path');
const { organizeMemory, generateReport, validateDirectory, scanDirectory, classifyFile, calculateConfidence, OrganizerError } = require('../scripts/organizer');
const { loadConfig, validateConfig, DEFAULT_CONFIG, DEFAULT_CATEGORIES, ConfigError } = require('../scripts/config');

let testDir;
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

function setup() {
  testDir = path.join(__dirname, '_test_data_' + Date.now());
  fs.mkdirSync(testDir, { recursive: true });

  // Create sample memory files
  fs.writeFileSync(path.join(testDir, 'project-alpha.md'), '# Project Alpha\nThis is the main project repository for our app.\n');
  fs.writeFileSync(path.join(testDir, 'team-contacts.md'), '# Team Contacts\n- Alice (alice@example.com)\n- Bob (bob@example.com)\n');
  fs.writeFileSync(path.join(testDir, 'deploy-workflow.md'), '# Deployment Workflow\nCI/CD pipeline: build -> test -> deploy to production.\n');
  fs.writeFileSync(path.join(testDir, 'decision-react.md'), '# Decision: Why React\nWe decided to use React because of its ecosystem and team experience.\n');
  fs.writeFileSync(path.join(testDir, 'useful-links.md'), '# Useful References\n- https://docs.example.com/api\n- Documentation guide\n');
  fs.writeFileSync(path.join(testDir, 'random-notes.txt'), 'Just a quick note: remember to update the README.\nTodo: fix the bug in the login flow.\n');
  fs.writeFileSync(path.join(testDir, 'misc.txt'), 'Some generic content that does not match any category well.\n');
}

function cleanup() {
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runAllTests() {
  console.log('\n=== Memory Organizer Tests ===\n');

  setup();

  try {
    // ---- Config Tests ----
    console.log('Config:');

    test('loadConfig returns defaults when no path given', () => {
      const config = loadConfig(null);
      assert(config.categories !== undefined, 'should have categories');
      assert(config.categories.projects !== undefined, 'should have projects category');
      assertEqual(config.outputDir, 'organized', 'outputDir');
      assertEqual(config.minConfidence, 0.3, 'minConfidence');
    });

    test('loadConfig throws on missing file', () => {
      let threw = false;
      try {
        loadConfig('/nonexistent/path/config.json');
      } catch (err) {
        threw = true;
        assert(err instanceof ConfigError, 'should be ConfigError');
      }
      assert(threw, 'should have thrown');
    });

    test('loadConfig loads and merges custom config', () => {
      const customPath = path.join(testDir, 'custom-config.json');
      fs.writeFileSync(customPath, JSON.stringify({
        categories: {
          projects: { patterns: ['myproject'], priority: 1, description: 'Custom projects' },
          custom: { patterns: ['custom'], priority: 10, description: 'Custom category' }
        },
        minConfidence: 0.5
      }));
      const config = loadConfig(customPath);
      assertEqual(config.minConfidence, 0.5, 'minConfidence should be overridden');
      assert(config.categories.custom !== undefined, 'custom category should exist');
      assert(config.categories.projects.patterns.includes('myproject'), 'projects patterns should be overridden');
      assert(config.categories.contacts !== undefined, 'default contacts should still exist');
    });

    test('validateConfig detects invalid config', () => {
      const errors = validateConfig({ ...DEFAULT_CONFIG, categories: 'invalid', minConfidence: 2 });
      assert(errors.length > 0, 'should have errors');
    });

    test('validateConfig passes valid config', () => {
      const errors = validateConfig(DEFAULT_CONFIG);
      assertEqual(errors.length, 0, 'should have no errors');
    });

    // ---- Classification Tests ----
    console.log('\nClassification:');

    test('calculateConfidence returns 0 for empty inputs', () => {
      const score = calculateConfidence('', '', ['test']);
      assertEqual(score, 0, 'score should be 0');
    });

    test('calculateConfidence scores filename matches high', () => {
      const score = calculateConfidence('', 'project-notes.md', ['project']);
      assert(score > 0, 'score should be positive for filename match');
    });

    test('calculateConfidence scores content matches', () => {
      const score = calculateConfidence('This project uses React for the frontend.', 'file.md', ['project', 'react']);
      assert(score > 0, 'score should be positive for content match');
    });

    test('classifyFile categorizes project files correctly', () => {
      const content = '# Project Alpha\nThis is the main project repository.';
      const result = classifyFile('project-alpha.md', content, DEFAULT_CONFIG);
      assertEqual(result.category, 'projects', 'should classify as projects');
      assert(result.confidence > 0.3, 'confidence should be above threshold');
    });

    test('classifyFile categorizes contact files correctly', () => {
      const content = '# Team Contacts\n- Alice (alice@example.com)\n- Bob (team member)';
      const result = classifyFile('team-contacts.md', content, DEFAULT_CONFIG);
      assertEqual(result.category, 'contacts', 'should classify as contacts');
    });

    test('classifyFile categorizes workflow files correctly', () => {
      const content = '# Deployment Workflow\nCI/CD pipeline: build -> test -> deploy.';
      const result = classifyFile('deploy-workflow.md', content, DEFAULT_CONFIG);
      assertEqual(result.category, 'workflows', 'should classify as workflows');
    });

    test('classifyFile categorizes decision files correctly', () => {
      const content = '# Decision: Why React\nWe decided to use React because of its ecosystem.';
      const result = classifyFile('decision-react.md', content, DEFAULT_CONFIG);
      assertEqual(result.category, 'decisions', 'should classify as decisions');
    });

    test('classifyFile categorizes reference files correctly', () => {
      const content = '# Useful References\n- https://docs.example.com/api documentation';
      const result = classifyFile('useful-links.md', content, DEFAULT_CONFIG);
      assertEqual(result.category, 'references', 'should classify as references');
    });

    test('classifyFile categorizes notes correctly', () => {
      const content = 'Just a quick note: remember to update the README. Todo: fix bugs.';
      const result = classifyFile('random-notes.txt', content, DEFAULT_CONFIG);
      assertEqual(result.category, 'notes', 'should classify as notes');
    });

    test('classifyFile returns uncategorized for low-confidence content', () => {
      const content = 'xyz abc 123';
      const config = { ...DEFAULT_CONFIG, minConfidence: 0.9 };
      const result = classifyFile('xyz.md', content, config);
      assertEqual(result.category, 'uncategorized', 'should be uncategorized');
    });

    // ---- Scanner Tests ----
    console.log('\nScanner:');

    test('scanDirectory finds all matching files', () => {
      const files = scanDirectory(testDir, DEFAULT_CONFIG);
      assert(files.length >= 6, `should find at least 6 files, found ${files.length}`);
    });

    test('scanDirectory throws on non-existent directory', () => {
      let threw = false;
      try {
        scanDirectory('/nonexistent/dir', DEFAULT_CONFIG);
      } catch (err) {
        threw = true;
        assert(err instanceof OrganizerError, 'should be OrganizerError');
      }
      assert(threw, 'should have thrown');
    });

    test('scanDirectory respects ignore patterns', () => {
      const subDir = path.join(testDir, 'node_modules');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'should-ignore.md'), 'ignored');
      const files = scanDirectory(testDir, DEFAULT_CONFIG);
      const ignored = files.filter(f => f.includes('node_modules'));
      assertEqual(ignored.length, 0, 'should ignore node_modules');
    });

    // ---- Organizer Integration Tests ----
    console.log('\nOrganizer:');

    await asyncTest('organizeMemory dry run does not create files', async () => {
      const result = await organizeMemory(testDir, { dryRun: true });
      assert(result.success, 'should succeed');
      assert(result.stats.total > 0, 'should find files');
      assert(result.outputDir === null, 'outputDir should be null in dry run');
      const organizedPath = path.join(testDir, 'organized');
      assert(!fs.existsSync(organizedPath), 'organized dir should not exist');
    });

    await asyncTest('organizeMemory creates organized directory', async () => {
      const result = await organizeMemory(testDir, { dryRun: false });
      assert(result.success, 'should succeed');
      assert(result.stats.total > 0, 'should find files');
      assert(result.stats.categorized > 0, 'should categorize some files');
      const organizedPath = path.join(testDir, 'organized');
      assert(fs.existsSync(organizedPath), 'organized dir should exist');
      assert(fs.existsSync(path.join(organizedPath, '_index.md')), 'master index should exist');
    });

    await asyncTest('organizeMemory creates category directories with indexes', async () => {
      const organizedPath = path.join(testDir, 'organized');
      const dirs = fs.readdirSync(organizedPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      assert(dirs.length > 0, 'should have category directories');
      for (const dir of dirs) {
        const indexPath = path.join(organizedPath, dir, '_index.md');
        assert(fs.existsSync(indexPath), `${dir} should have _index.md`);
      }
    });

    await asyncTest('organizeMemory handles empty directory', async () => {
      const emptyDir = path.join(testDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });
      const result = await organizeMemory(emptyDir, { dryRun: false });
      assert(result.success, 'should succeed');
      assertEqual(result.stats.total, 0, 'should find 0 files');
    });

    await asyncTest('organizeMemory with custom template', async () => {
      const templatePath = path.join(testDir, 'template.json');
      fs.writeFileSync(templatePath, JSON.stringify({
        categories: {
          code: { patterns: ['project', 'code', 'repo'], priority: 1, description: 'Code stuff' }
        },
        minConfidence: 0.1
      }));
      const subDir = path.join(testDir, 'template-test');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'my-project.md'), '# My Project\nCode repository.');
      const result = await organizeMemory(subDir, { template: templatePath });
      assert(result.success, 'should succeed');
    });

    // ---- Report Tests ----
    console.log('\nReport:');

    await asyncTest('generateReport returns valid report', async () => {
      const result = await generateReport(testDir);
      assert(result.success, 'should succeed');
      assert(result.report.includes('Memory Organization Report'), 'should contain header');
      assert(result.stats.total > 0, 'should find files');
    });

    await asyncTest('generateReport handles empty directory', async () => {
      const emptyDir = path.join(testDir, 'empty-report');
      fs.mkdirSync(emptyDir, { recursive: true });
      const result = await generateReport(emptyDir);
      assert(result.success, 'should succeed');
      assertEqual(result.stats.total, 0, 'should find 0 files');
    });

    // ---- Validate Tests ----
    console.log('\nValidation:');

    await asyncTest('validateDirectory validates existing directory', async () => {
      const result = await validateDirectory(testDir);
      assertEqual(result.valid, true, 'should be valid');
      assert(result.fileCount > 0, 'should find files');
    });

    await asyncTest('validateDirectory detects non-existent directory', async () => {
      const result = await validateDirectory('/nonexistent/path');
      assertEqual(result.valid, false, 'should not be valid');
      assert(result.issues.length > 0, 'should have issues');
    });

    await asyncTest('validateDirectory detects empty directory', async () => {
      const emptyDir = path.join(testDir, 'empty-validate');
      fs.mkdirSync(emptyDir, { recursive: true });
      const result = await validateDirectory(emptyDir);
      assertEqual(result.valid, false, 'should not be valid');
      assert(result.issues.some(i => i.includes('No organizable files')), 'should mention no files');
    });

  } finally {
    cleanup();
  }

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
