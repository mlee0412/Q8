# Docker Infrastructure

## Development Setup

### Running MCP Servers Locally

1. **Build and start all MCP servers:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop all services:**
   ```bash
   docker-compose down
   ```

### Individual Services

**GitHub MCP Server:**
```bash
docker-compose up -d github-mcp
```

**Google Workspace MCP Server:**
```bash
docker-compose up -d google-mcp
```

**Spotify MCP Server:**
```bash
docker-compose up -d spotify-mcp
```

## Environment Variables

Ensure `apps/web/.env.local` contains all required API keys and tokens.

## Ports

- GitHub MCP: `http://localhost:3001`
- Google MCP: `http://localhost:3002`
- Spotify MCP: `http://localhost:3003`

## Creating Dockerfiles

Each MCP server needs a Dockerfile in its directory:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```
