'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Youtube,
  Tv,
  Instagram,
  Radio,
  Sparkles,
  ChevronRight,
  Check,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ServiceConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
  authUrl?: string;
  isConnected?: boolean;
}

const SERVICES: ServiceConfig[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: Music,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: 'Stream music, podcasts & playlists',
    authUrl: '/api/spotify/auth',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    description: 'Watch videos & music',
    authUrl: '/api/youtube/auth',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    icon: Tv,
    color: 'text-red-500',
    bgColor: 'bg-red-600/20',
    description: 'Movies & TV shows',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-400',
    bgColor: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
    description: 'Reels & stories',
  },
  {
    id: 'podcast',
    name: 'Podcasts',
    icon: Radio,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    description: 'Audio shows & episodes',
  },
];

interface OnboardingCardProps {
  connectedServices?: string[];
  onConnect?: (serviceId: string) => void;
  onSkip?: () => void;
  onComplete?: () => void;
  className?: string;
}

export function OnboardingCard({
  connectedServices = [],
  onConnect,
  onSkip,
  onComplete,
  className,
}: OnboardingCardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const steps = [
    { title: 'Welcome to ContentHub', subtitle: 'Your unified media experience' },
    { title: 'Connect Your Services', subtitle: 'Choose what you want to stream' },
    { title: 'All Set!', subtitle: 'Start exploring your content' },
  ];

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleConnect = async (service: ServiceConfig) => {
    if (service.authUrl) {
      window.location.href = service.authUrl;
    }
    onConnect?.(service.id);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-surface-3/90 via-surface-3/70 to-neon-primary/10',
        'backdrop-blur-xl border border-border-subtle',
        'shadow-2xl',
        className
      )}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-neon-primary/20 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-neon-accent/20 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative z-10 p-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === currentStep
                  ? 'w-8 bg-neon-primary'
                  : index < currentStep
                    ? 'w-4 bg-neon-primary/60'
                    : 'w-4 bg-white/20'
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-primary to-neon-accent mb-4"
              >
                <Sparkles className="h-8 w-8 text-white" />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-2">
                Welcome to ContentHub
              </h2>
              <p className="text-sm text-text-muted mb-6 max-w-xs mx-auto">
                Your unified media experience. Stream music, watch videos, and discover
                content from all your favorite services in one place.
              </p>

              <div className="flex items-center justify-center gap-3 mb-6">
                {SERVICES.slice(0, 4).map((service, index) => {
                  const Icon = service.icon;
                  return (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className={cn(
                        'p-2.5 rounded-xl',
                        service.bgColor
                      )}
                    >
                      <Icon className={cn('h-5 w-5', service.color)} />
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-text-muted"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-neon-primary hover:bg-neon-primary/90"
                >
                  Get Started
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Connect Services */}
          {currentStep === 1 && (
            <motion.div
              key="services"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-lg font-bold text-white mb-1 text-center">
                Connect Your Services
              </h2>
              <p className="text-xs text-text-muted mb-4 text-center">
                Link your accounts to start streaming
              </p>

              <div className="space-y-2 mb-6">
                {SERVICES.map((service) => {
                  const Icon = service.icon;
                  const isConnected = connectedServices.includes(service.id);
                  const isSelected = selectedServices.includes(service.id);

                  return (
                    <motion.button
                      key={service.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (service.authUrl && !isConnected) {
                          handleConnect(service);
                        } else {
                          toggleService(service.id);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
                        'border',
                        isConnected
                          ? 'bg-green-500/10 border-green-500/30'
                          : isSelected
                            ? 'bg-neon-primary/10 border-neon-primary/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                      )}
                    >
                      <div className={cn('p-2 rounded-lg', service.bgColor)}>
                        <Icon className={cn('h-4 w-4', service.color)} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-white">
                          {service.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {service.description}
                        </p>
                      </div>
                      {isConnected ? (
                        <div className="flex items-center gap-1 text-green-400 text-xs">
                          <Check className="h-3.5 w-3.5" />
                          Connected
                        </div>
                      ) : service.authUrl ? (
                        <ExternalLink className="h-4 w-4 text-text-muted" />
                      ) : (
                        <span className="text-xs text-text-muted">Coming soon</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(0)}
                  className="text-text-muted"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-neon-primary hover:bg-neon-primary/90"
                >
                  {connectedServices.length > 0 ? 'Continue' : 'Skip for now'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Complete */}
          {currentStep === 2 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4"
              >
                <Check className="h-8 w-8 text-green-400" />
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-2">
                You&apos;re All Set!
              </h2>
              <p className="text-sm text-text-muted mb-6 max-w-xs mx-auto">
                {connectedServices.length > 0
                  ? `${connectedServices.length} service${connectedServices.length > 1 ? 's' : ''} connected. Start exploring your personalized content.`
                  : 'You can connect services anytime from settings. Explore demo content for now.'}
              </p>

              <Button
                onClick={onComplete}
                size="lg"
                className="bg-gradient-to-r from-neon-primary to-neon-accent hover:opacity-90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Exploring
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default OnboardingCard;
