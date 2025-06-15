const config = require('../config');
const commandManager = require('../utils/commands');
const logger = require('../utils/logger');

class MessageHandler {
    constructor() {
        this.processed = new Set();
    }

    /**
     * Handle incoming WhatsApp messages
     * @param {Object} sock - WhatsApp socket
     * @param {Object} message - Message object
     */
    async handle(sock, message) {
        try {
            // Prevent processing the same message twice
            const messageId = message.key.id;
            if (this.processed.has(messageId)) {
                return;
            }
            this.processed.add(messageId);
            
            // Clean up old processed messages (keep last 1000)
            if (this.processed.size > 1000) {
                const entries = Array.from(this.processed);
                this.processed.clear();
                entries.slice(-500).forEach(id => this.processed.add(id));
            }

            // Check if this message is from a muted user in a group
            if (message.key.remoteJid.endsWith('@g.us')) {
                const roleManager = require('../utils/roles');
                const senderNumber = message.key.participant?.replace('@s.whatsapp.net', '').replace('@c.us', '') || 
                                   message.key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
                
                if (roleManager.isUserMuted(senderNumber, message.key.remoteJid)) {
                    // Delete the message immediately
                    try {
                        await sock.sendMessage(message.key.remoteJid, { delete: message.key });
                        logger.info(`Deleted message from muted user ${senderNumber} in group ${message.key.remoteJid}`);
                    } catch (error) {
                        logger.error('Failed to delete muted user message:', error);
                    }
                    return; // Don't process the message further
                }
            }

            const messageContent = this.extractMessageText(message);
            if (!messageContent) return;

            // Check if message starts with command prefix
            if (!messageContent.startsWith(config.PREFIX)) {
                return;
            }

            // Parse command and arguments
            const args = messageContent.slice(config.PREFIX.length).trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();

            if (!commandName) return;

            // Log command usage
            const sender = message.key.remoteJid;
            const senderNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            logger.info(`Command received: ${commandName} from ${senderNumber}`);

            // Execute command
            await commandManager.execute(sock, message, commandName, args);

        } catch (error) {
            logger.error('Error in message handler:', error);
            
            // Send error message to user
            try {
                await sock.sendMessage(message.key.remoteJid, {
                    text: '❌ *System Error*\n\nAn unexpected error occurred while processing your message. Please try again later.'
                });
            } catch (sendError) {
                logger.error('Failed to send error message:', sendError);
            }
        }
    }

    /**
     * Extract text content from WhatsApp message
     * @param {Object} message - Message object
     * @returns {string|null} - Extracted text or null
     */
    extractMessageText(message) {
        let messageContent = null;

        if (message.message?.conversation) {
            messageContent = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            messageContent = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage?.caption) {
            messageContent = message.message.imageMessage.caption;
        } else if (message.message?.videoMessage?.caption) {
            messageContent = message.message.videoMessage.caption;
        }

        return messageContent ? messageContent.trim() : null;
    }

    /**
     * Check if message is from a group
     * @param {Object} message - Message object
     * @returns {boolean}
     */
    isGroupMessage(message) {
        return message.key.remoteJid.endsWith('@g.us');
    }

    /**
     * Get sender information
     * @param {Object} message - Message object
     * @returns {Object} - Sender information
     */
    getSenderInfo(message) {
        const remoteJid = message.key.remoteJid;
        const participant = message.key.participant || remoteJid;
        
        return {
            jid: remoteJid,
            participant,
            isGroup: this.isGroupMessage(message),
            number: participant.replace('@s.whatsapp.net', '').replace('@c.us', '')
        };
    }
}

module.exports = new MessageHandler();
