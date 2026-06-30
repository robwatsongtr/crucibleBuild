/** Paths and tunables that may need tweaking without touching logic. */

export const CRUCIBLEBUILD_DIR = '.cruciblebuild'
export const CONFIG_FILE = 'config.json'
export const STATE_DIR = 'state'
export const README_FILE = 'README.md'

export const PROFILE_VERSION = '1.0.0'
export const DEFAULT_PROFILE_ID = 'luthor-default'
export const DEFAULT_PHASE_ID = 'python-tokens'

export const DEBOUNCE_MS = 300
export const RING_BUFFER_SIZE = 15
export const FILE_SIZE_CAP_BYTES = 16 * 1024
export const FILE_TREE_MAX_DEPTH = 3

// Provider: CRUCIBLEBUILD_PROVIDER=anthropic (default) | gemini
export const DEFAULT_PROVIDER = 'anthropic'

// Anthropic models — override with CRUCIBLEBUILD_MODEL
export const ANTHROPIC_MODEL_SONNET = 'claude-sonnet-4-6' // default
export const ANTHROPIC_MODEL_HAIKU = 'claude-haiku-4-5-20251001'

// Gemini models — override with CRUCIBLEBUILD_MODEL
export const GEMINI_MODEL_FLASH = 'gemini-2.0-flash' // free tier default

export const DEFAULT_MODEL_ANTHROPIC = ANTHROPIC_MODEL_SONNET
export const DEFAULT_MODEL_GEMINI = GEMINI_MODEL_FLASH

export const MAX_TOKENS = 2048
export const TEMPERATURE = 0.7

export const CACHE_HISTORY_THRESHOLD = 3
