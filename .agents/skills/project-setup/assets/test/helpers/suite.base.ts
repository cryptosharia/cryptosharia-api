import { Context } from './context.type';

export abstract class Suite {
  constructor(protected readonly ctx: Context) {}
  abstract register(): void;
}
