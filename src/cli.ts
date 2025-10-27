import type { CLIOptions } from './types.js';
import { GitHubLabelsAPI } from './api.js';
import { GITHUB_TOKEN } from '../config/constants.js';

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
  const token = GITHUB_TOKEN || options.token;
  if (!token) {
    console.error('Error: GitHub token is required. Set GITHUB_TOKEN environment variable or use --token option.');
    process.exit(1);
  }

  const api = new GitHubLabelsAPI(token);

  if (command === 'copy' || command === 'export') {
    if (command === 'copy') {
      await handleCopy(api, options);
    } else {
      await handleExport(api, options);
    }
    return;
  }

  const owner = options.owner;
  const repo = options.repo;

  if (!owner || !repo) {
    console.error('Error: --owner and --repo are required.');
    process.exit(1);
  }

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

async function handleCopy(api: GitHubLabelsAPI, options: CLIOptions) {
  // Allow using --owner/--repo as source for backward compatibility
  const fromOwner = options.fromOwner || options.owner;
  const fromRepo = options.fromRepo || options.repo;
  const toOwner = options.toOwner;
  const toRepo = options.toRepo;

  if (!fromOwner || !fromRepo) {
    console.error('Error: Source repository required. Use --from-owner and --from-repo, or --owner and --repo for source.');
    process.exit(1);
  }

  if (!toOwner || !toRepo) {
    console.error('Error: Destination repository required. Use --to-owner and --to-repo.');
    process.exit(1);
  }

  console.log(`Copying labels from ${fromOwner}/${fromRepo} to ${toOwner}/${toRepo}...`);

  try {
    // Get all labels from source repository
    const sourceLabels = await api.listLabels(fromOwner, fromRepo);
    console.log(`Found ${sourceLabels.length} labels in source repository.`);

    // Filter out default GitHub labels (we only want custom ones)
    const customLabels = sourceLabels.filter(label => !label.default);
    console.log(`Copying ${customLabels.length} custom labels...`);

    let successCount = 0;
    let errorCount = 0;

    for (const label of customLabels) {
      try {
        await api.createLabel(toOwner, toRepo, {
          name: label.name,
          color: label.color,
          description: label.description
        });
        console.log(`✓ Copied label: ${label.name}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to copy label "${label.name}": ${error instanceof Error ? error.message : String(error)}`);
        errorCount++;
      }
    }

    console.log(`\nCopy completed: ${successCount} successful, ${errorCount} failed.`);

  } catch (error) {
    console.error('Error copying labels:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function handleExport(api: GitHubLabelsAPI, options: CLIOptions) {
  const owner = options.owner;
  const repo = options.repo;

  if (!owner || !repo) {
    console.error('Error: --owner and --repo are required for export command.');
    process.exit(1);
  }

  console.log(`Exporting labels from ${owner}/${repo}...`);

  try {
    // Get all labels from repository
    const labels = await api.listLabels(owner, repo);
    console.log(`Found ${labels.length} labels in repository.`);

    // Prepare export data
    const exportData = {
      repository: `${owner}/${repo}`,
      exportedAt: new Date().toISOString(),
      labels: labels.map(label => ({
        name: label.name,
        color: label.color,
        description: label.description,
        default: label.default
      }))
    };

    // Create .json directory if it doesn't exist
    const jsonDir = '.json';
    try {
      await Bun.write(`${jsonDir}/.gitkeep`, '');
    } catch {
      // Directory might already exist
    }

    // Write JSON file
    const filename = `${repo}.json`;
    const filepath = `${jsonDir}/${filename}`;
    await Bun.write(filepath, JSON.stringify(exportData, null, 2));

    console.log(`✓ Exported ${labels.length} labels to ${filepath}`);
    console.log(`✓ File saved: ${filepath}`);

  } catch (error) {
    console.error('Error exporting labels:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export function printUsage() {
  console.log(`
GitHub Labels CLI

Usage: labl <command> [options]

Commands:
  list --owner <owner> --repo <repo>                                    List all labels in the repository
  create --owner <owner> --repo <repo> --name <name> --color <color> [--description <desc>]  Create a new label
  get --owner <owner> --repo <repo> --name <name>                      Get details of a specific label
  update --owner <owner> --repo <repo> --name <name> [--new-name <new>] [--color <color>] [--description <desc>]  Update a label
  delete --owner <owner> --repo <repo> --name <name>                   Delete a label
  copy --from-owner <from-owner> --from-repo <from-repo> --to-owner <to-owner> --to-repo <to-repo>  Copy labels from one repo to another
  export --owner <owner> --repo <repo>                                Export all labels to JSON file

Options:
  --owner <owner>         Repository owner
  --repo <repo>           Repository name
  --from-owner <owner>    Source repository owner (for copy command)
  --from-repo <repo>      Source repository name (for copy command)
  --to-owner <owner>      Destination repository owner (for copy command)
  --to-repo <repo>        Destination repository name (for copy command)
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
  labl copy --from-owner sourceorg --from-repo sourcerepo --to-owner destorg --to-repo destrepo
  labl export --owner myorg --repo myrepo
`);
}