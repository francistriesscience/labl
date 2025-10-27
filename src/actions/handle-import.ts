import type { CLIOptions } from "../types"
import { GitHubLabelsAPI } from "../api"

interface LabelImport {
  name: string
  color: string
  description?: string
  default?: boolean
}

interface ImportData {
  labels: LabelImport[]
}

export async function handleImport(api: GitHubLabelsAPI, options: CLIOptions) {
  const owner = options.owner
  const repo = options.repo
  const filename = options.file

  if (!owner || !repo) {
    console.error("Error: --owner and --repo are required for import command.")
    process.exit(1)
  }

  if (!filename) {
    console.error("Error: --file is required for import command.")
    process.exit(1)
  }

  const filepath = `.json/imports/${filename}`

  console.log(`Importing labels from ${filepath} to ${owner}/${repo}...`)

  try {
    // Read and parse the JSON file
    const fileContent = await Bun.file(filepath).text()
    const importData: ImportData = JSON.parse(fileContent)

    if (!importData.labels || !Array.isArray(importData.labels)) {
      console.error("Error: Invalid JSON format. Expected { labels: [...] } structure.")
      process.exit(1)
    }

    console.log(`Found ${importData.labels.length} labels to import.`)

    let successCount = 0
    let errorCount = 0
    let skipCount = 0

    for (const label of importData.labels) {
      try {
        // Skip default GitHub labels if they already exist
        if (label.default) {
          try {
            await api.getLabel(owner, repo, label.name)
            console.log(`✓ Skipped default label: ${label.name} (already exists)`)
            skipCount++
            continue
          } catch {}
        }

        await api.createLabel(owner, repo, {
          name: label.name,
          color: label.color,
          description: label.description,
        })
        console.log(`✓ Imported label: ${label.name}`)
        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes("already_exists")) {
          console.log(`✓ Skipped existing label: ${label.name}`)
          skipCount++
        } else {
          console.error(`✗ Failed to import label "${label.name}": ${errorMessage}`)
          errorCount++
        }
      }
    }

    console.log(
      `\nImport completed: ${successCount} successful, ${skipCount} skipped, ${errorCount} failed.`,
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes("ENOENT")) {
      console.error(`Error: File not found: ${filepath}`)
      console.error("Available files in .json/imports/:")
      try {
        // Use a simple approach to list files
        console.error("  Check the .json/imports/ directory for available files")
      } catch {
        console.error("  (directory not found)")
      }
    } else {
      console.error(
        "Error importing labels:",
        error instanceof Error ? error.message : String(error),
      )
    }
    process.exit(1)
  }
}
