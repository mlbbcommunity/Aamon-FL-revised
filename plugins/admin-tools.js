const config = require('../config');
const roleManager = require('../utils/roles');
const pluginManager = require('../utils/pluginManager');

module.exports = {
    name: 'Admin Tools',
    version: '2.0.0',
    description: 'Enhanced administrative commands for bot management',
    author: 'Bot Developer',

    async init(commandManager) {
        this.registerCommands(commandManager);
        
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            author: this.author,
            commands: ['addadmin', 'setsudo', 'broadcast', 'info', 'eval', 'plugins', 'reloadplugin', 'loadplugins']
        };
    },

    registerCommands(commandManager) {
        // Enhanced Add Admin command
        commandManager.register('addadmin', {
            description: 'Add a user as admin (mention or reply)',
            usage: `${config.PREFIX}addadmin @user`,
            role: 'owner',
            category: 'owner',
            handler: async (sock, message, args) => {
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                
                let targetNumber;
                
                if (quotedMessage) {
                    targetNumber = message.message.extendedTextMessage.contextInfo.participant || message.message.extendedTextMessage.contextInfo.remoteJid;
                } else if (mentionedJid) {
                    targetNumber = mentionedJid;
                } else if (args.length > 0) {
                    targetNumber = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                }
                
                if (!targetNumber) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Invalid Usage*\n\n` +
                            `Please mention a user or reply to their message to add as admin.\n\n` +
                            `**Usage:** \`${config.PREFIX}addadmin @user\``
                    });
                    return;
                }
                
                if (roleManager.addAdmin(targetNumber, message.key.remoteJid)) {
                    const targetDisplay = targetNumber.replace('@s.whatsapp.net', '');
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `✅ *Admin Added Successfully*\n\n` +
                            `👤 **User:** +${targetDisplay}\n` +
                            `⭐ **Role:** Admin\n` +
                            `📅 **Added:** ${new Date().toLocaleString()}\n\n` +
                            `🎉 User now has admin privileges!`
                    });
                } else {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Operation Failed*\n\n` +
                            `User is already an admin or an error occurred.`
                    });
                }
            }
        });

        // New Set Sudo command
        commandManager.register('setsudo', {
            description: 'Grant temporary sudo privileges to a user',
            usage: `${config.PREFIX}setsudo @user [duration_in_minutes]`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                
                let targetNumber;
                let duration = 60; // Default 1 hour
                
                if (quotedMessage) {
                    targetNumber = message.message.extendedTextMessage.contextInfo.participant || message.message.extendedTextMessage.contextInfo.remoteJid;
                    duration = parseInt(args[0]) || 60;
                } else if (mentionedJid) {
                    targetNumber = mentionedJid;
                    duration = parseInt(args[1]) || 60;
                } else if (args.length > 0) {
                    targetNumber = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                    duration = parseInt(args[1]) || 60;
                }
                
                if (!targetNumber) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Invalid Usage*\n\n` +
                            `Please mention a user or reply to their message.\n\n` +
                            `**Usage:** \`${config.PREFIX}setsudo @user [duration]\`\n` +
                            `**Default duration:** 60 minutes`
                    });
                    return;
                }

                // Validate duration
                if (duration < 5 || duration > 1440) { // 5 minutes to 24 hours
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Invalid Duration*\n\n` +
                            `Duration must be between 5 and 1440 minutes (24 hours).`
                    });
                    return;
                }
                
                if (roleManager.grantSudo(targetNumber, message.key.remoteJid, duration)) {
                    const targetDisplay = targetNumber.replace('@s.whatsapp.net', '');
                    const hours = Math.floor(duration / 60);
                    const minutes = duration % 60;
                    const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                    
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `✅ *Sudo Privileges Granted*\n\n` +
                            `👤 **User:** +${targetDisplay}\n` +
                            `🔧 **Role:** Sudo\n` +
                            `⏰ **Duration:** ${durationText}\n` +
                            `📅 **Granted:** ${new Date().toLocaleString()}\n\n` +
                            `⚡ User now has temporary admin access!`
                    });
                } else {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Operation Failed*\n\n` +
                            `Could not grant sudo privileges. User may already have admin access.`
                    });
                }
            }
        });

        // Enhanced Broadcast command
        commandManager.register('broadcast', {
            description: 'Send a message to all recent contacts',
            usage: `${config.PREFIX}broadcast <message>`,
            role: 'owner',
            category: 'owner',
            handler: async (sock, message, args) => {
                if (args.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `📢 *Broadcast Usage*\n\n` +
                            `Usage: \`${config.PREFIX}broadcast <message>\`\n\n` +
                            `**Example:** \`${config.PREFIX}broadcast Server maintenance at 2 PM\`\n\n` +
                            `⚠️ This will send the message to all recent contacts.`
                    });
                    return;
                }

                const broadcastMessage = args.join(' ');
                
                try {
                    // Send initial confirmation
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `📢 *Broadcasting Message...*\n\n` +
                            `📝 **Message:** ${broadcastMessage}\n` +
                            `⏳ **Status:** Sending to all contacts...`
                    });

                    // Get recent chats (simplified approach)
                    const chats = Object.keys(sock.store?.chats || {});
                    let sentCount = 0;
                    let failedCount = 0;

                    const broadcastText = `📢 *BROADCAST MESSAGE*\n\n${broadcastMessage}\n\n` +
                        `──────────────────\n` +
                        `🤖 Sent by ${config.BOT_NAME}`;

                    for (const chatId of chats.slice(0, 50)) { // Limit to 50 chats
                        try {
                            await sock.sendMessage(chatId, { text: broadcastText });
                            sentCount++;
                            
                            // Add small delay to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } catch (error) {
                            failedCount++;
                        }
                    }

                    // Send final report
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `📊 *Broadcast Complete*\n\n` +
                            `✅ **Sent:** ${sentCount} messages\n` +
                            `❌ **Failed:** ${failedCount} messages\n` +
                            `📅 **Completed:** ${new Date().toLocaleString()}`
                    });

                } catch (error) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Broadcast Failed*\n\n` +
                            `An error occurred while broadcasting the message.`
                    });
                }
            }
        });

        // Enhanced Info command
        commandManager.register('info', {
            description: 'Get detailed system information and statistics',
            usage: `${config.PREFIX}info`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                const uptime = process.uptime();
                const memUsage = process.memoryUsage();
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const seconds = Math.floor(uptime % 60);
                
                const loadedPlugins = pluginManager.getLoadedPlugins();
                const sudoUsers = roleManager.getAllSudoUsers();
                
                let infoText = `ℹ️ *System Information*\n\n`;
                infoText += `🤖 **Bot Details:**\n`;
                infoText += `├ Name: ${config.BOT_NAME}\n`;
                infoText += `├ Prefix: ${config.PREFIX}\n`;
                infoText += `├ Environment: ${config.NODE_ENV}\n`;
                infoText += `└ Node.js: ${process.version}\n\n`;
                
                infoText += `⏱️ **Performance:**\n`;
                infoText += `├ Uptime: ${hours}h ${minutes}m ${seconds}s\n`;
                infoText += `├ Memory (RSS): ${Math.round(memUsage.rss / 1024 / 1024)} MB\n`;
                infoText += `├ Memory (Heap): ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB\n`;
                infoText += `└ Platform: ${process.platform}\n\n`;
                
                infoText += `🔧 **Bot Statistics:**\n`;
                infoText += `├ Commands: ${commandManager.commands.size}\n`;
                infoText += `├ Plugins: ${loadedPlugins.length}\n`;
                infoText += `├ Admins: ${config.ADMIN_NUMBERS.length}\n`;
                infoText += `└ Sudo Users: ${sudoUsers.length}\n\n`;
                
                if (sudoUsers.length > 0) {
                    infoText += `🔧 **Active Sudo Users:**\n`;
                    sudoUsers.forEach((user, index) => {
                        const isLast = index === sudoUsers.length - 1;
                        const prefix = isLast ? '└' : '├';
                        infoText += `${prefix} +${user.number} (${user.timeLeft}m left)\n`;
                    });
                    infoText += `\n`;
                }
                
                infoText += `📅 **Generated:** ${new Date().toLocaleString()}`;
                
                await sock.sendMessage(message.key.remoteJid, { text: infoText });
            }
        });

        // Enhanced Eval command (owner only)
        commandManager.register('eval', {
            description: 'Execute JavaScript code (debugging only)',
            usage: `${config.PREFIX}eval <code>`,
            role: 'owner',
            category: 'owner',
            handler: async (sock, message, args) => {
                if (args.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `⚡ *JavaScript Evaluator*\n\n` +
                            `Usage: \`${config.PREFIX}eval <code>\`\n\n` +
                            `**Example:** \`${config.PREFIX}eval 2 + 2\`\n\n` +
                            `⚠️ **Warning:** This executes raw JavaScript code!`
                    });
                    return;
                }

                const code = args.join(' ');
                
                try {
                    const result = eval(code);
                    const resultString = typeof result === 'object' ? 
                        JSON.stringify(result, null, 2) : String(result);
                    
                    const response = `⚡ *Eval Result*\n\n` +
                        `**Code:** \`${code}\`\n` +
                        `**Result:**\n\`\`\`\n${resultString}\n\`\`\`\n` +
                        `**Type:** ${typeof result}`;
                    
                    await sock.sendMessage(message.key.remoteJid, { text: response });
                    
                } catch (error) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Eval Error*\n\n` +
                            `**Code:** \`${code}\`\n` +
                            `**Error:** ${error.message}`
                    });
                }
            }
        });

        // Enhanced Plugin management commands
        commandManager.register('plugins', {
            description: 'List all loaded plugins with details',
            usage: `${config.PREFIX}plugins`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                const plugins = pluginManager.getLoadedPlugins();
                
                if (plugins.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: '📦 *No Plugins Loaded*\n\nNo plugins are currently active.'
                    });
                    return;
                }

                let pluginText = `📦 *Loaded Plugins (${plugins.length})*\n\n`;
                
                plugins.forEach((plugin, index) => {
                    const loadedTime = new Date(plugin.loadedAt).toLocaleString();
                    pluginText += `**${index + 1}. ${plugin.name}**\n`;
                    pluginText += `├ Version: v${plugin.version || '1.0.0'}\n`;
                    pluginText += `├ Author: ${plugin.author || 'Unknown'}\n`;
                    pluginText += `├ Commands: ${plugin.commands?.length || 0}\n`;
                    pluginText += `├ File: ${plugin.fileName}\n`;
                    pluginText += `└ Loaded: ${loadedTime}\n\n`;
                });
                
                pluginText += `🔧 Use \`${config.PREFIX}reloadplugin <filename>\` to reload a specific plugin.`;
                
                await sock.sendMessage(message.key.remoteJid, { text: pluginText });
            }
        });

        commandManager.register('reloadplugin', {
            description: 'Reload a specific plugin by filename',
            usage: `${config.PREFIX}reloadplugin <filename>`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                if (args.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `🔄 *Plugin Reload Usage*\n\n` +
                            `Usage: \`${config.PREFIX}reloadplugin <filename>\`\n\n` +
                            `**Example:** \`${config.PREFIX}reloadplugin admin-tools.js\`\n\n` +
                            `Use \`${config.PREFIX}plugins\` to see available plugins.`
                    });
                    return;
                }

                const fileName = args[0];
                
                try {
                    const success = await pluginManager.reloadPlugin(fileName);
                    
                    if (success) {
                        await sock.sendMessage(message.key.remoteJid, {
                            text: `✅ *Plugin Reloaded*\n\n` +
                                `📦 **Plugin:** ${fileName}\n` +
                                `⏰ **Time:** ${new Date().toLocaleString()}\n\n` +
                                `🎉 Plugin has been successfully reloaded!`
                        });
                    } else {
                        await sock.sendMessage(message.key.remoteJid, {
                            text: `❌ *Plugin Not Found*\n\n` +
                                `Plugin "${fileName}" is not currently loaded.`
                        });
                    }
                } catch (error) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Reload Failed*\n\n` +
                            `Failed to reload plugin: ${error.message}`
                    });
                }
            }
        });

        commandManager.register('loadplugins', {
            description: 'Reload all plugins from the plugins directory',
            usage: `${config.PREFIX}loadplugins`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                try {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `🔄 *Reloading All Plugins...*\n\n⏳ Please wait while I reload all plugins...`
                    });

                    await pluginManager.loadPlugins();
                    const loadedPlugins = pluginManager.getLoadedPlugins();
                    
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `✅ *Plugins Reloaded Successfully*\n\n` +
                            `📦 **Total Plugins:** ${loadedPlugins.length}\n` +
                            `⏰ **Completed:** ${new Date().toLocaleString()}\n\n` +
                            `🎉 All plugins are now up to date!`
                    });
                    
                } catch (error) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Plugin Reload Failed*\n\n` +
                            `An error occurred while reloading plugins: ${error.message}`
                    });
                }
            }
        });

        // Mute command for group management
        commandManager.register('mute', {
            description: 'Mute a user in the current group (deletes their messages)',
            usage: `${config.PREFIX}mute @user`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                // Check if this is a group
                if (!message.key.remoteJid.endsWith('@g.us')) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║         ❌ *GROUP ONLY* ❌            ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  This command can only be used in     ║\n` +
                            `║  groups to manage members.            ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                    return;
                }

                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                
                let targetNumber;
                
                if (quotedMessage) {
                    targetNumber = message.message.extendedTextMessage.contextInfo.participant;
                } else if (mentionedJid) {
                    targetNumber = mentionedJid;
                } else if (args.length > 0) {
                    targetNumber = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                }
                
                if (!targetNumber) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║          ❌ *INVALID USAGE* ❌         ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  Please mention a user or reply to    ║\n` +
                            `║  their message to mute them.          ║\n` +
                            `║                                       ║\n` +
                            `║  Usage: \`.mute @user\`                ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                    return;
                }

                const targetNumberClean = targetNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');
                const requesterNumber = message.key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
                
                if (roleManager.muteUser(targetNumberClean, message.key.remoteJid, requesterNumber)) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║        🔇 *USER MUTED* 🔇             ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  👤 User: +${targetNumberClean.padEnd(22)} ║\n` +
                            `║  🔇 Status: Muted                     ║\n` +
                            `║  📅 Time: ${new Date().toLocaleTimeString().padEnd(20)} ║\n` +
                            `║                                       ║\n` +
                            `║  All messages from this user will     ║\n` +
                            `║  be automatically deleted.            ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                } else {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║        ❌ *MUTE FAILED* ❌            ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  Failed to mute user. They may       ║\n` +
                            `║  already be muted or you lack         ║\n` +
                            `║  sufficient permissions.              ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                }
            }
        });

        // Unmute command
        commandManager.register('unmute', {
            description: 'Unmute a previously muted user',
            usage: `${config.PREFIX}unmute @user`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                // Check if this is a group
                if (!message.key.remoteJid.endsWith('@g.us')) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║         ❌ *GROUP ONLY* ❌            ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  This command can only be used in     ║\n` +
                            `║  groups to manage members.            ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                    return;
                }

                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                
                let targetNumber;
                
                if (quotedMessage) {
                    targetNumber = message.message.extendedTextMessage.contextInfo.participant;
                } else if (mentionedJid) {
                    targetNumber = mentionedJid;
                } else if (args.length > 0) {
                    targetNumber = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                }
                
                if (!targetNumber) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║          ❌ *INVALID USAGE* ❌         ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  Please mention a user or reply to    ║\n` +
                            `║  their message to unmute them.        ║\n` +
                            `║                                       ║\n` +
                            `║  Usage: \`.unmute @user\`              ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                    return;
                }

                const targetNumberClean = targetNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');
                const requesterNumber = message.key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
                
                if (roleManager.unmuteUser(targetNumberClean, message.key.remoteJid, requesterNumber)) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║        🔊 *USER UNMUTED* 🔊           ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  👤 User: +${targetNumberClean.padEnd(22)} ║\n` +
                            `║  🔊 Status: Unmuted                   ║\n` +
                            `║  📅 Time: ${new Date().toLocaleTimeString().padEnd(20)} ║\n` +
                            `║                                       ║\n` +
                            `║  User can now send messages           ║\n` +
                            `║  normally in this group.              ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                } else {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║       ❌ *UNMUTE FAILED* ❌           ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  User was not muted or you lack       ║\n` +
                            `║  sufficient permissions.              ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                }
            }
        });

        // Command role management
        commandManager.register('commandrole', {
            description: 'Set which role can use a specific command (owner only)',
            usage: `${config.PREFIX}commandrole <command> <role>`,
            role: 'owner',
            category: 'owner',
            handler: async (sock, message, args) => {
                if (args.length < 2) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║      ⚙️ *COMMAND ROLE MANAGER* ⚙️      ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  Usage: \`.commandrole <cmd> <role>\`  ║\n` +
                            `║                                       ║\n` +
                            `║  Available Roles:                     ║\n` +
                            `║  👑 owner - Full access               ║\n` +
                            `║  ⚡ admin - Administrative access     ║\n` +
                            `║  👤 citizen - Basic user access      ║\n` +
                            `║                                       ║\n` +
                            `║  Example:                             ║\n` +
                            `║  \`.commandrole balance admin\`        ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                    return;
                }

                const commandName = args[0].toLowerCase();
                const role = args[1].toLowerCase();
                const requesterNumber = message.key.remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');

                if (!['owner', 'admin', 'citizen'].includes(role)) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║        ❌ *INVALID ROLE* ❌           ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  Valid roles: owner, admin, citizen   ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                    return;
                }

                if (roleManager.setCommandRole(commandName, role, requesterNumber)) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║     ✅ *ROLE UPDATED* ✅              ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  🔧 Command: ${commandName.padEnd(22)} ║\n` +
                            `║  🏷️ New Role: ${role.padEnd(20)} ║\n` +
                            `║  📅 Updated: ${new Date().toLocaleTimeString().padEnd(17)} ║\n` +
                            `║                                       ║\n` +
                            `║  Only users with ${role} role or      ║\n` +
                            `║  higher can now use this command.     ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                } else {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `╔═══════════════════════════════════════╗\n` +
                            `║       ❌ *UPDATE FAILED* ❌           ║\n` +
                            `╠═══════════════════════════════════════╣\n` +
                            `║                                       ║\n` +
                            `║  Failed to update command role.       ║\n` +
                            `║  Only the owner can modify roles.     ║\n` +
                            `║                                       ║\n` +
                            `╚═══════════════════════════════════════╝`
                    });
                }
            }
        });
    }
};
