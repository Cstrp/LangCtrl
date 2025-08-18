import { LLMConfig } from '../interfaces';

/**
 * Default configuration for Ollama-based local models.
 *
 * These defaults are conservative for local inference (lower temperature,
 * moderate retry count). Use a higher temperature for creative generation.
 *
 * Fields:
 *  - temperature: number (0-1). Lower values produce deterministic output.
 *  - maxRetries: number. How many times to retry transient failures.
 *  - maxConcurrency: number. Max concurrent model invocations.
 *
 * Example/local model names frequently used with Ollama (verify locally):
 *  - 'deepseek-r1:1.5b'
 *  - 'qwen3:0.6b'
 *
 * Note: Ollama runs models locally or from a local registry — names vary by
 * what you've pulled. Always run `ollama list` to see installed models.
 */

export const DEFAULT_OLLAMA_CONFIG: LLMConfig = {
  temperature: 0,
  maxRetries: 5,
  maxConcurrency: 2,
} as const;
