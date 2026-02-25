#!/usr/bin/env node
'use strict';

const path = require('path');
const { organizeMemory, generateReport, validateDirectory, OrganizerError } = require('./organizer');
const { ConfigError } = require('./config');

const USAGE = `
memory-organizer - Automatically categorize and structure memory data

Usage:
  memory-organizer organize <dir> [options]   Organize memory data in a directory
  memory-organizer report <dir> [options]     Generate organization report
  memory-organizer validate <dir> [options]   Validate directory structure
  memory-organizer help                       Show this help message

Options:
  --dry-run       Preview changes without applying them
  --template <f>  Path to a custom categorization template (JSON)
  --verbose       Enable verbose output

Examples:
  memory-organizer organize ./memory
  memory-organizer organize ./memory --dry-run
  memory-organizer organize ./memory --template custom.json
  memory-organizer report ./memory
  memory-organizer validate ./memory
`.trim();

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: null,
    dir: null,
    dryRun: false,
    template: null,
    verbose: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    } else if (arg === '--template' || arg === '-t') {
      i++;
      if (i >= args.length) {
        console.error('Error: --template requires a file path argument');
        process.exit(1);
      }
      result.template = args[i];
    } else if (arg === 'help' || arg === '--help' || arg === '-h') {
      result.command = 'help';
    } else if (!result.command) {
      result.command = arg;
    } else if (!result.dir) {
      result.dir = arg;
    }

    i++;
  }

  return result;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.command || args.command === 'help') {
    console.log(USAGE);
    process.exit(0);
  }

  if (!['organize', 'report', 'validate'].includes(args.command)) {
    console.error(`Error: Unknown command "${args.command}"`);
    console.error('Run "memory-organizer help" for usage information.');
    process.exit(1);
  }

  if (!args.dir) {
    console.error(`Error: Missing directory argument for "${args.command}" command.`);
    console.error(`Usage: memory-organizer ${args.command} <dir>`);
    process.exit(1);
  }

  const options = {
    dryRun: args.dryRun,
    template: args.template,
    verbose: args.verbose
  };

  try {
    switch (args.command) {
      case 'organize': {
        if (args.verbose) {
          console.log(`Organizing memory data in: ${path.resolve(args.dir)}`);
          if (args.dryRun) console.log('(dry run mode - no changes will be made)');
        }

        const result = await organizeMemory(args.dir, options);
        console.log(result.summary);

        if (result.outputDir) {
          console.log(`\nOrganized files written to: ${result.outputDir}`);
        }
        break;
      }

      case 'report': {
        const result = await generateReport(args.dir, options);
        console.log(result.report);
        break;
      }

      case 'validate': {
        const result = await validateDirectory(args.dir, options);
        if (result.valid) {
          console.log(`Directory is valid for organization.`);
          console.log(`Found ${result.fileCount} organizable file(s).`);
        } else {
          console.log('Validation issues found:');
          for (const issue of result.issues) {
            console.log(`  - ${issue}`);
          }
          process.exit(1);
        }
        break;
      }
    }
  } catch (err) {
    if (err instanceof OrganizerError) {
      console.error(`Error: ${err.message}`);
      process.exit(err.exitCode);
    } else if (err instanceof ConfigError) {
      console.error(`Configuration error: ${err.message}`);
      process.exit(3);
    } else {
      console.error(`Unexpected error: ${err.message}`);
      process.exit(4);
    }
  }
}

main();
