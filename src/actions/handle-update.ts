import type { CLIOptions } from "../types"
import { GitHubLabelsAPI } from "../api"

export async function handleUpdate(
  api: GitHubLabelsAPI,
  owner: string,
  repo: string,
  options: CLIOptions,
) {
  const name = options.name
  if (!name) {
    console.error("Error: --name is required for update command.")
    process.exit(1)
  }

  const updates: any = {}
  if (options.newName) updates.name = options.newName
  if (options.color) updates.color = options.color
  if (options.description !== undefined) updates.description = options.description

  if (Object.keys(updates).length === 0) {
    console.error(
      "Error: At least one update option (--new-name, --color, or --description) is required.",
    )
    process.exit(1)
  }

  const label = await api.updateLabel(owner, repo, name, updates)
  console.log(`Updated label: ${label.name} (${label.color})`)
}
