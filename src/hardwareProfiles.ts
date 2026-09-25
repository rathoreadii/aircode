export interface ModelTier {
  name: string;
  description: string;
  inlineModel: string;
  chatModel: string;
  recommendedVram: string;
}

export const HARDWARE_PROFILES: Record<string, ModelTier> = {
  '8gb': {
    name: 'Economy (≤ 8 GB RAM / CPU)',
    description: 'Ultra-lightweight models running on CPU or integrated graphics.',
    inlineModel: 'qwen2.5-coder:1.5b',
    chatModel: 'qwen2.5-coder:1.5b',
    recommendedVram: '0-2 GB (CPU Friendly)'
  },
  '16gb': {
    name: 'Mid-Tier (16 GB RAM / 4–6 GB VRAM)',
    description: 'Fast 3B inline completions with a high-accuracy 7B reasoning chat agent.',
    inlineModel: 'qwen2.5-coder:3b',
    chatModel: 'qwen2.5-coder:7b',
    recommendedVram: '4–6 GB VRAM'
  },
  '32gb': {
    name: 'Workstation (32 GB+ RAM / Dedicated GPU)',
    description: 'State-of-the-art coding and multi-file reasoning models.',
    inlineModel: 'starcoder2:3b',
    chatModel: 'deepseek-coder-v2:16b',
    recommendedVram: '8+ GB VRAM'
  }
};