import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Returns the workspace id that WorkspaceGuard validated and attached to the
 * request. Guaranteed to belong to the current user by the time it is read.
 */
export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.workspaceId;
  },
);
