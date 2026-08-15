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
    "/auth/signup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sign up
         * @description Creates an unverified user account and sends a verification email to the supplied redirect URL.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
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
                        /**
                         * @description Password with at least 12 characters.
                         * @example secure-password
                         */
                        password: string;
                        /**
                         * @description Client-provided URL containing exactly one {token} placeholder.
                         * @example https://app.cryptosharia.id/verify/{token}
                         */
                        redirectUrl: string;
                    };
                };
            };
            responses: {
                /** @description User registered & verification email sent */
                201: {
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
                /** @description Email already registered */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            message: "Email already registered";
                            /** @enum {string} */
                            error: "EMAIL_ALREADY_REGISTERED";
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Verify email
         * @description Consumes a one-time verification token and marks the associated email address as verified.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * @description Opaque single-use or session token.
                         * @example opaque-token
                         */
                        token: string;
                    };
                };
            };
            responses: {
                /** @description Email verified */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
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
                /** @description Invalid or expired verification token */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            message: "Invalid or expired verification token";
                            /** @enum {string} */
                            error: "VERIFICATION_TOKEN_INVALID";
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/signin": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sign in
         * @description Authenticates an active verified user account and issues an access and refresh token pair.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * Format: email
                         * @description Email address used for signin
                         * @example john@example.com
                         */
                        email: string;
                        /**
                         * @description Password with at least 12 characters.
                         * @example secure-password
                         */
                        password: string;
                    };
                };
            };
            responses: {
                /** @description Signed in */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Short-lived JWT access token.
                             * @example eyJhbGciOiJIUzI1NiIs...
                             */
                            accessToken: string;
                            /**
                             * @description Opaque refresh token used to rotate the session.
                             * @example opaque-refresh-token
                             */
                            refreshToken: string;
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
                /** @description Invalid email or password */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            message: "Invalid email or password";
                            /** @enum {string} */
                            error: "INVALID_CREDENTIALS";
                        };
                    };
                };
                /** @description Your account is not active. Please contact support. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            message: "Your account is not active. Please contact support.";
                            /** @enum {string} */
                            error: "USER_INACTIVE";
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Refresh tokens
         * @description Atomically revokes the submitted refresh token and issues a replacement access and refresh token pair.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * @description Opaque single-use or session token.
                         * @example opaque-token
                         */
                        refreshToken: string;
                    };
                };
            };
            responses: {
                /** @description Tokens refreshed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /**
                             * @description Short-lived JWT access token.
                             * @example eyJhbGciOiJIUzI1NiIs...
                             */
                            accessToken: string;
                            /**
                             * @description Opaque refresh token used to rotate the session.
                             * @example opaque-refresh-token
                             */
                            refreshToken: string;
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
                /** @description Invalid or expired refresh token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            message: "Invalid or expired refresh token";
                            /** @enum {string} */
                            error: "REFRESH_TOKEN_INVALID";
                        };
                    };
                };
                /** @description Your account is not active. Please contact support. */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            message: "Your account is not active. Please contact support.";
                            /** @enum {string} */
                            error: "USER_INACTIVE";
                        };
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/signout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sign out
         * @description Revokes the submitted refresh token. Repeating the request remains successful.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * @description Opaque single-use or session token.
                         * @example opaque-token
                         */
                        refreshToken: string;
                    };
                };
            };
            responses: {
                /** @description Signed out */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
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
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get current user
         * @description Returns the safe profile for the bearer-authenticated user.
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
                /** @description Current user */
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
    "/auth/password/forgot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Request password reset
         * @description Sends a password reset email when the account exists while always returning the same response.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * Format: email
                         * @description Email address used for signin
                         * @example john@example.com
                         */
                        email: string;
                        /**
                         * @description Client-provided URL containing exactly one {token} placeholder.
                         * @example https://app.cryptosharia.id/verify/{token}
                         */
                        redirectUrl: string;
                    };
                };
            };
            responses: {
                /** @description Password reset request processed */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
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
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/password/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reset password
         * @description Consumes a one-time password reset token, updates the password, and revokes active refresh sessions.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /**
                         * @description Opaque single-use or session token.
                         * @example opaque-token
                         */
                        token: string;
                        /**
                         * @description Password with at least 12 characters.
                         * @example secure-password
                         */
                        password: string;
                    };
                };
            };
            responses: {
                /** @description Password reset */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
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
                /** @description Invalid or expired password reset token */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** @enum {string} */
                            message: "Invalid or expired password reset token";
                            /** @enum {string} */
                            error: "PASSWORD_RESET_TOKEN_INVALID";
                        };
                    };
                };
            };
        };
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
                        /** @description Total matching users (before pagination) */
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
