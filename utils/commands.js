const config = require('../config');
const roleManager = require('./roles');
const logger = require('./logger');

class CommandManager {
    constructor() {
        this.commands = new Map();
        this.rateLimit = new Map();
        this.registerDefaultCommands();
    }

    /**
     * Register a command
     * @param {string} name - Command name
     * @param {Object} commandConfig - Command configuration
     */
    register(name, commandConfig) {
        this.commands.set(name, {
            name,
            description: commandConfig.description || 'No description',
            usage: commandConfig.usage || `${config.PREFIX}${name}`,
            role: commandConfig.role || 'user',
            handler: commandConfig.handler,
            category: commandConfig.category || 'general'
        });
    }

    /**
     * Check if user is rate limited
     * @param {string} userId - User ID
     * @returns {boolean}
     */
    isRateLimited(userId) {
        const now = Date.now();
        const userLimit = this.rateLimit.get(userId) || { count: 0, resetTime: now + config.RATE_LIMIT_WINDOW };
        
        if (now > userLimit.resetTime) {
            userLimit.count = 1;
            userLimit.resetTime = now + config.RATE_LIMIT_WINDOW;
            this.rateLimit.set(userId, userLimit);
            return false;
        }
        
        if (userLimit.count >= config.RATE_LIMIT_MAX) {
            return true;
        }
        
        userLimit.count++;
        this.rateLimit.set(userId, userLimit);
        return false;
    }

    /**
     * Execute a command
     * @param {Object} sock - WhatsApp socket
     * @param {Object} message - Message object
     * @param {string} commandName - Command name
     * @param {Array} args - Command arguments
     */
    async execute(sock, message, commandName, args) {
        try {
            const command = this.commands.get(commandName);
            if (!command) {
                return;
            }

            const sender = message.key.remoteJid;
            const senderNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            // Check rate limiting (skip for owner and sudo users)
            if (!roleManager.isOwner(sender) && !roleManager.isSudo(sender) && this.isRateLimited(senderNumber)) {
                await sock.sendMessage(sender, {
                    text: '⚠️ *Rate Limited*\n\nYou are sending commands too quickly. Please wait a moment before trying again.'
                });
                return;
            }

            // Check permissions
            if (!roleManager.hasPermission(sender, command.role)) {
                await sock.sendMessage(sender, {
                    text: `❌ *Access Denied*\n\nThis command requires ${command.role} role or higher.\nYour role: ${roleManager.getRoleDisplay(sender)}`
                });
                return;
            }

            // Execute command
            await command.handler(sock, message, args);

            logger.info(`Command executed: ${commandName} by ${senderNumber} (${roleManager.getUserRole(sender)})`);

        } catch (error) {
            logger.error(`Error executing command ${commandName}:`, error);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ *Command Error*\n\nAn error occurred while executing this command. Please try again later.'
            });
        }
    }

    /**
     * Get command list based on user role
     * @param {string} userJid - User JID
     * @returns {Array} - Available commands
     */
    getAvailableCommands(userJid) {
        const availableCommands = [];
        
        for (const [name, command] of this.commands) {
            if (roleManager.hasPermission(userJid, command.role)) {
                availableCommands.push(command);
            }
        }
        
        return availableCommands;
    }

    /**
     * Get uptime string
     * @returns {string}
     */
    getUptime() {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    /**
     * Get command emoji
     * @param {string} commandName
     * @returns {string}
     */
    getCommandEmoji(commandName) {
        const emojiMap = {
            'ping': '🏓',
            'menu': '📋',
            'help': '❓',
            'status': '📊',
            'restart': '🔄',
            'eval': '⚡',
            'balance': '💰',
            'daily': '🎁',
            'slots': '🎰',
            'pay': '💸',
            'rich': '💎',
            'calc': '🧮',
            'qr': '📱',
            'quote': '💭',
            'joke': '😄',
            'time': '🕐'
        };
        return emojiMap[commandName] || '🔧';
    }

    /**
     * Register default bot commands
     */
    registerDefaultCommands() {
        // Ping command
        this.register('ping', {
            description: 'Check if the bot is responsive',
            usage: `${config.PREFIX}ping`,
            role: 'user',
            category: 'general',
            handler: async (sock, message, args) => {
                const start = Date.now();
                const sent = await sock.sendMessage(message.key.remoteJid, {
                    text: '╭─────────────────╮\n│  🏓 Pinging...  │\n╰─────────────────╯'
                });
                
                const latency = Date.now() - start;
                
                const response = `╔═══════════════════════════════════╗\n` +
                    `║         🏓 *PONG RESPONSE* 🏓      ║\n` +
                    `╠═══════════════════════════════════╣\n` +
                    `║                                   ║\n` +
                    `║  ⚡ Latency: ${latency.toString().padStart(3)}ms             ║\n` +
                    `║  🤖 Bot Status: 🟢 Online         ║\n` +
                    `║  ⏰ Uptime: ${this.getUptime().padEnd(12)}      ║\n` +
                    `║  💫 Server: Ready & Responsive    ║\n` +
                    `║                                   ║\n` +
                    `╚═══════════════════════════════════╝\n\n` +
                    `┌─────────────────────────────────┐\n` +
                    `│  ✅ Connection successful! 🎉   │\n` +
                    `└─────────────────────────────────┘`;
                
                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });

        // Menu command
        this.register('menu', {
            description: 'Display available commands',
            usage: `${config.PREFIX}menu`,
            role: 'user',
            category: 'general',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const availableCommands = this.getAvailableCommands(sender);
                
                // Create fancy menu text with elaborate borders
                let menuText = `╔═══════════════════════════════════════╗\n`;
                menuText += `║              🤖 *${config.BOT_NAME}* 🤖              ║\n`;
                menuText += `║         Your Personal Assistant       ║\n`;
                menuText += `╚═══════════════════════════════════════╝\n\n`;
                
                menuText += `╭─────────────────────────────────────╮\n`;
                menuText += `│           👤 *USER PROFILE*         │\n`;
                menuText += `├─────────────────────────────────────┤\n`;
                menuText += `│ 🏷️ Role: ${roleManager.getRoleDisplay(sender)}                   │\n`;
                menuText += `│ ✅ Status: Verified & Active        │\n`;
                menuText += `│ 🕐 Time: ${new Date().toLocaleTimeString()}               │\n`;
                menuText += `╰─────────────────────────────────────╯\n\n`;

                const categories = {};
                availableCommands.forEach(cmd => {
                    if (!categories[cmd.category]) {
                        categories[cmd.category] = [];
                    }
                    categories[cmd.category].push(cmd);
                });

                // Category icons mapping
                const categoryIcons = {
                    'general': '🎯',
                    'currency': '💰',
                    'games': '🎮',
                    'utility': '🛠️',
                    'admin': '⚙️',
                    'owner': '👑'
                };

                for (const [category, commands] of Object.entries(categories)) {
                    const icon = categoryIcons[category] || '📁';
                    menuText += `┌━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┐\n`;
                    menuText += `┃     ${icon} *${category.toUpperCase()} COMMANDS*     ┃\n`;
                    menuText += `└━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┘\n`;
                    
                    commands.forEach((cmd, index) => {
                        const commandEmoji = this.getCommandEmoji(cmd.name);
                        menuText += `│ ${commandEmoji} \`${cmd.usage}\`\n`;
                        menuText += `│ ├─ ${cmd.description}\n`;
                        if (index < commands.length - 1) {
                            menuText += `│\n`;
                        }
                    });
                    menuText += `└─────────────────────────────────────┘\n\n`;
                }

                menuText += `╔═══════════════════════════════════════╗\n`;
                menuText += `║              ℹ️ *BOT INFO*              ║\n`;
                menuText += `╠═══════════════════════════════════════╣\n`;
                menuText += `║ 💡 Prefix: \`${config.PREFIX}\`                         ║\n`;
                menuText += `║ ⚡ Status: 🟢 Online & Ready          ║\n`;
                menuText += `║ 📊 Total Commands: ${availableCommands.length.toString().padStart(2)}              ║\n`;
                menuText += `║ 🌟 Version: Enhanced v2.0            ║\n`;
                menuText += `╚═══════════════════════════════════════╝\n\n`;
                
                menuText += `┌─────────────────────────────────────┐\n`;
                menuText += `│  🎉 *Enjoy using the bot!* 🎉      │\n`;
                menuText += `│     💬 Happy chatting! ✨           │\n`;
                menuText += `└─────────────────────────────────────┘`;

                await sock.sendMessage(sender, { text: menuText });
            }
        });

        // Status command (admin only)
        this.register('status', {
            description: 'Check bot status and statistics',
            usage: `${config.PREFIX}status`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                const uptime = this.getUptime();
                const memUsage = process.memoryUsage();
                
                const statusText = `╔═══════════════════════════════════════╗\n` +
                    `║           📊 *BOT STATUS* 📊           ║\n` +
                    `╠═══════════════════════════════════════╣\n` +
                    `║                                       ║\n` +
                    `║  🤖 Bot Name: ${config.BOT_NAME.padEnd(20)} ║\n` +
                    `║  ⏰ Uptime: ${uptime.padEnd(22)} ║\n` +
                    `║  🔧 Commands: ${this.commands.size.toString().padEnd(20)} ║\n` +
                    `║  👥 Admins: ${config.ADMIN_NUMBERS.length.toString().padEnd(22)} ║\n` +
                    `║  🌐 Environment: ${config.NODE_ENV.padEnd(17)} ║\n` +
                    `║  📱 Node.js: ${process.version.padEnd(19)} ║\n` +
                    `║                                       ║\n` +
                    `╠═══════════════════════════════════════╣\n` +
                    `║          💾 *MEMORY USAGE* 💾          ║\n` +
                    `╠═══════════════════════════════════════╣\n` +
                    `║                                       ║\n` +
                    `║  📈 RSS: ${Math.round(memUsage.rss / 1024 / 1024).toString().padEnd(3)} MB                   ║\n` +
                    `║  🧠 Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024).toString().padEnd(3)} MB            ║\n` +
                    `║  📊 Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024).toString().padEnd(3)} MB           ║\n` +
                    `║                                       ║\n` +
                    `╚═══════════════════════════════════════╝\n\n` +
                    `┌─────────────────────────────────────┐\n` +
                    `│       ✅ All systems operational!    │\n` +
                    `└─────────────────────────────────────┘`;

                await sock.sendMessage(message.key.remoteJid, { text: statusText });
            }
        });

        // Enhanced restart command (admin only)
        this.register('restart', {
            description: 'Restart the bot with proper cleanup',
            usage: `${config.PREFIX}restart`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                try {
                    const restartMessage = `╔═══════════════════════════════════════╗\n` +
                        `║        🔄 *RESTARTING BOT* 🔄         ║\n` +
                        `╠═══════════════════════════════════════╣\n` +
                        `║                                       ║\n` +
                        `║  ⏳ Initiating restart sequence...    ║\n` +
                        `║  🔧 Stopping current processes       ║\n` +
                        `║  💫 Cleaning up resources            ║\n` +
                        `║  🚀 Starting fresh instance          ║\n` +
                        `║                                       ║\n` +
                        `║     Please wait a few moments...     ║\n` +
                        `║                                       ║\n` +
                        `╚═══════════════════════════════════════╝`;

                    await sock.sendMessage(message.key.remoteJid, { text: restartMessage });

                    // Get bot instance and restart
                    const bot = require('../index');
                    const success = await bot.restart();

                    if (success) {
                        // Send confirmation after restart
                        setTimeout(async () => {
                            try {
                                const successMessage = `╔═══════════════════════════════════════╗\n` +
                                    `║      ✅ *RESTART SUCCESSFUL* ✅       ║\n` +
                                    `╠═══════════════════════════════════════╣\n` +
                                    `║                                       ║\n` +
                                    `║  🤖 Bot is back online!               ║\n` +
                                    `║  ⚡ All systems operational           ║\n` +
                                    `║  🎉 Ready to serve commands           ║\n` +
                                    `║                                       ║\n` +
                                    `╚═══════════════════════════════════════╝\n\n` +
                                    `┌─────────────────────────────────────┐\n` +
                                    `│   🌟 Welcome back! Happy chatting!  │\n` +
                                    `└─────────────────────────────────────┘`;
                                
                                await sock.sendMessage(message.key.remoteJid, { text: successMessage });
                            } catch (error) {
                                logger.error('Failed to send restart confirmation:', error);
                            }
                        }, 3000);
                    } else {
                        const errorMessage = `╔═══════════════════════════════════════╗\n` +
                            `║        ❌ *RESTART FAILED* ❌          ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  ⚠️ Error during restart process      ║\n` +
                            `║  📋 Please check system logs          ║\n` +
                            `║  🔧 Contact admin if issue persists   ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`;
                        
                        await sock.sendMessage(message.key.remoteJid, { text: errorMessage });
                    }
                } catch (error) {
                    logger.error('Restart command error:', error);
                    const criticalErrorMessage = `╔═══════════════════════════════════════╗\n` +
                        `║       🚨 *CRITICAL ERROR* 🚨          ║\n` +
                        `╠═══════════════════════════════════════╣\n` +
                        `║                                       ║\n` +
                        `║  ❌ Failed to execute restart         ║\n` +
                        `║  📋 Error logged for investigation    ║\n` +
                        `║  🆘 Manual intervention required      ║\n` +
                        `║                                       ║\n` +
                        `╚═══════════════════════════════════════╝`;
                    
                    await sock.sendMessage(message.key.remoteJid, { text: criticalErrorMessage });
                }
            }
        });
    }
}

module.exports = new CommandManager();
