import type { Context } from '#test/helpers/context.type';
import { UsersSuite } from './users.suite';
import { Suite } from '#test/helpers/suite.base';

export class SuitesService {
  private readonly _suites: Suite[];

  constructor(readonly ctx: Context) {
    this._suites = [new UsersSuite(ctx)];
  }

  get suites() {
    return this._suites;
  }

  register() {
    this._suites.forEach((suite) => suite.register());
  }
}
