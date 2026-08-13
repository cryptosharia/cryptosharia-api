export interface paths {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health check
         * @description Returns the API health status.
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
                /** @description API is available */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            status: "UP";
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
    "/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List users
         * @description List users with search, role/status filters, and pagination.
         */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                    search?: string;
                    roles?: ("super_admin" | "admin" | "posts_manager" | "tokens_manager" | "member")[];
                    statuses?: ("active" | "inactive" | "suspended" | "banned")[];
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Users listed */
                200: {
                    headers: {
                        /** @description Total matching users */
                        "total-items": string;
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
                            /** Format: uuid */
                            avatarId: string | null;
                            /**
                             * @description Role assigned to the user
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
                /** @description Validation failed */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "VALIDATION_FAILED";
                            /**
                             * @description Fields validation errors
                             * @example {
                             *       "<field1>": [
                             *         "<error1>",
                             *         "<error2>"
                             *       ],
                             *       "<field2>": [
                             *         "<error1>",
                             *         "<error2>"
                             *       ]
                             *     }
                             */
                            message: {
                                [key: string]: string[];
                            };
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "UNAUTHORIZED";
                            /** @enum {string} */
                            message: "Unauthorized";
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "FORBIDDEN";
                            /** @enum {string} */
                            message: "Forbidden";
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
    "/users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a user
         * @description Retrieve a user profile by UUID.
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
                            /** Format: uuid */
                            avatarId: string | null;
                            /**
                             * @description Role assigned to the user
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
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "UNAUTHORIZED";
                            /** @enum {string} */
                            message: "Unauthorized";
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "FORBIDDEN";
                            /** @enum {string} */
                            message: "Forbidden";
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
        /**
         * Update a user profile
         * @description Update the display name and/or avatar reference.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * @description User display name
                         * @example John Doe
                         */
                        name?: string;
                        /** Format: uuid */
                        avatarId?: string | null;
                    };
                };
            };
            responses: {
                /** @description Profile updated */
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
                            /** Format: uuid */
                            avatarId: string | null;
                            /**
                             * @description Role assigned to the user
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
                /** @description Validation failed */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "VALIDATION_FAILED";
                            /**
                             * @description Fields validation errors
                             * @example {
                             *       "<field1>": [
                             *         "<error1>",
                             *         "<error2>"
                             *       ],
                             *       "<field2>": [
                             *         "<error1>",
                             *         "<error2>"
                             *       ]
                             *     }
                             */
                            message: {
                                [key: string]: string[];
                            };
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "UNAUTHORIZED";
                            /** @enum {string} */
                            message: "Unauthorized";
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "FORBIDDEN";
                            /** @enum {string} */
                            message: "Forbidden";
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
        trace?: never;
    };
    "/users/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Update user status
         * @description Change a user account status.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * @description Administrative account status
                         * @example active
                         * @enum {string}
                         */
                        status: "active" | "inactive" | "suspended" | "banned";
                    };
                };
            };
            responses: {
                /** @description Status updated */
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
                            /** Format: uuid */
                            avatarId: string | null;
                            /**
                             * @description Role assigned to the user
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
                /** @description Validation failed */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "VALIDATION_FAILED";
                            /**
                             * @description Fields validation errors
                             * @example {
                             *       "<field1>": [
                             *         "<error1>",
                             *         "<error2>"
                             *       ],
                             *       "<field2>": [
                             *         "<error1>",
                             *         "<error2>"
                             *       ]
                             *     }
                             */
                            message: {
                                [key: string]: string[];
                            };
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "UNAUTHORIZED";
                            /** @enum {string} */
                            message: "Unauthorized";
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "FORBIDDEN";
                            /** @enum {string} */
                            message: "Forbidden";
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
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/users/{id}/role": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Update user role
         * @description Change a user system role.
         */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * @description Role assigned to the user
                         * @example member
                         * @enum {string}
                         */
                        role: "super_admin" | "admin" | "posts_manager" | "tokens_manager" | "member";
                    };
                };
            };
            responses: {
                /** @description Role updated */
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
                            /** Format: uuid */
                            avatarId: string | null;
                            /**
                             * @description Role assigned to the user
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
                /** @description Validation failed */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "VALIDATION_FAILED";
                            /**
                             * @description Fields validation errors
                             * @example {
                             *       "<field1>": [
                             *         "<error1>",
                             *         "<error2>"
                             *       ],
                             *       "<field2>": [
                             *         "<error1>",
                             *         "<error2>"
                             *       ]
                             *     }
                             */
                            message: {
                                [key: string]: string[];
                            };
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "UNAUTHORIZED";
                            /** @enum {string} */
                            message: "Unauthorized";
                        };
                    };
                };
                /** @description Forbidden */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            error: "FORBIDDEN";
                            /** @enum {string} */
                            message: "Forbidden";
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
