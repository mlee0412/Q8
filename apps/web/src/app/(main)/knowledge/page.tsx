'use client';

/**
 * Knowledge Base Page
 * Full-page document management interface
 */

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { KnowledgeBase } from '@/components/documents';
import { AnimatedBackground } from '@/components/shared/AnimatedBackground';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function KnowledgePageContent() {
  return (
    <div className="min-h-screen relative">
      {/* Animated background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-4 p-4 border-b border-white/10 backdrop-blur-lg bg-black/20">
          <Link
            href="/"
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white">Knowledge Base</h1>
            <p className="text-sm text-white/50">
              Manage your documents and files
            </p>
          </div>
        </header>

        {/* Knowledge Base */}
        <div className="flex-1 overflow-hidden backdrop-blur-lg bg-black/20">
          <KnowledgeBase />
        </div>
      </div>
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <ProtectedRoute>
      <KnowledgePageContent />
    </ProtectedRoute>
  );
}
