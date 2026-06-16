/**
 * Factory that selects and constructs the correct InferenceClient based on
 * the CRUCIBLEBUILD_PROVIDER environment variable.
 *
 * Defaults to Anthropic if the env var is not set.
 * Set CRUCIBLEBUILD_PROVIDER=gemini to use the Gemini free tier.
 */

import { InferenceClient } from './inference-client.js'
import { AnthropicClient } from './anthropic-client.js'
import { GeminiClient } from './gemini-client.js'
import { DEFAULT_PROVIDER } from '../config/constants.js'

export const createInferenceClient = (): InferenceClient => {
  const provider = process.env.CRUCIBLEBUILD_PROVIDER ?? DEFAULT_PROVIDER

  if (provider === 'gemini') {
    return new GeminiClient()
  }

  return new AnthropicClient()
}
