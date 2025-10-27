import type { CLIOptions } from "../types"
import { GitHubLabelsAPI } from "../api"

export async function handleCreate(
  api: GitHubLabelsAPI,
  owner: string,
  repo: string,
  options: CLIOptions,
) {
  const name = options.name
  const color = options.color
  const description = options.description

  if (!name || !color) {
    console.error("Error: --name and --color are required for create command.")
    process.exit(1)
  }

  const label = await api.createLabel(owner, repo, { name, color, description })
  console.log(`Created label: ${label.name} (${label.color})`)
}
