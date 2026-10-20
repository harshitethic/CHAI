/** A precondition rejected BEFORE input dispatch. Never use for ambiguous outcomes,
 * timeouts, permission failures or declined confirmations. */
export class ToolPreconditionError extends Error {}
