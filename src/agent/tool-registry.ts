/** Tool declarations sent to the LLM — names, descriptions, and JSON Schema for each input. */

import { ToolDefinition } from './inference-client-types.js'

export const toolRegistry: ToolDefinition[] = [
  {
    name: 'read_file',
    description:
      "Read a file inside the learner's project directory. " +
      'Use this to inspect code the learner has written, ' +
      'or to read curriculum docs. ' +
      'Binary files and files outside the project root are rejected.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path relative to the project root.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_directory',
    description:
      'List files and directories inside the project root. ' +
      'Defaults to the root at depth 2. ' +
      'Use this to understand what the learner has built so far.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path relative to the project root. Defaults to ".".',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum recursion depth. Defaults to 2.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_recent_changes',
    description:
      'Get the most recent file change events observed by the file watcher. ' +
      'Use this to see what the learner has been working on.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of events to return.',
        },
        since: {
          type: 'string',
          description: 'ISO timestamp — only return events after this time.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_project_phase',
    description:
      'Get the current project phase, including its goals, checkpoints, and concepts introduced. ' +
      'Use this to stay oriented to what the learner is supposed to be building right now.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'advance_phase',
    description:
      'Advance the learner to the next phase. ' +
      'You MUST call this as soon as the learner has working code that satisfies all checkpoints for the current phase. ' +
      'Do not just tell the learner to move on — call this tool. ' +
      'This updates config.json and takes effect immediately.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
]
