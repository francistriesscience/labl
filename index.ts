#!/usr/bin/env bun

interface Label {
  id: number;
  node_id: string;
  url: string;
  name: string;
  color: string;
  default: boolean;
  description?: string;
}

interface CreateLabelRequest {
  name: string;
  color: string;
  description?: string;
}

interface UpdateLabelRequest {
  name?: string;
  color?: string;
  description?: string;
}

class GitHubLabelsAPI {
  private baseUrl = 'https://api.github.com';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}\n${error}`);
    }

    return response.json() as T;
  }

  async listLabels(owner: string, repo: string): Promise<Label[]> {
    return this.request<Label[]>('GET', `/repos/${owner}/${repo}/labels`);
  }

  async createLabel(owner: string, repo: string, label: CreateLabelRequest): Promise<Label> {
    return this.request<Label>('POST', `/repos/${owner}/${repo}/labels`, label);
  }

  async getLabel(owner: string, repo: string, name: string): Promise<Label> {
    return this.request<Label>('GET', `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`);
  }

  async updateLabel(owner: string, repo: string, name: string, updates: UpdateLabelRequest): Promise<Label> {
    return this.request<Label>('PATCH', `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`, updates);
  }

  async deleteLabel(owner: string, repo: string, name: string): Promise<void> {
    await this.request('DELETE', `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`);
  }
}

function parseArgs(args: string[]): { command: string; options: Record<string, string | boolean> } {
  if (args.length === 0 || !args[0]) {
    throw new Error('No command provided');
  }

  const command = args[0];
  const options: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg && arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (i + 1 < args.length && nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printUsage();
    return;
  }

  const { command, options } = parseArgs(args);

  const token = process.env.GITHUB_TOKEN || options.token as string;
  if (!token) {
    console.error('Error: GitHub token is required. Set GITHUB_TOKEN environment variable or use --token option.');
    process.exit(1);
  }

  const owner = options.owner as string;
  const repo = options.repo as string;

  if (!owner || !repo) {
    console.error('Error: --owner and --repo are required.');
    process.exit(1);
  }

  const api = new GitHubLabelsAPI(token);

  try {
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
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
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

async function handleCreate(api: GitHubLabelsAPI, owner: string, repo: string, options: Record<string, string | boolean>) {
  const name = options.name as string;
  const color = options.color as string;
  const description = options.description as string;

  if (!name || !color) {
    console.error('Error: --name and --color are required for create command.');
    process.exit(1);
  }

  const label = await api.createLabel(owner, repo, { name, color, description });
  console.log(`Created label: ${label.name} (${label.color})`);
}

async function handleGet(api: GitHubLabelsAPI, owner: string, repo: string, options: Record<string, string | boolean>) {
  const name = options.name as string;
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

async function handleUpdate(api: GitHubLabelsAPI, owner: string, repo: string, options: Record<string, string | boolean>) {
  const name = options.name as string;
  if (!name) {
    console.error('Error: --name is required for update command.');
    process.exit(1);
  }

  const updates: UpdateLabelRequest = {};
  if (options.newName) updates.name = options.newName as string;
  if (options.color) updates.color = options.color as string;
  if (options.description !== undefined) updates.description = options.description as string;

  if (Object.keys(updates).length === 0) {
    console.error('Error: At least one update option (--new-name, --color, or --description) is required.');
    process.exit(1);
  }

  const label = await api.updateLabel(owner, repo, name, updates);
  console.log(`Updated label: ${label.name} (${label.color})`);
}

async function handleDelete(api: GitHubLabelsAPI, owner: string, repo: string, options: Record<string, string | boolean>) {
  const name = options.name as string;
  if (!name) {
    console.error('Error: --name is required for delete command.');
    process.exit(1);
  }

  await api.deleteLabel(owner, repo, name);
  console.log(`Deleted label: ${name}`);
}

function printUsage() {
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

main();