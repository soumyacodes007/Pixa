/**
 * MCP Skill Interface — Phase 9
 * Req 48: Expose all Algopay commands as MCP tools for AI agents
 *
 * This module creates an MCP server that exposes Algopay functionality
 * as tools that AI agents can discover and use.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// Import Algopay modules
import * as wallet from "../wallet/queries.js";
import { sendPayment } from "../wallet/send.js";
import { searchBazaar } from "../x402/bazaar.js";
import { executeBatch } from "../batch/batch.js";
import { addWebhook, listWebhooks, removeWebhook } from "../webhooks/webhooks.js";
// --- MCP Tool Definitions ---
const TOOLS = [
    {
        name: "algopay_status",
        description: "Get wallet status and network information",
        inputSchema: {
            type: "object",
            properties: {
                address: {
                    type: "string",
                    description: "Algorand wallet address",
                },
                network: {
                    type: "string",
                    enum: ["testnet", "mainnet"],
                    default: "testnet",
                    description: "Algorand network",
                },
            },
            required: ["address"],
        },
    },
    {
        name: "algopay_balance",
        description: "Get wallet balance for ALGO and all assets",
        inputSchema: {
            type: "object",
            properties: {
                address: {
                    type: "string",
                    description: "Algorand wallet address",
                },
                network: {
                    type: "string",
                    enum: ["testnet", "mainnet"],
                    default: "testnet",
                    description: "Algorand network",
                },
            },
            required: ["address"],
        },
    },
    {
        name: "algopay_history",
        description: "Get transaction history for a wallet",
        inputSchema: {
            type: "object",
            properties: {
                address: {
                    type: "string",
                    description: "Algorand wallet address",
                },
                network: {
                    type: "string",
                    enum: ["testnet", "mainnet"],
                    default: "testnet",
                    description: "Algorand network",
                },
                limit: {
                    type: "number",
                    default: 10,
                    description: "Maximum number of transactions to return",
                },
            },
            required: ["address"],
        },
    },
    {
        name: "algopay_send",
        description: "Send ALGO or ASA to another wallet (requires authentication)",
        inputSchema: {
            type: "object",
            properties: {
                senderAddress: {
                    type: "string",
                    description: "Sender's Algorand wallet address",
                },
                recipientAddress: {
                    type: "string",
                    description: "Recipient's Algorand wallet address or NFD name",
                },
                amount: {
                    type: "number",
                    description: "Amount to send",
                },
                asset: {
                    type: "string",
                    default: "ALGO",
                    description: "Asset to send (ALGO, USDC, or asset ID)",
                },
                network: {
                    type: "string",
                    enum: ["testnet", "mainnet"],
                    default: "testnet",
                    description: "Algorand network",
                },
                sessionToken: {
                    type: "string",
                    description: "Authentication session token",
                },
                dryRun: {
                    type: "boolean",
                    default: false,
                    description: "Simulate transaction without broadcasting",
                },
            },
            required: ["senderAddress", "recipientAddress", "amount", "sessionToken"],
        },
    },
    {
        name: "algopay_x402_search",
        description: "Search for x402 paywall services in the Bazaar",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query for services",
                },
                network: {
                    type: "string",
                    enum: ["testnet", "mainnet"],
                    default: "mainnet",
                    description: "Algorand network",
                },
                category: {
                    type: "string",
                    description: "Filter by service category",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "algopay_batch",
        description: "Execute multiple transactions atomically",
        inputSchema: {
            type: "object",
            properties: {
                transactions: {
                    type: "array",
                    description: "Array of transactions to execute",
                    items: {
                        type: "object",
                        properties: {
                            type: {
                                type: "string",
                                enum: ["send", "trade", "opt-in"],
                            },
                            amount: { type: "number" },
                            recipient: { type: "string" },
                            asset: { type: "string" },
                            from: { type: "string" },
                            to: { type: "string" },
                            assetId: { type: "number" },
                        },
                    },
                },
                senderAddress: {
                    type: "string",
                    description: "Sender's wallet address",
                },
                sessionToken: {
                    type: "string",
                    description: "Authentication session token",
                },
                network: {
                    type: "string",
                    enum: ["testnet", "mainnet"],
                    default: "testnet",
                },
                dryRun: {
                    type: "boolean",
                    default: false,
                },
            },
            required: ["transactions", "senderAddress", "sessionToken"],
        },
    },
    {
        name: "algopay_webhook_add",
        description: "Add a webhook for transaction notifications",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "Webhook URL to receive notifications",
                },
                events: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: [
                            "transaction.sent",
                            "transaction.received",
                            "transaction.confirmed",
                            "balance.updated",
                            "limit.exceeded",
                            "payment.received",
                        ],
                    },
                    default: ["transaction.sent", "transaction.received"],
                    description: "Events to subscribe to",
                },
                secret: {
                    type: "string",
                    description: "Optional secret for webhook signature verification",
                },
            },
            required: ["url"],
        },
    },
    {
        name: "algopay_webhook_list",
        description: "List all configured webhooks",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "algopay_webhook_remove",
        description: "Remove a webhook by ID",
        inputSchema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Webhook ID to remove",
                },
            },
            required: ["id"],
        },
    },
];
// --- MCP Server Implementation ---
export class AlgopayMCPServer {
    server;
    constructor() {
        this.server = new Server({
            name: "algopay-mcp-server",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: TOOLS,
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case "algopay_status":
                        if (!args || typeof args !== 'object') {
                            throw new Error('Invalid arguments for algopay_status');
                        }
                        const statusArgs = args;
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(await wallet.getStatus(statusArgs.address, (statusArgs.network || "testnet")), null, 2),
                                },
                            ],
                        };
                    case "algopay_balance":
                        if (!args || typeof args !== 'object') {
                            throw new Error('Invalid arguments for algopay_balance');
                        }
                        const balanceArgs = args;
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(await wallet.getBalance(balanceArgs.address, (balanceArgs.network || "testnet")), null, 2),
                                },
                            ],
                        };
                    case "algopay_history":
                        if (!args || typeof args !== 'object') {
                            throw new Error('Invalid arguments for algopay_history');
                        }
                        const historyArgs = args;
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(await wallet.getHistory(historyArgs.address, (historyArgs.network || "testnet"), { limit: historyArgs.limit || 10 }), null, 2),
                                },
                            ],
                        };
                    case "algopay_send":
                        if (!args || typeof args !== 'object') {
                            throw new Error('Invalid arguments for algopay_send');
                        }
                        const sendArgs = args;
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(await sendPayment({
                                        senderAddress: sendArgs.senderAddress,
                                        recipientAddress: sendArgs.recipientAddress,
                                        amount: sendArgs.amount,
                                        asset: (sendArgs.asset || "ALGO"),
                                        network: (sendArgs.network || "testnet"),
                                        sessionToken: sendArgs.sessionToken,
                                        dryRun: sendArgs.dryRun || false,
                                    }), null, 2),
                                },
                            ],
                        };
                    case "algopay_x402_search":
                        if (!args || typeof args !== 'object') {
                            throw new Error('Invalid arguments for algopay_x402_search');
                        }
                        const searchArgs = args;
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(await searchBazaar(searchArgs.query, {
                                        network: (searchArgs.network || "mainnet"),
                                        category: searchArgs.category,
                                    }), null, 2),
                                },
                            ],
                        };
                    case "algopay_batch":
                        if (!args || typeof args !== 'object') {
                            throw new Error('Invalid arguments for algopay_batch');
                        }
                        const batchArgs = args;
                        // Create temporary batch file content
                        const batchContent = {
                            transactions: batchArgs.transactions,
                            network: batchArgs.network || "testnet",
                            dryRun: batchArgs.dryRun || false,
                        };
                        // Write to temporary file and execute
                        const fs = await import("fs/promises");
                        const path = await import("path");
                        const os = await import("os");
                        const tempFile = path.join(os.tmpdir(), `algopay-batch-${Date.now()}.json`);
                        await fs.writeFile(tempFile, JSON.stringify(batchContent, null, 2));
                        try {
                            const result = await executeBatch(tempFile, batchArgs.senderAddress, batchArgs.sessionToken, {
                                network: (batchArgs.network || "testnet"),
                                dryRun: batchArgs.dryRun || false,
                            });
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: JSON.stringify(result, null, 2),
                                    },
                                ],
                            };
                        }
                        finally {
                            // Clean up temp file
                            try {
                                await fs.unlink(tempFile);
                            }
                            catch {
                                // Ignore cleanup errors
                            }
                        }
                    case "algopay_webhook_add":
                        if (!args || typeof args !== 'object') {
                            throw new Error('Invalid arguments for algopay_webhook_add');
                        }
                        const webhookAddArgs = args;
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(addWebhook(webhookAddArgs.url, webhookAddArgs.events, webhookAddArgs.secret), null, 2),
                                },
                            ],
                        };
                    case "algopay_webhook_list":
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(listWebhooks(), null, 2),
                                },
                            ],
                        };
                    case "algopay_webhook_remove":
                        if (!args || typeof args !== 'object') {
                            throw new Error('Invalid arguments for algopay_webhook_remove');
                        }
                        const webhookRemoveArgs = args;
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({ removed: removeWebhook(webhookRemoveArgs.id) }, null, 2),
                                },
                            ],
                        };
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: error.message,
                                tool: name,
                                arguments: args,
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Algopay MCP Server started");
    }
}
// --- CLI Entry Point ---
if (process.argv[1] && process.argv[1].endsWith('skills.ts')) {
    const server = new AlgopayMCPServer();
    server.start().catch((error) => {
        console.error("Failed to start MCP server:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=skills.js.map