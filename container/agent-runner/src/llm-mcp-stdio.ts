/**
 * LLM MCP Server for NanoClaw
 * Provides tools to call OpenRouter and Groq from the agent.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'llm-tools',
  version: '1.0.0',
});

// Tool for OpenRouter
server.tool(
  'openrouter_generate',
  'Generate text using a model from OpenRouter. Requires OPENROUTER_API_KEY.',
  {
    model: z.string().describe('The OpenRouter model ID (e.g., "openai/gpt-4o", "anthropic/claude-3.5-sonnet")'),
    prompt: z.string().describe('The prompt to send to the model'),
    system: z.string().optional().describe('Optional system prompt'),
    temperature: z.number().optional().default(0.7),
    max_tokens: z.number().optional().default(1000),
  },
  async (args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { content: [{ type: 'text', text: 'Error: OPENROUTER_API_KEY not found in environment.' }] };
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nanoclaw.dev',
          'X-Title': 'NanoClaw',
        },
        body: JSON.stringify({
          model: args.model,
          messages: [
            ...(args.system ? [{ role: 'system', content: args.system }] : []),
            { role: 'user', content: args.prompt },
          ],
          temperature: args.temperature,
          max_tokens: args.max_tokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { content: [{ type: 'text', text: `OpenRouter API error: ${response.status} ${error}` }] };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'No response from OpenRouter.';
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error calling OpenRouter: ${err instanceof Error ? err.message : String(err)}` }] };
    }
  },
);

// Tool for Groq
server.tool(
  'groq_generate',
  'Generate text using a model from Groq. Requires GROQ_API_KEY.',
  {
    model: z.string().describe('The Groq model ID (e.g., "llama3-70b-8192", "mixtral-8x7b-32768")'),
    prompt: z.string().describe('The prompt to send to the model'),
    system: z.string().optional().describe('Optional system prompt'),
    temperature: z.number().optional().default(0.7),
    max_tokens: z.number().optional().default(1000),
  },
  async (args) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { content: [{ type: 'text', text: 'Error: GROQ_API_KEY not found in environment.' }] };
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: args.model,
          messages: [
            ...(args.system ? [{ role: 'system', content: args.system }] : []),
            { role: 'user', content: args.prompt },
          ],
          temperature: args.temperature,
          max_tokens: args.max_tokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { content: [{ type: 'text', text: `Groq API error: ${response.status} ${error}` }] };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'No response from Groq.';
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error calling Groq: ${err instanceof Error ? err.message : String(err)}` }] };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error in LLM MCP server:', error);
  process.exit(1);
});
