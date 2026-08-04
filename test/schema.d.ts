export interface paths {
  '/users': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List users
     * @description Retrieve all registered users.
     */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': {
              /** Format: uuid */
              id: string;
              /**
               * @description Display name
               * @example John Doe
               */
              name: string;
              /**
               * Format: email
               * @description Email address used for signin
               * @example john@example.com
               */
              email: string;
              /** Format: date-time */
              createdAt: string;
              /** Format: date-time */
              updatedAt: string;
            }[];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/users/{id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get user by ID
     * @description Retrieve a single registered user.
     */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OK */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': {
              /** Format: uuid */
              id: string;
              /**
               * @description Display name
               * @example John Doe
               */
              name: string;
              /**
               * Format: email
               * @description Email address used for signin
               * @example john@example.com
               */
              email: string;
              /** Format: date-time */
              createdAt: string;
              /** Format: date-time */
              updatedAt: string;
            };
          };
        };
        /** @description Not Found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            'application/json': {
              statusCode: number;
              message: string;
              error: string;
            };
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: never;
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
