/**
 * Webhook Notifications — Phase 9
 * Req 39: HTTP callbacks for transaction events
 *
 * Usage:
 *   algopay webhook add https://api.example.com/algopay-webhook
 *   algopay webhook list
 *   algopay webhook remove <id>
 */
import { randomUUID } from "crypto";
import { logger } from "../utils/production.js";
// --- Storage (in-memory for now, should be persistent in production) ---
const webhooks = new Map();
// --- Webhook Management ---
export function addWebhook(url, events = ["transaction.sent", "transaction.received"], secret) {
    // Validate URL
    try {
        new URL(url);
    }
    catch {
        throw new Error(`Invalid webhook URL: ${url}`);
    }
    const webhook = {
        id: randomUUID(),
        url,
        events,
        secret,
        active: true,
        createdAt: Date.now(),
        failureCount: 0,
    };
    webhooks.set(webhook.id, webhook);
    logger.info(`Webhook added: ${webhook.id}`, { url, events });
    return webhook;
}
export function listWebhooks() {
    return Array.from(webhooks.values());
}
export function getWebhook(id) {
    return webhooks.get(id) || null;
}
export function removeWebhook(id) {
    const existed = webhooks.has(id);
    webhooks.delete(id);
    if (existed) {
        logger.info(`Webhook removed: ${id}`);
    }
    return existed;
}
export function updateWebhook(id, updates) {
    const webhook = webhooks.get(id);
    if (!webhook)
        return null;
    Object.assign(webhook, updates);
    webhooks.set(id, webhook);
    logger.info(`Webhook updated: ${id}`, updates);
    return webhook;
}
// --- Webhook Triggering ---
export async function triggerWebhooks(event, data) {
    const relevantWebhooks = Array.from(webhooks.values()).filter(webhook => webhook.active && webhook.events.includes(event));
    if (relevantWebhooks.length === 0) {
        return;
    }
    logger.info(`Triggering ${relevantWebhooks.length} webhooks for event: ${event}`);
    // Trigger webhooks in parallel
    const promises = relevantWebhooks.map(webhook => triggerWebhook(webhook, event, data));
    await Promise.allSettled(promises);
}
async function triggerWebhook(webhook, event, data, attempt = 1) {
    const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
        webhook: {
            id: webhook.id,
            attempt,
        },
    };
    const headers = {
        "Content-Type": "application/json",
        "User-Agent": "Algopay-Webhook/1.0",
        "X-Algopay-Event": event,
        "X-Algopay-Webhook-Id": webhook.id,
        "X-Algopay-Delivery": randomUUID(),
    };
    // Add signature if secret is configured
    if (webhook.secret) {
        const crypto = await import("crypto");
        const signature = crypto
            .createHmac("sha256", webhook.secret)
            .update(JSON.stringify(payload))
            .digest("hex");
        headers["X-Algopay-Signature"] = `sha256=${signature}`;
    }
    try {
        const response = await fetch(webhook.url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        if (response.ok) {
            // Success
            webhook.lastTriggered = Date.now();
            webhook.failureCount = 0;
            logger.info(`Webhook delivered successfully`, {
                webhookId: webhook.id,
                event,
                url: webhook.url,
                status: response.status,
                attempt,
            });
        }
        else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }
    catch (error) {
        webhook.failureCount++;
        logger.warn(`Webhook delivery failed`, {
            webhookId: webhook.id,
            event,
            url: webhook.url,
            error: error.message,
            attempt,
            failureCount: webhook.failureCount,
        });
        // Retry logic: exponential backoff, max 3 attempts
        if (attempt < 3) {
            const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            setTimeout(() => {
                triggerWebhook(webhook, event, data, attempt + 1);
            }, delayMs);
        }
        else {
            // Max retries reached, disable webhook if too many failures
            if (webhook.failureCount >= 10) {
                webhook.active = false;
                logger.error(`Webhook disabled due to repeated failures`, {
                    webhookId: webhook.id,
                    url: webhook.url,
                    failureCount: webhook.failureCount,
                });
            }
        }
    }
}
// --- Event Helpers ---
export function notifyTransactionSent(txId, amount, asset, receiver, network) {
    triggerWebhooks("transaction.sent", {
        txId,
        amount,
        asset,
        receiver,
        network,
    });
}
export function notifyTransactionReceived(txId, amount, asset, sender, network) {
    triggerWebhooks("transaction.received", {
        txId,
        amount,
        asset,
        sender,
        network,
    });
}
export function notifyTransactionConfirmed(txId, confirmedRound, network) {
    triggerWebhooks("transaction.confirmed", {
        txId,
        confirmedRound,
        network,
    });
}
export function notifyBalanceUpdated(balance, network) {
    triggerWebhooks("balance.updated", {
        balance,
        network,
    });
}
export function notifyLimitExceeded(asset, amount, used) {
    triggerWebhooks("limit.exceeded", {
        limit: { asset, amount, used },
    });
}
export function notifyPaymentReceived(txId, amount, asset, sender, network) {
    triggerWebhooks("payment.received", {
        txId,
        amount,
        asset,
        sender,
        network,
    });
}
//# sourceMappingURL=webhooks.js.map