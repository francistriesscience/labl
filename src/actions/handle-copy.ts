import type { CLIOptions } from "../types"
import { GitHubLabelsAPI } from "../api"

export async function handleCopy(api: GitHubLabelsAPI, options: CLIOptions) {
  // Allow using --owner/--repo as source for backward compatibility
  const fromOwner = options.fromOwner || options.owner
  const fromRepo = options.fromRepo || options.repo
  const toOwner = options.toOwner
  const toRepo = options.toRepo

  if (!fromOwner || !fromRepo) {
    console.error(
      "Error: Source repository required. Use --from-owner and --from-repo, or --owner and --repo for source.",
    )
    process.exit(1)
  }

  if (!toOwner || !toRepo) {
    console.error("Error: Destination repository required. Use --to-owner and --to-repo.")
    process.exit(1)
  }

  console.log(`Copying labels from ${fromOwner}/${fromRepo} to ${toOwner}/${toRepo}...`)

  try {
    // Get all labels from source repository
    const sourceLabels = await api.listLabels(fromOwner, fromRepo)
    console.log(`Found ${sourceLabels.length} labels in source repository.`)

    // Filter out default GitHub labels (we only want custom ones)
    const customLabels = sourceLabels.filter((label) => !label.default)
    console.log(`Copying ${customLabels.length} custom labels...`)

    let successCount = 0
    let errorCount = 0

    for (const label of customLabels) {
      try {
        await api.createLabel(toOwner, toRepo, {
          name: label.name,
          color: label.color,
          description: label.description,
        })
        console.log(`✓ Copied label: ${label.name}`)
        successCount++
      } catch (error) {
        console.error(
          `✗ Failed to copy label "${label.name}": ${error instanceof Error ? error.message : String(error)}`,
        )
        errorCount++
      }
    }

    console.log(`\nCopy completed: ${successCount} successful, ${errorCount} failed.`)
  } catch (error) {
    console.error("Error copying labels:", error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
