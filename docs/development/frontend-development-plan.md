# **Q8 Frontend Development Plan (The "Glass Console")**

**Focus:** Visual fidelity, Local-First performance (RxDB), and Reactive Components (React 19.2).

## **1\. Directory Structure (apps/web)**

apps/web/  
├── src/  
│   ├── app/  
│   │   ├── (main)/  
│   │   │   ├── page.tsx             \# Main Dashboard  
│   │   │   ├── chat/page.tsx        \# Full Chat Interface  
│   │   │   ├── dev/page.tsx         \# Developer Hub (GitHub/Supabase)  
│   │   │   ├── media/page.tsx       \# Media Center  
│   │   │   └── settings/page.tsx    \# App Settings  
│   │   ├── layout.tsx               \# Root Layout (Providers)  
│   │   └── globals.css              \# Tailwind v4 Base Styles  
│   ├── components/  
│   │   ├── ui/                      \# Shadcn Primitives (Button, Input, etc.)  
│   │   ├── dashboard/               \# Bento Grid Components  
│   │   │   ├── BentoGrid.tsx  
│   │   │   ├── SmartTile.tsx  
│   │   │   └── widgets/             \# Individual Widgets (Weather, Spotify, etc.)  
│   │   ├── voice/                   \# WebRTC Voice Interface  
│   │   │   ├── VoiceOverlay.tsx  
│   │   │   └── AudioVisualizer.tsx  
│   │   └── shared/                  \# Shared logic (AI Button, Sparkles)  
│   ├── hooks/  
│   │   ├── useRxDB.ts               \# Database Access  
│   │   ├── useRealtimeAgent.ts      \# Voice Logic  
│   │   └── useSystemStatus.ts       \# Connectivity/Sync Status  
│   └── lib/  
│       ├── db/                      \# RxDB Schema & Init  
│       └── utils/                   \# Helper functions

## **2\. Design System (Tailwind v4)**

**Theme:** "Glassmorphism 2.0" \- Deep, rich backgrounds with frosted glass overlays.

/\* globals.css \*/  
@theme {  
  \--color-glass-bg: oklch(100% 0 0 / 0.08);  
  \--color-glass-border: oklch(100% 0 0 / 0.15);  
  \--blur-glass: 24px;  
  \--radius-xl: 1.5rem;  
    
  \--color-neon-primary: oklch(65% 0.2 260); /\* Electric Purple \*/  
  \--color-neon-accent: oklch(80% 0.3 140);  /\* Cyber Green \*/  
}

.glass-panel {  
  background: var(--color-glass-bg);  
  backdrop-filter: blur(var(--blur-glass));  
  border: 1px solid var(--color-glass-border);  
  border-radius: var(--radius-xl);  
  box-shadow:   
    0 4px 30px rgba(0, 0, 0, 0.1),  
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);  
}

## **3\. Key Components Implementation**

### **A. Bento Grid System**

A responsive, drag-and-drop grid.

// components/dashboard/BentoGrid.tsx  
'use client';  
import { motion } from 'framer-motion';

export const BentoGrid \= ({ children }) \=\> {  
  return (  
    \<div className="grid grid-cols-1 md:grid-cols-4 auto-rows-\[180px\] gap-4 p-4"\>  
      {children}  
    \</div\>  
  );  
};

export const BentoItem \= ({ colSpan \= 1, rowSpan \= 1, children }) \=\> {  
  return (  
    \<motion.div   
      layout  
      className={\`glass-panel col-span-${colSpan} row-span-${rowSpan} relative overflow-hidden\`}  
    \>  
      {children}  
    \</motion.div\>  
  );  
};

### **B. Widget Implementation (Example: GitHub)**

Displays live data from RxDB, with an AI Button for assistance.

// components/dashboard/widgets/GitHubWidget.tsx  
import { useRxData } from 'rxdb-hooks';  
import { AIButton } from '@/components/shared/AIButton';

export const GitHubWidget \= () \=\> {  
  // Queries local DB, updated via background sync  
  const { result: prs } \= useRxData('github\_prs', q \=\> q.find().where('status').eq('open'));

  return (  
    \<div className="p-4 h-full flex flex-col"\>  
      \<div className="flex justify-between items-center mb-2"\>  
        \<h3 className="text-white/80 font-medium"\>Active PRs\</h3\>  
        \<AIButton context={{ type: 'github\_summary', data: prs }} /\>  
      \</div\>  
      \<ul className="space-y-2 overflow-y-auto flex-1"\>  
        {prs.map(pr \=\> (  
          \<li key={pr.id} className="flex justify-between text-sm"\>  
            \<span className="text-white"\>{pr.title}\</span\>  
            \<span className={\`status-badge ${pr.buildStatus}\`} /\>  
          \</li\>  
        ))}  
      \</ul\>  
    \</div\>  
  );  
};

### **C. Voice Overlay**

The immersive voice mode that blurs the dashboard.

// components/voice/VoiceOverlay.tsx  
import { useRealtimeAgent } from '@/hooks/useRealtimeAgent';  
import { AudioVisualizer } from './AudioVisualizer';

export const VoiceOverlay \= () \=\> {  
  const { isConnected, isSpeaking, audioStream } \= useRealtimeAgent();

  if (\!isConnected) return null;

  return (  
    \<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl"\>  
      \<div className="flex flex-col items-center gap-8"\>  
        \<h2 className="text-3xl font-light text-white tracking-tight"\>  
          {isSpeaking ? "Q8 is speaking..." : "Listening..."}  
        \</h2\>  
        \<AudioVisualizer stream={audioStream} /\>  
        \<button   
          className="px-8 py-3 rounded-full bg-red-500/20 text-red-400 border border-red-500/50"  
          onClick={() \=\> disconnect()}  
        \>  
          End Session  
        \</button\>  
      \</div\>  
    \</div\>  
  );  
};

## **4\. Routing Strategy (App Router)**

* / \-\> **Dashboard:** The personalized Bento grid.  
* /chat \-\> **Chat Interface:** Full-screen chat history with multi-modal upload (drag & drop images/files).  
* /dev \-\> **Developer Console:** A specialized dashboard for GitHub/Supabase metrics.  
* /media \-\> **Media Center:** Expanded view for Spotify/YouTube control.

This plan ensures the frontend is modular, visually aligned with 2025 trends, and leverages local-first data for instant interactions.