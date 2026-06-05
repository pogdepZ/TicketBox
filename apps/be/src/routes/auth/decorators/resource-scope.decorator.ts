import { SetMetadata } from '@nestjs/common';

export const RESOURCE_SCOPE_KEY = 'resource_scope';

export type ResourceScopeOptions = {
  type: string;
  param?: string;
  bodyField?: string;
};

export const ResourceScope = (options: ResourceScopeOptions) => {
  return SetMetadata(RESOURCE_SCOPE_KEY, options);
};
