import type { Context } from '#test/helpers/context.type';
import { UsersSuite } from './users.suite';
import { OpenApiSuite } from './openapi.suite';
import { SystemSuite } from './system.suite';
import { Suite } from '#test/helpers/suite.base';
import { AuthSuite } from './auth.suite';

export class SuitesService {
  private readonly _suites: Suite[];

  constructor(readonly ctx: Context) {
    this._suites = [
      new OpenApiSuite(ctx),
      new SystemSuite(ctx),
      new UsersSuite(ctx),
      new AuthSuite(ctx),
    ];
  }

  get suites() {
    return this._suites;
  }

  register() {
    this._suites.forEach((suite) => suite.register());
  }
}
