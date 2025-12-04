/**
 * Spotify MCP Server
 * Provides Spotify integration tools via MCP protocol
 */

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

/**
 * Get available tools
 */
app.get('/tools', (req, res) => {
  res.json([
    {
      name: 'spotify_play_track',
      description: 'Play a track by URI',
      inputSchema: {
        type: 'object',
        properties: {
          uri: { type: 'string' },
        },
        required: ['uri'],
      },
    },
    {
      name: 'spotify_search',
      description: 'Search for tracks, albums, or artists',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          type: { type: 'string', enum: ['track', 'album', 'artist', 'playlist'] },
        },
        required: ['query'],
      },
    },
    {
      name: 'spotify_get_queue',
      description: 'Get current playback queue',
      inputSchema: {
        type: 'object',
        properties: {},
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
    // TODO: Implement actual Spotify API calls
    // This is a stub for now
    res.json({
      message: `Tool ${tool} executed (stub)`,
      params,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Spotify MCP Server running on port ${PORT}`);
});
