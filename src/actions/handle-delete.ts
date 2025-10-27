import type { CLIOptions } from "../types"
import { GitHubLabelsAPI } from "../api"

export async function handleDelete(
  api: GitHubLabelsAPI,
  owner: string,
  repo: string,
  options: CLIOptions,
) {
  const name = options.name
  if (!name) {
    console.error("Error: --name is required for delete command.")
    process.exit(1)
  }

  await api.deleteLabel(owner, repo, name)
  console.log(`Deleted label: ${name}`)
}
