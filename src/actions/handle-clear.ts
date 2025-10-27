import type { CLIOptions } from "../types"
import { GitHubLabelsAPI } from "../api"

export async function handleClear(api: GitHubLabelsAPI, options: CLIOptions) {
  const owner = options.owner
  const repo = options.repo

  if (!owner || !repo) {
    console.error("Error: --owner and --repo are required for clear command.")
    process.exit(1)
  }

  console.log(`Clearing all labels from ${owner}/${repo}...`)

  try {
    // Get all labels from repository
    const labels = await api.listLabels(owner, repo)
    console.log(`Found ${labels.length} labels in repository.`)

    if (labels.length === 0) {
      console.log("No labels to delete.")
      return
    }

    // Delete all labels (including default GitHub labels)
    // Note: Default labels like "bug", "enhancement" will be deleted and can be recreated by GitHub
    console.log(`Deleting ${labels.length} labels (including default GitHub labels)...`)

    let successCount = 0
    let errorCount = 0

    for (const label of labels) {
      try {
        await api.deleteLabel(owner, repo, label.name)
        console.log(`✓ Deleted label: ${label.name}`)
        successCount++
      } catch (error) {
        console.error(
          `✗ Failed to delete label "${label.name}": ${error instanceof Error ? error.message : String(error)}`,
        )
        errorCount++
      }
    }

    console.log(`\nClear completed: ${successCount} successful, ${errorCount} failed.`)
  } catch (error) {
    console.error("Error clearing labels:", error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
