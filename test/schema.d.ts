export interface paths {
    "/users": {
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
                /** @description List of users */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** Format: uuid */
                            id: string;
                            /**
                             * @description User display name
                             * @example John Doe
                             */
                            name: string;
                            /**
                             * Format: email
                             * @description Email address used for signin
                             * @example john@example.com
                             */
                            email: string;
                            /** @enum {string} */
                            passwordHashingAlgorithm: "argon2id";
                            /** Format: uuid */
                            avatarId: string | null;
                            /**
                             * @description System role assigned to the user
                             * @example member
                             * @enum {string}
                             */
                            role: "super_admin" | "admin" | "posts_manager" | "tokens_manager" | "member";
                            /**
                             * @description Administrative account status
                             * @example active
                             * @enum {string}
                             */
                            status: "active" | "inactive" | "suspended" | "banned";
                            twoFactorSecret: string | null;
                            /** Format: date-time */
                            lastLoginAt: string | null;
                            isEmailVerified: boolean;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string | null;
                            /** Format: uuid */
                            updatedBy: string | null;
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
    "/users/{id}": {
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
                /** @description User found */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** Format: uuid */
                            id: string;
                            /**
                             * @description User display name
                             * @example John Doe
                             */
                            name: string;
                            /**
                             * Format: email
                             * @description Email address used for signin
                             * @example john@example.com
                             */
                            email: string;
                            /** @enum {string} */
                            passwordHashingAlgorithm: "argon2id";
                            /** Format: uuid */
                            avatarId: string | null;
                            /**
                             * @description System role assigned to the user
                             * @example member
                             * @enum {string}
                             */
                            role: "super_admin" | "admin" | "posts_manager" | "tokens_manager" | "member";
                            /**
                             * @description Administrative account status
                             * @example active
                             * @enum {string}
                             */
                            status: "active" | "inactive" | "suspended" | "banned";
                            twoFactorSecret: string | null;
                            /** Format: date-time */
                            lastLoginAt: string | null;
                            isEmailVerified: boolean;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            updatedAt: string | null;
                            /** Format: uuid */
                            updatedBy: string | null;
                        };
                    };
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            message: "User not found";
                            /** @enum {string} */
                            error: "USER_NOT_FOUND";
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
