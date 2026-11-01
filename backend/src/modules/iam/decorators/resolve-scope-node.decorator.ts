import { SetMetadata } from '@nestjs/common';

export interface ResolveScopeNodeOptions {
  source?: 'params' | 'query' | 'body';
  field?: string;
  defaultToGlobal?: boolean;
}

export const IAM_RESOLVE_SCOPE_NODE_KEY = 'iam_resolve_scope_node';
export const ResolveScopeNode = (options: ResolveScopeNodeOptions = { source: 'params', field: 'nodeId' }) =>
  SetMetadata(IAM_RESOLVE_SCOPE_NODE_KEY, options);
