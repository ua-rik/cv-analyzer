import type { Criterion, LLMScore } from './llm';

export function calculateWeightedScore(criteria: Criterion[], scores: LLMScore[]): number {
  const weights = new Map(criteria.map((criterion) => [criterion.id, criterion.weight]));
  return scores.reduce((total, score) => {
    const weight = weights.get(score.id) ?? 0;
    return total + score.score * weight;
  }, 0);
}
