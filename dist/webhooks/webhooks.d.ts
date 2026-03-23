/**
 * Webhook Notifications — Phase 9
 * Req 39: HTTP callbacks for transaction events
 *
 * Usage:
 *   algopay webhook add https://api.example.com/algopay-webhook
 *   algopay webhook list
 *   algopay webhook remove <id>
 */
export interface Webhook {
    id: string;
    url: string;
    events: WebhookEvent[];
    secret?: string;
    active: boolean;
    createdAt: number;
    lastTriggered?: number;
    failureCount: number;
}
export type WebhookEvent = "transaction.sent" | "transaction.received" | "transaction.confirmed" | "balance.updated" | "limit.exceeded" | "payment.received";
export interface WebhookPayload {
    event: WebhookEvent;
    timestamp: string;
    data: {
        txId?: string;
        amount?: number;
        asset?: string;
        sender?: string;
        receiver?: string;
        network?: string;
        confirmedRound?: number;
        balance?: {
            algo: number;
            assets: Array<{
                id: number;
                amount: number;
            }>;
        };
        limit?: {
            asset: string;
            amount: number;
            used: number;
        };
    };
    webhook: {
        id: string;
        attempt: number;
    };
}
export declare function addWebhook(url: string, events?: WebhookEvent[], secret?: string): Webhook;
export declare function listWebhooks(): Webhook[];
export declare function getWebhook(id: string): Webhook | null;
export declare function removeWebhook(id: string): boolean;
export declare function updateWebhook(id: string, updates: Partial<Webhook>): Webhook | null;
export declare function triggerWebhooks(event: WebhookEvent, data: WebhookPayload["data"]): Promise<void>;
export declare function notifyTransactionSent(txId: string, amount: number, asset: string, receiver: string, network: string): void;
export declare function notifyTransactionReceived(txId: string, amount: number, asset: string, sender: string, network: string): void;
export declare function notifyTransactionConfirmed(txId: string, confirmedRound: number, network: string): void;
export declare function notifyBalanceUpdated(balance: WebhookPayload["data"]["balance"], network: string): void;
export declare function notifyLimitExceeded(asset: string, amount: number, used: number): void;
export declare function notifyPaymentReceived(txId: string, amount: number, asset: string, sender: string, network: string): void;
//# sourceMappingURL=webhooks.d.ts.map