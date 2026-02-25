'use strict';

const fs = require('fs');
const path = require('path');
const { loadConfig, validateConfig, ConfigError } = require('./config');

/**
 * Scan a directory recursively and return all files matching allowed extensions.
 */
function scanDirectory(dirPath, config) {
  const results = [];
  const resolvedDir = path.resolve(dirPath);

  if (!fs.existsSync(resolvedDir)) {
    throw new OrganizerError(`Directory not found: ${resolvedDir}`, 1);
  }

  const stat = fs.statSync(resolvedDir);
  if (!stat.isDirectory()) {
    throw new OrganizerError(`Path is not a directory: ${resolvedDir}`, 1);
  }

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (config.ignorePatterns.some(pattern => entry.name === pattern || entry.name.startsWith(pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (config.fileExtensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(resolvedDir);
  return results;
}

/**
 * Read file content safely. Returns null on error.
 */
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return null;
  }
}

/**
 * Calculate confidence score for a category based on pattern matching.
 * Returns a score between 0 and 1.
 *
 * Scoring: each matching pattern contributes to the score.
 * - Filename match: +0.3 per pattern
 * - Content match: +0.1 per pattern (up to 3 occurrences counted)
 * Result is capped at 1.0.
 */
function calculateConfidence(content, filename, patterns) {
  if (!content && !filename) return 0;

  const lowerContent = (content || '').toLowerCase();
  const lowerFilename = filename.toLowerCase();
  let score = 0;

  for (const pattern of patterns) {
    const lowerPattern = pattern.toLowerCase();

    // Filename match is a strong signal
    if (lowerFilename.includes(lowerPattern)) {
      score += 0.3;
    }

    // Content matches add incremental confidence
    if (lowerContent.length > 0) {
      const regex = new RegExp(`\\b${escapeRegex(lowerPattern)}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        score += 0.1 * Math.min(matches.length, 3);
      }
    }
  }

  return Math.min(score, 1);
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Classify a single file into a category.
 * Returns { category, confidence } or null if no match above threshold.
 */
function classifyFile(filePath, content, config) {
  const filename = path.basename(filePath);
  let bestCategory = null;
  let bestConfidence = 0;
  let bestPriority = Infinity;

  for (const [categoryName, categoryDef] of Object.entries(config.categories)) {
    const confidence = calculateConfidence(content, filename, categoryDef.patterns);

    if (confidence > bestConfidence || (confidence === bestConfidence && categoryDef.priority < bestPriority)) {
      bestCategory = categoryName;
      bestConfidence = confidence;
      bestPriority = categoryDef.priority;
    }
  }

  if (bestConfidence < config.minConfidence) {
    return { category: 'uncategorized', confidence: bestConfidence };
  }

  return { category: bestCategory, confidence: bestConfidence };
}

/**
 * Organize memory data in the given directory.
 * Main entry point for the organizer.
 */
async function organizeMemory(inputDir, options = {}) {
  const config = options.template
    ? loadConfig(options.template)
    : loadConfig(null);

  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new OrganizerError(`Invalid configuration: ${errors.join(', ')}`, 3);
  }

  const verbose = options.verbose || false;
  const dryRun = options.dryRun || false;
  const resolvedInput = path.resolve(inputDir);
  const outputDir = path.resolve(resolvedInput, config.outputDir);

  // Scan for files
  const files = scanDirectory(resolvedInput, config);
  if (files.length === 0) {
    return {
      success: true,
      summary: 'No files found to organize.',
      organized: {},
      stats: { total: 0, categorized: 0, uncategorized: 0 }
    };
  }

  // Classify each file
  const classifications = [];
  for (const filePath of files) {
    const content = readFileContent(filePath);
    const result = classifyFile(filePath, content, config);
    classifications.push({
      filePath,
      relativePath: path.relative(resolvedInput, filePath),
      ...result
    });
  }

  // Group by category
  const organized = {};
  let categorized = 0;
  let uncategorized = 0;

  for (const entry of classifications) {
    if (!organized[entry.category]) {
      organized[entry.category] = [];
    }
    organized[entry.category].push(entry);

    if (entry.category === 'uncategorized') {
      uncategorized++;
    } else {
      categorized++;
    }
  }

  // Apply organization (create directories and copy/move files)
  if (!dryRun) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const [category, entries] of Object.entries(organized)) {
      const categoryDir = path.join(outputDir, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      for (const entry of entries) {
        const destPath = path.join(categoryDir, path.basename(entry.filePath));

        // Avoid copying into self
        if (path.resolve(entry.filePath) === path.resolve(destPath)) {
          continue;
        }

        try {
          fs.copyFileSync(entry.filePath, destPath);
        } catch (err) {
          if (verbose) {
            console.error(`  Warning: Could not copy ${entry.relativePath}: ${err.message}`);
          }
        }
      }

      // Create an index file for the category
      const indexContent = generateCategoryIndex(category, entries, config);
      fs.writeFileSync(path.join(categoryDir, '_index.md'), indexContent, 'utf-8');
    }

    // Create master index
    const masterIndex = generateMasterIndex(organized, config);
    fs.writeFileSync(path.join(outputDir, '_index.md'), masterIndex, 'utf-8');
  }

  const summary = buildSummary(organized, { total: files.length, categorized, uncategorized }, dryRun);

  return {
    success: true,
    summary,
    organized,
    stats: { total: files.length, categorized, uncategorized },
    outputDir: dryRun ? null : outputDir
  };
}

/**
 * Generate an index markdown file for a category.
 */
function generateCategoryIndex(category, entries, config) {
  const catDef = config.categories[category];
  const header = catDef ? catDef.description : 'Uncategorized entries';
  const lines = [
    `# ${capitalize(category)}`,
    '',
    header,
    '',
    `| File | Confidence |`,
    `|------|------------|`
  ];

  const sorted = [...entries].sort((a, b) => b.confidence - a.confidence);

  for (const entry of sorted) {
    const pct = (entry.confidence * 100).toFixed(0);
    lines.push(`| ${entry.relativePath} | ${pct}% |`);
  }

  lines.push('', `_${entries.length} file(s) in this category._`);
  return lines.join('\n');
}

/**
 * Generate a master index of all organized categories.
 */
function generateMasterIndex(organized, config) {
  const lines = [
    '# Memory Organization Index',
    '',
    `_Generated: ${new Date().toISOString().split('T')[0]}_`,
    ''
  ];

  // Sort categories by priority
  const sortedCategories = Object.keys(organized).sort((a, b) => {
    const prioA = (config.categories[a] || {}).priority || 999;
    const prioB = (config.categories[b] || {}).priority || 999;
    return prioA - prioB;
  });

  lines.push('## Categories', '');

  for (const cat of sortedCategories) {
    const entries = organized[cat];
    const desc = (config.categories[cat] || {}).description || '';
    lines.push(`### ${capitalize(cat)} (${entries.length} files)`);
    if (desc) lines.push(`_${desc}_`);
    lines.push('');
    for (const entry of entries) {
      lines.push(`- [${entry.relativePath}](./${cat}/${path.basename(entry.filePath)})`);
    }
    lines.push('');
  }

  const total = Object.values(organized).reduce((sum, arr) => sum + arr.length, 0);
  lines.push('---', `Total: ${total} files organized into ${sortedCategories.length} categories.`);

  return lines.join('\n');
}

/**
 * Build a human-readable summary string.
 */
function buildSummary(organized, stats, dryRun) {
  const prefix = dryRun ? '[DRY RUN] ' : '';
  const lines = [
    `${prefix}Memory Organization Complete`,
    `  Total files scanned: ${stats.total}`,
    `  Categorized: ${stats.categorized}`,
    `  Uncategorized: ${stats.uncategorized}`,
    ''
  ];

  for (const [cat, entries] of Object.entries(organized)) {
    lines.push(`  ${capitalize(cat)}: ${entries.length} file(s)`);
  }

  return lines.join('\n');
}

/**
 * Generate a report on the organization state of a memory directory.
 */
async function generateReport(inputDir, options = {}) {
  const config = options.template
    ? loadConfig(options.template)
    : loadConfig(null);

  const resolvedInput = path.resolve(inputDir);
  const files = scanDirectory(resolvedInput, config);

  if (files.length === 0) {
    return {
      success: true,
      report: 'No memory files found in the specified directory.',
      stats: { total: 0, categories: {} }
    };
  }

  const categoryStats = {};
  const confidenceSum = {};

  for (const filePath of files) {
    const content = readFileContent(filePath);
    const { category, confidence } = classifyFile(filePath, content, config);

    if (!categoryStats[category]) {
      categoryStats[category] = { count: 0, files: [] };
      confidenceSum[category] = 0;
    }
    categoryStats[category].count++;
    categoryStats[category].files.push({
      path: path.relative(resolvedInput, filePath),
      confidence
    });
    confidenceSum[category] += confidence;
  }

  const reportLines = [
    '# Memory Organization Report',
    '',
    `Directory: ${resolvedInput}`,
    `Total files: ${files.length}`,
    `Categories detected: ${Object.keys(categoryStats).length}`,
    ''
  ];

  const sortedCats = Object.entries(categoryStats).sort((a, b) => b[1].count - a[1].count);

  for (const [cat, data] of sortedCats) {
    const avgConf = (confidenceSum[cat] / data.count * 100).toFixed(0);
    reportLines.push(`## ${capitalize(cat)} (${data.count} files, avg confidence: ${avgConf}%)`);
    reportLines.push('');
    for (const f of data.files) {
      reportLines.push(`- ${f.path} (${(f.confidence * 100).toFixed(0)}%)`);
    }
    reportLines.push('');
  }

  return {
    success: true,
    report: reportLines.join('\n'),
    stats: { total: files.length, categories: categoryStats }
  };
}

/**
 * Validate that a memory directory can be organized.
 */
async function validateDirectory(inputDir, options = {}) {
  const config = options.template
    ? loadConfig(options.template)
    : loadConfig(null);

  const resolvedInput = path.resolve(inputDir);
  const issues = [];

  if (!fs.existsSync(resolvedInput)) {
    issues.push(`Directory does not exist: ${resolvedInput}`);
    return { valid: false, issues };
  }

  const stat = fs.statSync(resolvedInput);
  if (!stat.isDirectory()) {
    issues.push(`Path is not a directory: ${resolvedInput}`);
    return { valid: false, issues };
  }

  try {
    fs.accessSync(resolvedInput, fs.constants.R_OK);
  } catch {
    issues.push(`Directory is not readable: ${resolvedInput}`);
  }

  try {
    fs.accessSync(resolvedInput, fs.constants.W_OK);
  } catch {
    issues.push(`Directory is not writable: ${resolvedInput}`);
  }

  const files = scanDirectory(resolvedInput, config);
  if (files.length === 0) {
    issues.push('No organizable files found (check fileExtensions in config)');
  }

  const configErrors = validateConfig(config);
  if (configErrors.length > 0) {
    issues.push(...configErrors.map(e => `Config: ${e}`));
  }

  return {
    valid: issues.length === 0,
    issues,
    fileCount: files.length
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

class OrganizerError extends Error {
  constructor(message, exitCode = 4) {
    super(message);
    this.name = 'OrganizerError';
    this.exitCode = exitCode;
  }
}

module.exports = {
  organizeMemory,
  generateReport,
  validateDirectory,
  scanDirectory,
  classifyFile,
  calculateConfidence,
  OrganizerError
};
