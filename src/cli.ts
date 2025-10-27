import type { CLIOptions } from "./types"
import { GitHubLabelsAPI } from "./api"
import { GITHUB_TOKEN } from "../config/constants"
import {
  handleCopy,
  handleExport,
  handleList,
  handleCreate,
  handleGet,
  handleUpdate,
  handleDelete,
  handleClear,
} from "./actions"

export function parseArgs(args: string[]): { command: string; options: CLIOptions } {
  if (args.length === 0 || !args[0]) {
    throw new Error("No command provided")
  }

  const command = args[0]
  const options: CLIOptions = {}

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg && arg.startsWith("--")) {
      const key = arg.slice(2) as keyof CLIOptions
      const nextArg = args[i + 1]
      if (i + 1 < args.length && nextArg && !nextArg.startsWith("--")) {
        options[key] = nextArg
        i++
      } else {
        options[key] = true as any
      }
    }
  }

  return { command, options }
}

export async function runCommand(command: string, options: CLIOptions): Promise<void> {
  const token = GITHUB_TOKEN || options.token
  if (!token) {
    console.error(
      "Error: GitHub token is required. Set GITHUB_TOKEN environment variable or use --token option.",
    )
    process.exit(1)
  }

  const api = new GitHubLabelsAPI(token)

  if (command === "copy" || command === "export" || command === "clear") {
    if (command === "copy") {
      await handleCopy(api, options)
    } else if (command === "export") {
      await handleExport(api, options)
    } else {
      await handleClear(api, options)
    }
    return
  }

  const owner = options.owner
  const repo = options.repo

  if (!owner || !repo) {
    console.error("Error: --owner and --repo are required.")
    process.exit(1)
  }

  switch (command) {
    case "list":
      await handleList(api, owner, repo)
      break
    case "create":
      await handleCreate(api, owner, repo, options)
      break
    case "get":
      await handleGet(api, owner, repo, options)
      break
    case "update":
      await handleUpdate(api, owner, repo, options)
      break
    case "delete":
      await handleDelete(api, owner, repo, options)
      break
    default:
      console.error(`Unknown command: ${command}`)
      printUsage()
      process.exit(1)
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
  clear --owner <owner> --repo <repo>                                 Delete all labels from repository

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
  labl clear --owner myorg --repo myrepo
`)
}
