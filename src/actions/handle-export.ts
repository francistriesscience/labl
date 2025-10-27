import type { CLIOptions } from "../types"
import { GitHubLabelsAPI } from "../api"

export async function handleExport(api: GitHubLabelsAPI, options: CLIOptions) {
  const owner = options.owner
  const repo = options.repo

  if (!owner || !repo) {
    console.error("Error: --owner and --repo are required for export command.")
    process.exit(1)
  }

  console.log(`Exporting labels from ${owner}/${repo}...`)

  try {
    // Get all labels from repository
    const labels = await api.listLabels(owner, repo)
    console.log(`Found ${labels.length} labels in repository.`)

    // Prepare export data
    const exportData = {
      repository: `${owner}/${repo}`,
      exportedAt: new Date().toISOString(),
      labels: labels.map((label) => ({
        name: label.name,
        color: label.color,
        description: label.description,
        default: label.default,
      })),
    }

    // Create .json/exports directory if it doesn't exist
    const jsonDir = ".json/exports"
    try {
      await Bun.write(`${jsonDir}`, "")
    } catch {}

    const filename = `${repo}.json`
    const filepath = `${jsonDir}/${filename}`
    await Bun.write(filepath, JSON.stringify(exportData, null, 2))

    console.log(`✓ Exported ${labels.length} labels to ${filepath}`)
    console.log(`✓ File saved: ${filepath}`)
  } catch (error) {
    console.error("Error exporting labels:", error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
