#!/usr/bin/env bun

import { parseArgs, runCommand, printUsage } from './src/cli.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printUsage();
    return;
  }

  try {
    const { command, options } = parseArgs(args);
    await runCommand(command, options);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();