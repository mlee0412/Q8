\#\!/bin/bash

# **Q8 Project Initialization Script (Updated for Nov 2025 Stack)**

echo "🚀 Initializing Q8 Monorepo..."

# **1\. Install Turbo & PNPM**

npm install \-g pnpm turbo

# **2\. Create Workspace**

npx create-turbo@latest q8  
cd q8

# **3\. Setup Next.js 16 App (Web)**

cd apps  
rm \-rf web  
npx create-next-app@latest web \--typescript \--tailwind \--eslint \--use-pnpm  
cd web

# **Core Dependencies**

pnpm install rxdb framer-motion lucide-react shadcn-ui next-themes

# **AI & Backend**

pnpm install ai-agents-sdk openai litellm @supabase/supabase-js

# **Tooling**

pnpm install @modelcontextprotocol/sdk zod  
cd ../..

# **4\. Setup Infrastructure Folder**

mkdir infra  
mkdir infra/supabase  
mkdir infra/docker

# **5\. Create MCP Servers Folder**

mkdir apps/mcp-servers  
mkdir apps/mcp-servers/github  
mkdir apps/mcp-servers/google  
mkdir apps/mcp-servers/spotify

# **6\. Create Environment Template**

touch apps/web/.env.local.example  
cat \<\<EOT \>\> apps/web/.env.local.example

# **\--- AI Providers \---**

OPENAI\_API\_KEY=""  
ANTHROPIC\_API\_KEY=""  
GOOGLE\_GENERATIVE\_AI\_KEY=""  
PERPLEXITY\_API\_KEY=""  
XAI\_API\_KEY=""

# **\--- Database \---**

NEXT\_PUBLIC\_SUPABASE\_URL=""  
NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY=""  
SUPABASE\_SERVICE\_ROLE\_KEY=""

# **\--- Tool Integrations \---**

GOOGLE\_CLIENT\_ID=""  
GOOGLE\_CLIENT\_SECRET=""  
GITHUB\_PERSONAL\_ACCESS\_TOKEN=""  
SPOTIFY\_CLIENT\_ID=""  
SPOTIFY\_CLIENT\_SECRET=""  
EOT  
echo "✅ Project Structure Created\!"  
echo "👉 Next Steps: Fill in .env.local and run 'pnpm dev'"