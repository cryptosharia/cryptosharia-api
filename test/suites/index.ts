import type { Context } from '#test/helpers/context.type';
import { UsersSuite } from './users.suite';
import { OpenApiSuite } from './openapi.suite';
import { SystemSuite } from './system.suite';
import { Suite } from '#test/helpers/suite.base';
import { AuthSuite } from './auth.suite';
import { AssetsSuite } from './assets.suite';
import { TagsSuite } from './tags.suite';
import { PostsSuite } from './posts.suite';
import { TokensSuite } from './tokens.suite';
import { MessagesSuite } from './messages.suite';

export class SuitesService {
  private readonly _suites: Suite[];

  constructor(readonly ctx: Context) {
    this._suites = [
      new SystemSuite(ctx),
      new OpenApiSuite(ctx),
      new AuthSuite(ctx),
      new UsersSuite(ctx),
      new TagsSuite(ctx),
      new PostsSuite(ctx),
      new TokensSuite(ctx),
      new MessagesSuite(ctx),
      new AssetsSuite(ctx),
    ];
  }

  get suites() {
    return this._suites;
  }

  register() {
    this._suites.forEach((suite) => suite.register());
  }
}
