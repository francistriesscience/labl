import { GitHubLabelsAPI } from "../api"

export async function handleList(api: GitHubLabelsAPI, owner: string, repo: string) {
  const labels = await api.listLabels(owner, repo)
  console.log("Labels:")
  labels.forEach((label) => {
    console.log(
      `- ${label.name} (${label.color}) ${label.description ? `- ${label.description}` : ""}`,
    )
  })
}
