/**
 * Auth Client — CLI-side auth functions that call the backend
 * Reqs: 2, 3, 21
 */
export interface LoginResponse {
    flowId: string;
    message: string;
    expiresIn: string;
}
export interface VerifyResponse {
    sessionToken: string;
    walletAddress: string;
    email: string;
    expiresIn: string;
}
export interface SessionResponse {
    email: string;
    walletAddress: string;
    authenticated: boolean;
}
/**
 * Validate email format locally before making network call (Req 2.4)
 */
export declare function isValidEmail(email: string): boolean;
/**
 * POST /auth/login — send OTP to email
 */
export declare function login(email: string): Promise<LoginResponse>;
/**
 * POST /auth/verify — verify OTP and get session token
 */
export declare function verify(flowId: string, otp: string): Promise<VerifyResponse>;
/**
 * POST /auth/logout — invalidate session
 */
export declare function logout(): Promise<void>;
/**
 * GET /auth/session — check if current session is valid
 */
export declare function checkSession(): Promise<SessionResponse | null>;
/**
 * Get stored session token (for use by other commands)
 */
export declare function getSessionToken(): string | null;
/**
 * Get stored wallet address
 */
export declare function getWalletAddress(): string | null;
//# sourceMappingURL=client.d.ts.map