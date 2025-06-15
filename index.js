const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const config = require('./config');
const messageHandler = require('./handlers/messageHandler');
const logger = require('./utils/logger');
const pluginManager = require('./utils/pluginManager');
const currencyService = require('./services/currencyService');

class WhatsAppBot {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    async start() {
        try {
            logger.info('Starting WhatsApp Bot...');
            
            // Initialize currency service
            await currencyService.initialize();
            
            // Load plugins
            await pluginManager.loadPlugins();
            
            // Start connection
            await this.connect();
            
        } catch (error) {
            logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    async connect() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState('./sessions');
            
            this.sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                logger: logger.child({ class: 'baileys' }),
                browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
                markOnlineOnConnect: true,
                generateHighQualityLinkPreview: true,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                retryRequestDelayMs: 250
            });

            this.sock.ev.on('creds.update', saveCreds);
            this.sock.ev.on('connection.update', this.handleConnectionUpdate.bind(this));
            this.sock.ev.on('messages.upsert', this.handleMessages.bind(this));

            // Handle auto-read and auto-typing
            if (config.AUTO_READ) {
                this.sock.ev.on('messages.upsert', async ({ messages }) => {
                    for (const message of messages) {
                        if (!message.key.fromMe) {
                            await this.sock.readMessages([message.key]);
                        }
                    }
                });
            }

        } catch (error) {
            logger.error('Connection error:', error);
            await this.handleReconnect();
        }
    }

    async handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            logger.info('QR Code received. Please scan with WhatsApp.');
            logger.info('QR Code:', qr);
        }

        if (connection === 'close') {
            this.isConnected = false;
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            
            logger.warn('Connection closed due to:', lastDisconnect?.error, 'Reconnecting:', shouldReconnect);
            
            if (shouldReconnect) {
                await this.handleReconnect();
            } else {
                logger.error('Bot logged out. Please restart and scan QR again.');
                process.exit(1);
            }
        } else if (connection === 'open') {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            logger.info('✅ WhatsApp Bot connected successfully!');
            logger.info(`🤖 Bot Name: ${config.BOT_NAME}`);
            logger.info(`📱 Prefix: ${config.PREFIX}`);
            logger.info(`👑 Owner: ${config.OWNER_NUMBER}`);
        }
    }

    async handleMessages(messageUpdate) {
        try {
            const { messages } = messageUpdate;
            
            for (const message of messages) {
                if (!message.message || message.key.fromMe) continue;
                
                // Handle auto-typing
                if (config.AUTO_TYPING) {
                    await this.sock.sendPresenceUpdate('composing', message.key.remoteJid);
                    setTimeout(async () => {
                        await this.sock.sendPresenceUpdate('paused', message.key.remoteJid);
                    }, 1000);
                }
                
                await messageHandler.handle(this.sock, message);
            }
        } catch (error) {
            logger.error('Error handling messages:', error);
        }
    }

    async handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached. Exiting...');
            process.exit(1);
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    async restart() {
        try {
            logger.info('🔄 Restarting bot...');
            
            if (this.sock) {
                await this.sock.end();
                this.sock = null;
                this.isConnected = false;
            }
            
            // Small delay before reconnecting
            setTimeout(() => {
                this.connect();
            }, 2000);
            
            return true;
        } catch (error) {
            logger.error('Error during restart:', error);
            return false;
        }
    }

    getSocket() {
        return this.sock;
    }

    isReady() {
        return this.isConnected && this.sock;
    }
}

// Create bot instance
const bot = new WhatsAppBot();

// Handle process termination
process.on('SIGINT', async () => {
    logger.info('Bot shutting down...');
    if (bot.sock) {
        await bot.sock.end();
    }
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Start the bot
bot.start();

module.exports = bot;
