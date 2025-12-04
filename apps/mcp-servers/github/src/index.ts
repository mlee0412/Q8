/**
 * GitHub MCP Server
 * Provides GitHub integration tools via MCP protocol
 */

import express from 'express';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const octokit = new Octokit({
  auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
});

/**
 * Get available tools
 */
app.get('/tools', (req, res) => {
  res.json([
    {
      name: 'github_search_code',
      description: 'Search code across repositories',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          repo: { type: 'string' },
        },
        required: ['query'],
      },
    },
    {
      name: 'github_get_file',
      description: 'Get file content from a repository',
      inputSchema: {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          path: { type: 'string' },
          ref: { type: 'string' },
        },
        required: ['repo', 'path'],
      },
    },
    {
      name: 'github_create_issue',
      description: 'Create a new issue',
      inputSchema: {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['repo', 'title'],
      },
    },
    {
      name: 'github_list_prs',
      description: 'List pull requests',
      inputSchema: {
        type: 'object',
        properties: {
          repo: { type: 'string' },
          state: { type: 'string', enum: ['open', 'closed', 'all'] },
        },
        required: ['repo'],
      },
    },
  ]);
});

/**
 * Execute a tool
 */
app.post('/execute', async (req, res) => {
  const { tool, params } = req.body;

  try {
    let result;

    switch (tool) {
      case 'github_search_code':
        result = await octokit.search.code({
          q: params.query + (params.repo ? ` repo:${params.repo}` : ''),
        });
        break;

      case 'github_get_file':
        const [owner, repo] = params.repo.split('/');
        result = await octokit.repos.getContent({
          owner,
          repo,
          path: params.path,
          ref: params.ref,
        });
        break;

      case 'github_create_issue':
        const [issueOwner, issueRepo] = params.repo.split('/');
        result = await octokit.issues.create({
          owner: issueOwner,
          repo: issueRepo,
          title: params.title,
          body: params.body,
        });
        break;

      case 'github_list_prs':
        const [prOwner, prRepo] = params.repo.split('/');
        result = await octokit.pulls.list({
          owner: prOwner,
          repo: prRepo,
          state: params.state || 'open',
        });
        break;

      default:
        return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }

    res.json(result.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`GitHub MCP Server running on port ${PORT}`);
});
