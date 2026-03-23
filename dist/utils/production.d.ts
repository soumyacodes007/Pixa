/**
 * Production Hardening — Error Handling, Retry, Rate Limiting, Logging
 * Reqs: 22-23 (errors/logging), 30-31 (retry/timeouts), 40-41 (sanitization/shutdown)
 *
 * This module provides production-grade utilities used across the entire
 * Algopay codebase. Import what you need:
 *
 *   import { AlgopayError, retry, rateLimiter, logger, sanitize, validateEnv } from "./production.js";
 */
export declare class AlgopayError extends Error {
    code: string;
    statusCode: number;
    retryable: boolean;
    constructor(message: string, opts?: {
        code?: string;
        statusCode?: number;
        retryable?: boolean;
    });
}
export declare class AuthError extends AlgopayError {
    constructor(message: string);
}
export declare class GuardrailError extends AlgopayError {
    constructor(message: string);
}
export declare class NetworkError extends AlgopayError {
    constructor(message: string);
}
export declare class TransactionError extends AlgopayError {
    txId?: string;
    constructor(message: string, txId?: string);
}
export declare class ValidationError extends AlgopayError {
    field?: string;
    constructor(message: string, field?: string);
}
export declare class RateLimitError extends AlgopayError {
    retryAfterMs: number;
    constructor(message: string, retryAfterMs: number);
}
export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
    timeoutMs?: number;
    retryOn?: (err: Error) => boolean;
}
export declare function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
export interface RateLimiterConfig {
    maxTokens: number;
    refillRatePerSec: number;
}
export declare class TokenBucketRateLimiter {
    private tokens;
    private maxTokens;
    private refillRatePerSec;
    private lastRefill;
    constructor(config: RateLimiterConfig);
    private refill;
    consume(tokens?: number): boolean;
    consumeOrThrow(tokens?: number): void;
    get remaining(): number;
}
export declare const rateLimiters: {
    api: TokenBucketRateLimiter;
    auth: TokenBucketRateLimiter;
    send: TokenBucketRateLimiter;
};
export type LogLevel = "debug" | "info" | "warn" | "error";
declare class Logger {
    private level;
    private json;
    constructor(level?: LogLevel, json?: boolean);
    setLevel(level: LogLevel): void;
    setJson(json: boolean): void;
    private shouldLog;
    private format;
    debug(msg: string, data?: Record<string, unknown>): void;
    info(msg: string, data?: Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, data?: Record<string, unknown>): void;
}
export declare const logger: Logger;
/**
 * Sanitize and validate common inputs.
 */
export declare const sanitize: {
    /** Validate Algorand address (58 chars, base32) */
    address(input: string): string;
    /** Validate and parse amount (positive number) */
    amount(input: string | number): number;
    /** Validate email */
    email(input: string): string;
    /** Validate network */
    network(input: string): "testnet" | "mainnet";
    /** Validate asset ID (positive integer or 0 for ALGO) */
    assetId(input: string | number): number;
    /** Sanitize URL */
    url(input: string): string;
};
export interface EnvConfig {
    JWT_SECRET: string;
    ALGOPAY_BACKEND_URL: string;
    ALGOPAY_NETWORK: "testnet" | "mainnet";
    ALGOPAY_LOG_LEVEL: LogLevel;
    SENDGRID_API_KEY?: string;
    REDIS_URL?: string;
    INTERMEZZO_URL?: string;
    INTERMEZZO_TOKEN?: string;
}
/**
 * Validate required environment variables.
 * In dev mode, defaults are used for missing optional vars.
 */
export declare function validateEnv(mode?: "development" | "production"): EnvConfig;
type CleanupFn = () => Promise<void> | void;
/**
 * Register a cleanup handler for graceful shutdown.
 */
export declare function onShutdown(fn: CleanupFn): void;
/**
 * Install process signal handlers for graceful shutdown.
 * Call this once at app startup.
 */
export declare function installShutdownHandlers(): void;
export {};
//# sourceMappingURL=production.d.ts.map