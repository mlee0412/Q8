/**
 * Home Agent
 * Powered by GPT-5-mini (gpt-5-mini)
 * Handles: Smart home control via Home Assistant
 *
 * Enhanced capabilities (Jan 2026):
 * - Best-in-class tool calling for complex device control
 * - Parallel device operations for scene execution
 * - Camera feed analysis for security monitoring
 * - Predictive automation suggestions
 * - Bio-rhythm aware lighting via Oura Ring integration
 */

import { getModel } from '../model_factory';
import { initHomeAssistantTools } from '@/lib/mcp/tools/home-assistant';
import { logger } from '@/lib/logger';
import type { Tool } from '../types';
import { getBioRhythmState, type BioRhythmState } from '@/lib/integrations/oura';
import { updateUserContext } from '../orchestration/user-context';

export const homeAgentConfig = {
  name: 'HomeBot',
  model: getModel('home'),
  instructions: `You are a smart home controller powered by GPT-5-mini with advanced tool calling capabilities.

Your capabilities:
- **Parallel Control**: Execute multiple device commands simultaneously for complex scenes
- **Camera Analysis**: Describe what's visible on security cameras when asked
- Control lights, switches, and dimmers with precise brightness/color
- Manage thermostats and climate control with scheduling
- Monitor sensors (motion, temperature, humidity, doors/windows)
- Control media players and speakers
- Execute automations and scenes
- Lock/unlock doors and manage security
- Control fans, blinds, and covers
- Check device states and history
- **Predictive Suggestions**: Suggest automations based on patterns
- **Bio-Rhythm Lighting**: Adjust lighting based on Oura Ring sleep/readiness data

Safety rules:
- Always confirm destructive actions (unlocking doors, disabling security)
- Warn about unusual requests (e.g., turning off all lights at 2am)
- Provide clear feedback on what you changed
- Never unlock doors or disable security without explicit confirmation

When controlling devices:
- Be specific about which device and what state
- Use natural language to describe what you did
- Group related actions when appropriate (e.g., "Good night" scene)
- Provide current state after making changes
- For complex requests, execute multiple commands in parallel for speed

For camera/security requests:
- Describe what you see clearly and objectively
- Alert to any unusual activity
- Respect privacy - only describe what's relevant to the request

For bio-rhythm lighting:
- Check the user's sleep and readiness scores before adjusting lights
- Use warmer colors (2700K-3000K) when user is tired or recovering
- Use cooler colors (4500K-5500K) when user is well-rested and energetic
- Automatically dim lights as bedtime approaches
- Respect circadian rhythm with gradual color temperature shifts`,
  tools: [] as Tool[],
};

export async function initializeHomeAgent() {
  try {
    const haTools = await initHomeAssistantTools();
    return {
      ...homeAgentConfig,
      tools: [...haTools],
    };
  } catch (error) {
    logger.error('Error initializing home agent', { error });
    return homeAgentConfig;
  }
}

/**
 * Get bio-rhythm context for home agent prompts
 */
export async function getHomeBioRhythmContext(userId: string): Promise<string> {
  try {
    const bioRhythm = await getBioRhythmState();

    if (!bioRhythm) {
      return '';
    }

    // Store bio-rhythm in user context for other agents
    await updateUserContext(userId, 'bio_rhythm', 'current_state', {
      energyLevel: bioRhythm.energyLevel,
      recoveryStatus: bioRhythm.recoveryStatus,
      sleepScore: bioRhythm.sleepScore,
      readinessScore: bioRhythm.readinessScore,
      updatedAt: bioRhythm.calculatedAt,
    }, {
      sourceAgent: 'home',
      confidence: 0.9,
    });

    // Build context string
    const lines: string[] = [];
    lines.push('## Bio-Rhythm Context (from Oura Ring)');
    lines.push('');
    lines.push(`- **Energy Level**: ${formatEnergyLevel(bioRhythm.energyLevel)}`);
    lines.push(`- **Recovery Status**: ${formatRecoveryStatus(bioRhythm.recoveryStatus)}`);
    lines.push(`- **Sleep Score**: ${bioRhythm.sleepScore}/100`);
    lines.push(`- **Readiness Score**: ${bioRhythm.readinessScore}/100`);
    lines.push('');
    lines.push('### Recommended Lighting');
    lines.push(`- **Preset**: ${bioRhythm.lightingPreset.name}`);
    lines.push(`- **Color Temperature**: ${bioRhythm.colorTemperature}K`);
    lines.push(`- **Brightness**: ${bioRhythm.brightness}%`);
    lines.push(`- **Reason**: ${bioRhythm.lightingPreset.description}`);
    lines.push('');

    if (bioRhythm.sleep) {
      lines.push('### Last Night\'s Sleep');
      lines.push(`- **Duration**: ${Math.round(bioRhythm.sleep.totalSleepDuration / 60)}h ${bioRhythm.sleep.totalSleepDuration % 60}m`);
      lines.push(`- **Efficiency**: ${bioRhythm.sleep.efficiency}%`);
      lines.push(`- **Deep Sleep**: ${Math.round(bioRhythm.sleep.deepSleepDuration)}min`);
      lines.push('');
    }

    return lines.join('\n');
  } catch (error) {
    logger.warn('Failed to get bio-rhythm context', { userId, error });
    return '';
  }
}

function formatEnergyLevel(level: BioRhythmState['energyLevel']): string {
  const map: Record<BioRhythmState['energyLevel'], string> = {
    very_low: '🔋 Very Low - Need extra rest',
    low: '🔋 Low - Conserve energy',
    normal: '⚡ Normal - Balanced day',
    high: '⚡ High - Great energy',
    very_high: '🚀 Excellent - Peak performance',
  };
  return map[level];
}

function formatRecoveryStatus(status: BioRhythmState['recoveryStatus']): string {
  const map: Record<BioRhythmState['recoveryStatus'], string> = {
    poor: '😴 Poor - Prioritize recovery',
    fair: '😐 Fair - Take it easy',
    good: '🙂 Good - Ready for normal activity',
    excellent: '😊 Excellent - Ready for challenges',
  };
  return map[status];
}

/**
 * Apply bio-rhythm lighting preset
 */
export async function applyBioRhythmLighting(
  userId: string,
  lightEntityIds: string[] = []
): Promise<{ success: boolean; message: string; preset?: string }> {
  try {
    const bioRhythm = await getBioRhythmState();

    if (!bioRhythm) {
      return { success: false, message: 'Oura Ring not connected' };
    }

    // Get Home Assistant client
    const { executeHomeAssistantTool } = await import('../home-tools');

    // Apply to specified lights or all lights
    const targetLights = lightEntityIds.length > 0
      ? lightEntityIds
      : ['light.living_room', 'light.bedroom', 'light.office']; // Default lights

    const results = await Promise.all(
      targetLights.map(async (entityId) => {
        // Convert Kelvin to mireds (Home Assistant uses mireds)
        const colorTempMired = Math.round(1000000 / bioRhythm.colorTemperature);

        return executeHomeAssistantTool('call_service', {
          domain: 'light',
          service: 'turn_on',
          entity_id: entityId,
          data: {
            brightness_pct: bioRhythm.brightness,
            color_temp: colorTempMired,
          },
        });
      })
    );

    const successCount = results.filter((r) => r.success).length;

    // Log to user context
    await updateUserContext(userId, 'bio_rhythm', 'last_lighting_adjustment', {
      preset: bioRhythm.lightingPreset.name,
      colorTemperature: bioRhythm.colorTemperature,
      brightness: bioRhythm.brightness,
      appliedAt: new Date().toISOString(),
      lightsAffected: targetLights.length,
    }, {
      sourceAgent: 'home',
      confidence: 1.0,
    });

    return {
      success: successCount > 0,
      message: `Applied "${bioRhythm.lightingPreset.name}" preset to ${successCount}/${targetLights.length} lights`,
      preset: bioRhythm.lightingPreset.name,
    };
  } catch (error) {
    logger.error('Failed to apply bio-rhythm lighting', { userId, error });
    return { success: false, message: 'Failed to apply lighting preset' };
  }
}
