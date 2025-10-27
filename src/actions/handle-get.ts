import type { CLIOptions } from "../types"
import { GitHubLabelsAPI } from "../api"

export async function handleGet(
  api: GitHubLabelsAPI,
  owner: string,
  repo: string,
  options: CLIOptions,
) {
  const name = options.name
  if (!name) {
    console.error("Error: --name is required for get command.")
    process.exit(1)
  }

  const label = await api.getLabel(owner, repo, name)
  console.log(`Label: ${label.name}`)
  console.log(`Color: ${label.color}`)
  console.log(`Description: ${label.description || "None"}`)
  console.log(`Default: ${label.default}`)
}
