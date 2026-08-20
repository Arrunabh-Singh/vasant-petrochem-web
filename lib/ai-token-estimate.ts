// ponytail: a real tokenizer (tiktoken et al.) would count exactly, but
// the MCP server never sees the model's own context — only tool
// arguments and return values — so an exact count isn't available here
// regardless. chars/4 is the standard rough English-text approximation;
// good enough to catch a runaway budget, not meant to be exact. Upgrade
// to a real tokenizer only if the approximation is ever shown to matter.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
