# Q8 Documentation

Welcome to the Q8 Omni-Model Personal Assistant documentation. This directory contains comprehensive guides, specifications, and reference materials for developing and understanding the Q8 system.

## 📚 Documentation Structure

### 🏗️ Architecture
Deep dives into system design, data flow, and architectural decisions.

- [System Architecture](./architecture/system-architecture.md) - Overall system design and component interaction
- [Agent Swarm Architecture](./architecture/agent-swarm.md) - Multi-model orchestration design
- [Database Architecture](./architecture/database-architecture.md) - RxDB and Supabase sync design
- [MCP Integration](./architecture/mcp-integration.md) - Model Context Protocol implementation

### 💻 Development
Guides for developers working on Q8.

- [Backend Development Plan](./development/backend-development-plan.md) - Backend implementation roadmap
- [Frontend Development Plan](./development/frontend-development-plan.md) - Frontend implementation roadmap
- [Constitution & Protocols](./development/constitution-and-protocols.md) - Development rules and standards
- [API Reference](./development/api-reference.md) - Internal API documentation

### 📖 Guides
Step-by-step guides for common tasks.

- [Getting Started](./guides/getting-started.md) - Quick start guide
- [Project Initialization](./guides/project-initialization.md) - Initial setup script and process
- [Adding New Agents](./guides/adding-new-agents.md) - How to add specialist agents
- [Creating MCP Servers](./guides/creating-mcp-servers.md) - Building new tool integrations
- [Deployment Guide](./guides/deployment.md) - Production deployment instructions

### 📋 Specifications
Technical specifications and requirements.

- [Master Build Specs](./specifications/master-build-specs.md) - Complete technical specification
- [Data Models](./specifications/data-models.md) - Database schemas and types
- [Agent Specifications](./specifications/agent-specs.md) - Agent capabilities and configs
- [UI/UX Specifications](./specifications/ui-ux-specs.md) - Design system and components

### 📄 Templates
Reusable templates for consistency.

- [Progress Template](./templates/progress-template.md) - Task progress tracking template
- [Agent Template](./templates/agent-template.md) - New agent implementation template
- [Component Template](./templates/component-template.md) - React component template
- [MCP Server Template](./templates/mcp-server-template.md) - MCP server boilerplate

### 🔍 Reference
Reference materials and additional resources.

- [Original README](./reference/original-readme.md) - Initial project documentation
- [Glossary](./reference/glossary.md) - Terms and definitions
- [Tech Stack](./reference/tech-stack.md) - Technologies and versions
- [Environment Variables](./reference/environment-variables.md) - Complete env var reference

## 🚀 Quick Links

**New to Q8?**
1. Start with [Getting Started](./guides/getting-started.md)
2. Review [System Architecture](./architecture/system-architecture.md)
3. Follow [SETUP.md](../SETUP.md) in the root directory

**Ready to develop?**
1. Check [Constitution & Protocols](./development/constitution-and-protocols.md)
2. Review [Backend](./development/backend-development-plan.md) or [Frontend](./development/frontend-development-plan.md) plans
3. Use [CLAUDE.md](../CLAUDE.md) for Claude Code guidance

**Building integrations?**
1. Review [MCP Integration](./architecture/mcp-integration.md)
2. Follow [Creating MCP Servers](./guides/creating-mcp-servers.md)
3. Check [Agent Specifications](./specifications/agent-specs.md)

## 📝 Contributing to Documentation

When adding new documentation:

1. **Choose the right category:**
   - `architecture/` - System design and structure
   - `development/` - Development guides and processes
   - `guides/` - How-to guides and tutorials
   - `specifications/` - Technical specs and requirements
   - `templates/` - Reusable templates
   - `reference/` - Reference materials

2. **Follow naming conventions:**
   - Use lowercase with hyphens: `my-guide-name.md`
   - Be descriptive: `adding-new-agents.md` not `agents.md`

3. **Update this README:**
   - Add your document to the appropriate section
   - Include a brief description

4. **Cross-reference:**
   - Link to related documents
   - Keep navigation easy

## 🔗 External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [RxDB Documentation](https://rxdb.info/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI Agents SDK](https://github.com/openai/swarm)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📞 Support

- See [CLAUDE.md](../CLAUDE.md) for development guidelines
- Check [SETUP.md](../SETUP.md) for setup issues
- Review the relevant guide or specification for your question
