/**
 * MCP Client
 * Connects to Model Context Protocol servers for tool integrations
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPServer {
  name: string;
  url: string;
  tools: MCPTool[];
}

export class MCPClient {
  private servers: Map<string, MCPServer> = new Map();

  /**
   * Register an MCP server
   */
  async registerServer(name: string, url: string): Promise<void> {
    try {
      // Fetch available tools from the server
      const response = await fetch(`${url}/tools`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tools from ${name}: ${response.statusText}`);
      }

      const tools = await response.json();

      this.servers.set(name, {
        name,
        url,
        tools,
      });
    } catch (error) {
      console.error(`Error registering MCP server ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get all tools from a specific server
   */
  getServerTools(serverName: string): MCPTool[] {
    const server = this.servers.get(serverName);
    return server?.tools || [];
  }

  /**
   * Get all available tools from all servers
   */
  getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      allTools.push(...server.tools);
    }
    return allTools;
  }

  /**
   * Execute a tool on an MCP server
   */
  async executeTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    // Find which server has this tool
    let targetServer: MCPServer | null = null;

    for (const server of this.servers.values()) {
      if (server.tools.some((tool) => tool.name === toolName)) {
        targetServer = server;
        break;
      }
    }

    if (!targetServer) {
      throw new Error(`Tool ${toolName} not found in any registered server`);
    }

    // Execute the tool
    const response = await fetch(`${targetServer.url}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: toolName,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tool execution failed: ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
export const mcpClient = new MCPClient();
