export interface Label {
  id: number
  node_id: string
  url: string
  name: string
  color: string
  default: boolean
  description?: string
}

export interface CreateLabelRequest {
  name: string
  color: string
  description?: string
}

export interface UpdateLabelRequest {
  name?: string
  color?: string
  description?: string
}

export interface CLIOptions {
  owner?: string
  repo?: string
  token?: string
  name?: string
  newName?: string
  color?: string
  description?: string
  fromOwner?: string
  fromRepo?: string
  toOwner?: string
  toRepo?: string
}
