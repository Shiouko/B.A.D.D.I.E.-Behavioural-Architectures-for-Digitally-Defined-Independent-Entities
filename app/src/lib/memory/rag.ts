// src/lib/memory/rag.ts
// B.A.D.D.I.E. Memory System - typed RAG with episodic, semantic, procedural stores

export type MemoryType = 'episodic' | 'semantic' | 'procedural';

export interface MemoryRecord {
  id: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: {
    timestamp: number;
    source: string;
    importance: number;
    tags: string[];
  };
}

export class TypedMemoryStore {
  private episodic: MemoryRecord[] = [];
  private semantic: MemoryRecord[] = [];
  private procedural: MemoryRecord[] = [];

  add(record: MemoryRecord): void {
    switch (record.type) {
      case 'episodic': this.episodic.push(record); break;
      case 'semantic': this.semantic.push(record); break;
      case 'procedural': this.procedural.push(record); break;
    }
  }

  query(text: string, types?: MemoryType[], topK = 5): MemoryRecord[] {
    const searchTypes = types || ['episodic', 'semantic', 'procedural'];
    const results: MemoryRecord[] = [];
    for (const type of searchTypes) {
      const store = this.getStore(type);
      const matches = store
        .filter(r => r.content.toLowerCase().includes(text.toLowerCase()))
        .sort((a, b) => b.metadata.importance - a.metadata.importance)
        .slice(0, topK);
      results.push(...matches);
    }
    return results;
  }

  getStats() {
    return {
      episodic: this.episodic.length,
      semantic: this.semantic.length,
      procedural: this.procedural.length,
      total: this.episodic.length + this.semantic.length + this.procedural.length,
    };
  }

  clear(): void {
    this.episodic = [];
    this.semantic = [];
    this.procedural = [];
  }

  private getStore(type: MemoryType): MemoryRecord[] {
    switch (type) {
      case 'episodic': return this.episodic;
      case 'semantic': return this.semantic;
      case 'procedural': return this.procedural;
    }
  }
}
