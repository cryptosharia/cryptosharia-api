import type { Context } from '#test/helpers/context.type';
import { AuthService } from '#test/helpers/auth.service';
import { AuthSuite } from './auth.suite';
import { TaskSuite } from './tasks.suite';
import { Suite } from '#test/helpers/suite.base';

export class SuitesService {
  private readonly _suites: Suite[];

  constructor(readonly ctx: Context) {
    const auth = new AuthService(ctx);

    this._suites = [new AuthSuite(ctx, auth), new TaskSuite(ctx, auth)];
  }

  get suites() {
    return this._suites;
  }

  register() {
    this._suites.forEach((suite) => suite.register());
  }
}
