import type { Label, CreateLabelRequest, UpdateLabelRequest } from './types.js';

export class GitHubLabelsAPI {
  private baseUrl = 'https://api.github.com';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}\n${error}`);
    }

    return response.json() as T;
  }

  async listLabels(owner: string, repo: string): Promise<Label[]> {
    return this.request<Label[]>('GET', `/repos/${owner}/${repo}/labels`);
  }

  async createLabel(owner: string, repo: string, label: CreateLabelRequest): Promise<Label> {
    return this.request<Label>('POST', `/repos/${owner}/${repo}/labels`, label);
  }

  async getLabel(owner: string, repo: string, name: string): Promise<Label> {
    return this.request<Label>('GET', `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`);
  }

  async updateLabel(owner: string, repo: string, name: string, updates: UpdateLabelRequest): Promise<Label> {
    return this.request<Label>('PATCH', `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`, updates);
  }

  async deleteLabel(owner: string, repo: string, name: string): Promise<void> {
    await this.request('DELETE', `/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`);
  }
}