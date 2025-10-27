import type { CLIOptions } from './types.js';
import { GitHubLabelsAPI } from './api.js';

export function parseArgs(args: string[]): { command: string; options: CLIOptions } {
  if (args.length === 0 || !args[0]) {
    throw new Error('No command provided');
  }

  const command = args[0];
  const options: CLIOptions = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg && arg.startsWith('--')) {
      const key = arg.slice(2) as keyof CLIOptions;
      const nextArg = args[i + 1];
      if (i + 1 < args.length && nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true as any; // For boolean flags, but we don't have any in our CLI
      }
    }
  }

  return { command, options };
}

export async function runCommand(command: string, options: CLIOptions): Promise<void> {
  const token = process.env.GITHUB_TOKEN || options.token;
  if (!token) {
    console.error('Error: GitHub token is required. Set GITHUB_TOKEN environment variable or use --token option.');
    process.exit(1);
  }

  const owner = options.owner;
  const repo = options.repo;

  if (!owner || !repo) {
    console.error('Error: --owner and --repo are required.');
    process.exit(1);
  }

  const api = new GitHubLabelsAPI(token);

  switch (command) {
    case 'list':
      await handleList(api, owner, repo);
      break;
    case 'create':
      await handleCreate(api, owner, repo, options);
      break;
    case 'get':
      await handleGet(api, owner, repo, options);
      break;
    case 'update':
      await handleUpdate(api, owner, repo, options);
      break;
    case 'delete':
      await handleDelete(api, owner, repo, options);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

async function handleList(api: GitHubLabelsAPI, owner: string, repo: string) {
  const labels = await api.listLabels(owner, repo);
  console.log('Labels:');
  labels.forEach(label => {
    console.log(`- ${label.name} (${label.color}) ${label.description ? `- ${label.description}` : ''}`);
  });
}

async function handleCreate(api: GitHubLabelsAPI, owner: string, repo: string, options: CLIOptions) {
  const name = options.name;
  const color = options.color;
  const description = options.description;

  if (!name || !color) {
    console.error('Error: --name and --color are required for create command.');
    process.exit(1);
  }

  const label = await api.createLabel(owner, repo, { name, color, description });
  console.log(`Created label: ${label.name} (${label.color})`);
}

async function handleGet(api: GitHubLabelsAPI, owner: string, repo: string, options: CLIOptions) {
  const name = options.name;
  if (!name) {
    console.error('Error: --name is required for get command.');
    process.exit(1);
  }

  const label = await api.getLabel(owner, repo, name);
  console.log(`Label: ${label.name}`);
  console.log(`Color: ${label.color}`);
  console.log(`Description: ${label.description || 'None'}`);
  console.log(`Default: ${label.default}`);
}

async function handleUpdate(api: GitHubLabelsAPI, owner: string, repo: string, options: CLIOptions) {
  const name = options.name;
  if (!name) {
    console.error('Error: --name is required for update command.');
    process.exit(1);
  }

  const updates: any = {};
  if (options.newName) updates.name = options.newName;
  if (options.color) updates.color = options.color;
  if (options.description !== undefined) updates.description = options.description;

  if (Object.keys(updates).length === 0) {
    console.error('Error: At least one update option (--new-name, --color, or --description) is required.');
    process.exit(1);
  }

  const label = await api.updateLabel(owner, repo, name, updates);
  console.log(`Updated label: ${label.name} (${label.color})`);
}

async function handleDelete(api: GitHubLabelsAPI, owner: string, repo: string, options: CLIOptions) {
  const name = options.name;
  if (!name) {
    console.error('Error: --name is required for delete command.');
    process.exit(1);
  }

  await api.deleteLabel(owner, repo, name);
  console.log(`Deleted label: ${name}`);
}

export function printUsage() {
  console.log(`
GitHub Labels CLI

Usage: labl <command> --owner <owner> --repo <repo> [options]

Commands:
  list                    List all labels in the repository
  create --name <name> --color <color> [--description <desc>]  Create a new label
  get --name <name>       Get details of a specific label
  update --name <name> [--new-name <new>] [--color <color>] [--description <desc>]  Update a label
  delete --name <name>    Delete a label

Options:
  --owner <owner>         Repository owner (required)
  --repo <repo>           Repository name (required)
  --token <token>         GitHub token (or set GITHUB_TOKEN env var)
  --name <name>           Label name
  --new-name <new>        New label name (for update)
  --color <color>         Label color (hex code without #)
  --description <desc>    Label description

Examples:
  labl list --owner myorg --repo myrepo
  labl create --owner myorg --repo myrepo --name "bug" --color "ff0000" --description "Bug reports"
  labl update --owner myorg --repo myrepo --name "bug" --color "00ff00"
  labl delete --owner myorg --repo myrepo --name "old-label"
`);
}