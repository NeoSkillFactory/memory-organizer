'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CATEGORIES = {
  projects: {
    patterns: ['project', 'repo', 'codebase', 'repository', 'app', 'service', 'module', 'package'],
    priority: 1,
    description: 'Project-related information'
  },
  contacts: {
    patterns: ['contact', 'person', 'team', 'email', 'colleague', 'member', 'contributor', 'author'],
    priority: 2,
    description: 'People and team information'
  },
  workflows: {
    patterns: ['workflow', 'process', 'pipeline', 'automation', 'ci', 'cd', 'deploy', 'build', 'script'],
    priority: 3,
    description: 'Workflow and process definitions'
  },
  decisions: {
    patterns: ['decision', 'chose', 'decided', 'rationale', 'tradeoff', 'trade-off', 'why', 'because', 'reasoning'],
    priority: 4,
    description: 'Architectural and design decisions'
  },
  references: {
    patterns: ['reference', 'link', 'resource', 'docs', 'documentation', 'api', 'url', 'http', 'guide'],
    priority: 5,
    description: 'External references and documentation links'
  },
  notes: {
    patterns: ['note', 'todo', 'reminder', 'idea', 'thought', 'memo', 'scratch', 'draft', 'temp'],
    priority: 6,
    description: 'General notes and reminders'
  }
};

const DEFAULT_CONFIG = {
  categories: DEFAULT_CATEGORIES,
  outputDir: 'organized',
  preserveOriginals: true,
  minConfidence: 0.3,
  fileExtensions: ['.md', '.txt', '.json', '.yaml', '.yml'],
  ignorePatterns: ['node_modules', '.git', '.DS_Store', 'organized'],
  sectionHeaderPrefix: '## '
};

/**
 * Load configuration from a file or return defaults.
 * Merges user config on top of defaults.
 */
function loadConfig(configPath) {
  const config = { ...DEFAULT_CONFIG, categories: { ...DEFAULT_CATEGORIES } };

  if (!configPath) {
    return config;
  }

  const resolvedPath = path.resolve(configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new ConfigError(`Configuration file not found: ${resolvedPath}`);
  }

  let raw;
  try {
    raw = fs.readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    throw new ConfigError(`Cannot read configuration file: ${err.message}`);
  }

  let userConfig;
  try {
    userConfig = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError(`Invalid JSON in configuration file: ${err.message}`);
  }

  return mergeConfig(config, userConfig);
}

/**
 * Merge user configuration on top of defaults.
 */
function mergeConfig(defaults, overrides) {
  const merged = { ...defaults };

  if (overrides.categories && typeof overrides.categories === 'object') {
    merged.categories = {};
    for (const [key, val] of Object.entries(defaults.categories)) {
      merged.categories[key] = { ...val };
    }
    for (const [key, val] of Object.entries(overrides.categories)) {
      if (merged.categories[key]) {
        merged.categories[key] = { ...merged.categories[key], ...val };
      } else {
        merged.categories[key] = { ...val };
      }
    }
  }

  if (overrides.outputDir !== undefined) merged.outputDir = overrides.outputDir;
  if (overrides.preserveOriginals !== undefined) merged.preserveOriginals = overrides.preserveOriginals;
  if (overrides.minConfidence !== undefined) merged.minConfidence = overrides.minConfidence;
  if (overrides.fileExtensions !== undefined) merged.fileExtensions = overrides.fileExtensions;
  if (overrides.ignorePatterns !== undefined) merged.ignorePatterns = overrides.ignorePatterns;

  return merged;
}

/**
 * Validate that a configuration object has valid structure.
 */
function validateConfig(config) {
  const errors = [];

  if (!config.categories || typeof config.categories !== 'object') {
    errors.push('categories must be an object');
  } else {
    for (const [name, cat] of Object.entries(config.categories)) {
      if (!Array.isArray(cat.patterns) || cat.patterns.length === 0) {
        errors.push(`Category "${name}" must have a non-empty patterns array`);
      }
      if (typeof cat.priority !== 'number' || cat.priority < 1) {
        errors.push(`Category "${name}" must have a positive priority number`);
      }
    }
  }

  if (typeof config.outputDir !== 'string' || config.outputDir.length === 0) {
    errors.push('outputDir must be a non-empty string');
  }

  if (typeof config.minConfidence !== 'number' || config.minConfidence < 0 || config.minConfidence > 1) {
    errors.push('minConfidence must be a number between 0 and 1');
  }

  return errors;
}

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

module.exports = {
  DEFAULT_CONFIG,
  DEFAULT_CATEGORIES,
  loadConfig,
  mergeConfig,
  validateConfig,
  ConfigError
};
