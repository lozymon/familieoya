import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const HouseholdId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    return ctx.switchToHttp().getRequest().householdId as string;
  },
);
