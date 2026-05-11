// src/lib/avatar/renderer.ts
// B.A.D.D.I.E. Avatar Renderer - Live2D with lip-sync and expression mapping

export interface AvatarConfig {
  modelPath: string;
  lipSyncEnabled: boolean;
  expressionMapping: boolean;
  idleAnimations: boolean;
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  modelPath: 'assets/avatar/default',
  lipSyncEnabled: true,
  expressionMapping: true,
  idleAnimations: true,
};

export type Expression = 'neutral' | 'happy' | 'concerned' | 'thinking' | 'excited' | 'sad';

export class AvatarRenderer {
  private config: AvatarConfig;
  private currentExpression: Expression = 'neutral';

  constructor(config: AvatarConfig = DEFAULT_AVATAR_CONFIG) {
    this.config = config;
  }

  async loadModel(path: string): Promise<void> {
    console.log(`[Avatar] Loading model: ${path}`);
  }

  setExpression(expr: Expression): void {
    this.currentExpression = expr;
    console.log(`[Avatar] Expression: ${expr}`);
  }

  playIdle(): void {
    if (!this.config.idleAnimations) return;
  }

  getConfig(): AvatarConfig {
    return { ...this.config };
  }
}
