const config = require('../config');
const currencyService = require('../services/currencyService');
const roleManager = require('../utils/roles');

module.exports = {
    name: 'Currency System',
    version: '1.0.0',
    description: 'Complete currency system with slots game and management features',
    author: 'Bot Developer',

    async init(commandManager) {
        this.registerCommands(commandManager);
        
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            author: this.author,
            commands: ['balance', 'daily', 'pay', 'slots', 'rich', 'currency']
        };
    },

    registerCommands(commandManager) {
        // Balance command
        commandManager.register('balance', {
            description: 'Check your current currency balance',
            usage: `${config.PREFIX}balance`,
            role: 'user',
            category: 'currency',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const senderNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
                
                const balance = currencyService.getBalance(senderNumber);
                const canClaim = currencyService.canClaimDailyBonus(senderNumber);
                const nextBonus = currencyService.getTimeUntilNextBonus(senderNumber);
                
                let response = `╔═══════════════════════════════════════╗\n` +
                    `║          💰 *WALLET BALANCE* 💰        ║\n` +
                    `╠═══════════════════════════════════════╣\n` +
                    `║                                       ║\n` +
                    `║     ${currencyService.formatCurrency(balance).padEnd(29)}     ║\n` +
                    `║                                       ║\n`;
                
                if (canClaim) {
                    response += `╠═══════════════════════════════════════╣\n` +
                        `║         🎁 *DAILY BONUS* 🎁           ║\n` +
                        `╠═══════════════════════════════════════╣\n` +
                        `║                                       ║\n` +
                        `║  ✨ Bonus Available: ${config.DAILY_BONUS_AMOUNT} ${config.CURRENCY_NAME}     ║\n` +
                        `║  🎯 Use \`.daily\` to claim it!        ║\n` +
                        `║                                       ║\n`;
                } else {
                    response += `╠═══════════════════════════════════════╣\n` +
                        `║         ⏰ *NEXT BONUS* ⏰             ║\n` +
                        `╠═══════════════════════════════════════╣\n` +
                        `║                                       ║\n` +
                        `║  ⏳ Available in: ${nextBonus.padEnd(15)} ║\n` +
                        `║  💫 Amount: ${config.DAILY_BONUS_AMOUNT} ${config.CURRENCY_NAME}             ║\n` +
                        `║                                       ║\n`;
                }
                
                response += `╚═══════════════════════════════════════╝\n\n` +
                    `┌─────────────────────────────────────┐\n` +
                    `│  🎰 Try your luck: \`.slots <bet>\`   │\n` +
                    `│  💸 Transfer: \`.pay @user <amount>\` │\n` +
                    `└─────────────────────────────────────┘`;
                
                await sock.sendMessage(sender, { text: response });
            }
        });

        // Daily bonus command
        commandManager.register('daily', {
            description: 'Claim your daily currency bonus',
            usage: `${config.PREFIX}daily`,
            role: 'user',
            category: 'currency',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const senderNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
                
                const bonusAmount = await currencyService.claimDailyBonus(senderNumber);
                
                if (bonusAmount === null) {
                    const nextBonus = currencyService.getTimeUntilNextBonus(senderNumber);
                    const response = `╔═══════════════════════════════════════╗\n` +
                        `║        ⏰ *ALREADY CLAIMED* ⏰         ║\n` +
                        `╠═══════════════════════════════════════╣\n` +
                        `║                                       ║\n` +
                        `║  📅 You already claimed your daily    ║\n` +
                        `║     bonus for today!                  ║\n` +
                        `║                                       ║\n` +
                        `║  ⏳ Next bonus: ${nextBonus.padEnd(18)} ║\n` +
                        `║  💰 Amount: ${currencyService.formatCurrency(config.DAILY_BONUS_AMOUNT).padEnd(22)} ║\n` +
                        `║                                       ║\n` +
                        `╚═══════════════════════════════════════╝\n\n` +
                        `┌─────────────────────────────────────┐\n` +
                        `│   ⏰ Check back tomorrow for more!   │\n` +
                        `└─────────────────────────────────────┘`;
                    
                    await sock.sendMessage(sender, { text: response });
                    return;
                }
                
                const newBalance = currencyService.getBalance(senderNumber);
                
                const response = `╔═══════════════════════════════════════╗\n` +
                    `║        🎁 *BONUS CLAIMED!* 🎁         ║\n` +
                    `╠═══════════════════════════════════════╣\n` +
                    `║                                       ║\n` +
                    `║  ✨ Daily bonus received!             ║\n` +
                    `║                                       ║\n` +
                    `║  💰 Bonus: ${currencyService.formatCurrency(bonusAmount).padEnd(23)} ║\n` +
                    `║  💳 New Balance: ${currencyService.formatCurrency(newBalance).padEnd(17)} ║\n` +
                    `║                                       ║\n` +
                    `╚═══════════════════════════════════════╝\n\n` +
                    `┌─────────────────────────────────────┐\n` +
                    `│  🎰 Ready to gamble? Try \`.slots\`!  │\n` +
                    `│  📅 Come back tomorrow for more!     │\n` +
                    `└─────────────────────────────────────┘`;
                
                await sock.sendMessage(sender, { text: response });
            }
        });

        // Pay/Transfer command
        commandManager.register('pay', {
            description: 'Transfer currency to another user',
            usage: `${config.PREFIX}pay @user <amount>`,
            role: 'user',
            category: 'currency',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const senderNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
                
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                
                let targetNumber;
                let amount;
                
                if (quotedMessage) {
                    targetNumber = message.message.extendedTextMessage.contextInfo.participant || message.message.extendedTextMessage.contextInfo.remoteJid;
                    amount = parseInt(args[0]);
                } else if (mentionedJid) {
                    targetNumber = mentionedJid;
                    amount = parseInt(args[1]);
                } else if (args.length >= 2) {
                    targetNumber = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                    amount = parseInt(args[1]);
                }
                
                if (!targetNumber || !amount) {
                    await sock.sendMessage(sender, {
                        text: `💸 *Payment Usage*\n\n` +
                            `Usage: \`${config.PREFIX}pay @user <amount>\`\n\n` +
                            `**Examples:**\n` +
                            `• \`${config.PREFIX}pay @user 100\`\n` +
                            `• Reply to a message: \`${config.PREFIX}pay 50\`\n\n` +
                            `**Note:** Mention a user or reply to their message.`
                    });
                    return;
                }
                
                if (amount <= 0) {
                    await sock.sendMessage(sender, {
                        text: `❌ *Invalid Amount*\n\nAmount must be greater than 0.`
                    });
                    return;
                }
                
                const targetNumberClean = targetNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');
                
                if (senderNumber === targetNumberClean) {
                    await sock.sendMessage(sender, {
                        text: `❌ *Invalid Transfer*\n\nYou cannot transfer currency to yourself!`
                    });
                    return;
                }
                
                const senderBalance = currencyService.getBalance(senderNumber);
                
                if (senderBalance < amount) {
                    await sock.sendMessage(sender, {
                        text: `❌ *Insufficient Funds*\n\n` +
                            `**Your Balance:** ${currencyService.formatCurrency(senderBalance)}\n` +
                            `**Transfer Amount:** ${currencyService.formatCurrency(amount)}\n\n` +
                            `You need ${currencyService.formatCurrency(amount - senderBalance)} more!`
                    });
                    return;
                }
                
                const success = await currencyService.transfer(senderNumber, targetNumberClean, amount);
                
                if (success) {
                    const newSenderBalance = currencyService.getBalance(senderNumber);
                    const newReceiverBalance = currencyService.getBalance(targetNumberClean);
                    
                    const response = `✅ *Transfer Successful*\n\n` +
                        `**Amount:** ${currencyService.formatCurrency(amount)}\n` +
                        `**To:** +${targetNumberClean}\n` +
                        `**Your New Balance:** ${currencyService.formatCurrency(newSenderBalance)}\n\n` +
                        `💫 Transfer completed successfully!`;
                    
                    await sock.sendMessage(sender, { text: response });
                    
                    // Notify recipient if possible
                    try {
                        await sock.sendMessage(targetNumber, {
                            text: `💰 *Payment Received*\n\n` +
                                `**Amount:** ${currencyService.formatCurrency(amount)}\n` +
                                `**From:** +${senderNumber}\n` +
                                `**Your New Balance:** ${currencyService.formatCurrency(newReceiverBalance)}\n\n` +
                                `🎉 Payment received successfully!`
                        });
                    } catch (error) {
                        // Recipient notification failed, but transfer was successful
                    }
                } else {
                    await sock.sendMessage(sender, {
                        text: `❌ *Transfer Failed*\n\nAn error occurred during the transfer. Please try again.`
                    });
                }
            }
        });

        // Slots game command
        commandManager.register('slots', {
            description: 'Play the slots game and win currency!',
            usage: `${config.PREFIX}slots <bet_amount>`,
            role: 'user',
            category: 'games',
            handler: async (sock, message, args) => {
                const sender = message.key.remoteJid;
                const senderNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
                
                if (args.length === 0) {
                    await sock.sendMessage(sender, {
                        text: `🎰 *Slots Game*\n\n` +
                            `Usage: \`${config.PREFIX}slots <bet_amount>\`\n\n` +
                            `**Min Bet:** ${currencyService.formatCurrency(config.SLOTS_MIN_BET)}\n` +
                            `**Max Bet:** ${currencyService.formatCurrency(config.SLOTS_MAX_BET)}\n\n` +
                            `**Payouts:**\n` +
                            `🍒🍒🍒 - 3x bet\n` +
                            `🍋🍋🍋 - 5x bet\n` +
                            `🍊🍊🍊 - 8x bet\n` +
                            `💎💎💎 - 20x bet\n` +
                            `🎯🎯🎯 - 50x bet\n\n` +
                            `**Example:** \`${config.PREFIX}slots 100\``
                    });
                    return;
                }
                
                const betAmount = parseInt(args[0]);
                
                if (isNaN(betAmount) || betAmount <= 0) {
                    await sock.sendMessage(sender, {
                        text: `❌ *Invalid Bet*\n\nPlease enter a valid positive number.`
                    });
                    return;
                }
                
                if (betAmount < config.SLOTS_MIN_BET || betAmount > config.SLOTS_MAX_BET) {
                    await sock.sendMessage(sender, {
                        text: `❌ *Invalid Bet Amount*\n\n` +
                            `**Min Bet:** ${currencyService.formatCurrency(config.SLOTS_MIN_BET)}\n` +
                            `**Max Bet:** ${currencyService.formatCurrency(config.SLOTS_MAX_BET)}`
                    });
                    return;
                }
                
                const balance = currencyService.getBalance(senderNumber);
                
                if (balance < betAmount) {
                    await sock.sendMessage(sender, {
                        text: `❌ *Insufficient Funds*\n\n` +
                            `**Your Balance:** ${currencyService.formatCurrency(balance)}\n` +
                            `**Bet Amount:** ${currencyService.formatCurrency(betAmount)}\n\n` +
                            `You need ${currencyService.formatCurrency(betAmount - balance)} more!`
                    });
                    return;
                }
                
                // Deduct bet amount
                await currencyService.subtractBalance(senderNumber, betAmount);
                
                // Generate slot symbols
                const symbols = ['🍒', '🍋', '🍊', '💎', '🎯'];
                const slot1 = symbols[Math.floor(Math.random() * symbols.length)];
                const slot2 = symbols[Math.floor(Math.random() * symbols.length)];
                const slot3 = symbols[Math.floor(Math.random() * symbols.length)];
                
                // Calculate winnings
                let multiplier = 0;
                let winMessage = '';
                
                if (slot1 === slot2 && slot2 === slot3) {
                    // Three of a kind
                    switch (slot1) {
                        case '🍒':
                            multiplier = 3;
                            winMessage = 'Sweet Cherries!';
                            break;
                        case '🍋':
                            multiplier = 5;
                            winMessage = 'Lovely Lemons!';
                            break;
                        case '🍊':
                            multiplier = 8;
                            winMessage = 'Outstanding Oranges!';
                            break;
                        case '💎':
                            multiplier = 20;
                            winMessage = 'Dazzling Diamonds!';
                            break;
                        case '🎯':
                            multiplier = 50;
                            winMessage = 'BULLSEYE JACKPOT!';
                            break;
                    }
                }
                
                const winnings = betAmount * multiplier;
                let newBalance;
                
                if (winnings > 0) {
                    newBalance = await currencyService.addBalance(senderNumber, winnings);
                } else {
                    newBalance = currencyService.getBalance(senderNumber);
                }
                
                // Create result message
                let resultText = `🎰 *SLOTS GAME* 🎰\n\n`;
                resultText += `┌─────────────┐\n`;
                resultText += `│  ${slot1} │ ${slot2} │ ${slot3}  │\n`;
                resultText += `└─────────────┘\n\n`;
                
                if (winnings > 0) {
                    resultText += `🎉 *${winMessage}*\n\n`;
                    resultText += `**Bet:** ${currencyService.formatCurrency(betAmount)}\n`;
                    resultText += `**Won:** ${currencyService.formatCurrency(winnings)} (${multiplier}x)\n`;
                    resultText += `**New Balance:** ${currencyService.formatCurrency(newBalance)}\n\n`;
                    resultText += `🎊 Congratulations! You won!`;
                } else {
                    resultText += `😔 *No Match*\n\n`;
                    resultText += `**Bet:** ${currencyService.formatCurrency(betAmount)}\n`;
                    resultText += `**Lost:** ${currencyService.formatCurrency(betAmount)}\n`;
                    resultText += `**New Balance:** ${currencyService.formatCurrency(newBalance)}\n\n`;
                    resultText += `🍀 Better luck next time!`;
                }
                
                await sock.sendMessage(sender, { text: resultText });
            }
        });

        // Rich list command
        commandManager.register('rich', {
            description: 'View the top currency holders leaderboard',
            usage: `${config.PREFIX}rich`,
            role: 'user',
            category: 'currency',
            handler: async (sock, message, args) => {
                const topUsers = currencyService.getTopUsers(10);
                
                if (topUsers.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `💎 *Leaderboard Empty*\n\nNo users found in the currency system yet.`
                    });
                    return;
                }
                
                let leaderboard = `💎 *RICH LIST* 💎\n`;
                leaderboard += `Top ${topUsers.length} Currency Holders\n\n`;
                
                const medals = ['🥇', '🥈', '🥉'];
                
                topUsers.forEach((user, index) => {
                    const medal = medals[index] || `${index + 1}.`;
                    const maskedNumber = '+' + user.number.slice(0, -4) + '****';
                    leaderboard += `${medal} ${maskedNumber}\n`;
                    leaderboard += `   ${currencyService.formatCurrency(user.balance)}\n\n`;
                });
                
                const stats = currencyService.getStats();
                leaderboard += `📊 *Statistics:*\n`;
                leaderboard += `├ Total Users: ${stats.totalUsers}\n`;
                leaderboard += `├ Total Currency: ${currencyService.formatCurrency(stats.totalCurrency)}\n`;
                leaderboard += `└ Average Balance: ${currencyService.formatCurrency(stats.averageBalance)}`;
                
                await sock.sendMessage(message.key.remoteJid, { text: leaderboard });
            }
        });

        // Currency management command (admin only)
        commandManager.register('currency', {
            description: 'Manage user currency balances (admin only)',
            usage: `${config.PREFIX}currency <give|take|set> @user <amount>`,
            role: 'admin',
            category: 'admin',
            handler: async (sock, message, args) => {
                if (args.length < 3) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `💰 *Currency Management*\n\n` +
                            `Usage: \`${config.PREFIX}currency <action> @user <amount>\`\n\n` +
                            `**Actions:**\n` +
                            `• \`give\` - Add currency to user\n` +
                            `• \`take\` - Remove currency from user\n` +
                            `• \`set\` - Set user's balance\n\n` +
                            `**Example:** \`${config.PREFIX}currency give @user 1000\``
                    });
                    return;
                }
                
                const action = args[0].toLowerCase();
                const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                
                let targetNumber;
                let amount;
                
                if (quotedMessage) {
                    targetNumber = message.message.extendedTextMessage.contextInfo.participant || message.message.extendedTextMessage.contextInfo.remoteJid;
                    amount = parseInt(args[1]);
                } else if (mentionedJid) {
                    targetNumber = mentionedJid;
                    amount = parseInt(args[2]);
                } else {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Invalid Usage*\n\nPlease mention a user or reply to their message.`
                    });
                    return;
                }
                
                if (!['give', 'take', 'set'].includes(action)) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Invalid Action*\n\nValid actions: give, take, set`
                    });
                    return;
                }
                
                if (isNaN(amount) || amount <= 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Invalid Amount*\n\nPlease enter a valid positive number.`
                    });
                    return;
                }
                
                const targetNumberClean = targetNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');
                const oldBalance = currencyService.getBalance(targetNumberClean);
                let newBalance;
                let success = false;
                
                switch (action) {
                    case 'give':
                        newBalance = await currencyService.addBalance(targetNumberClean, amount);
                        success = true;
                        break;
                    case 'take':
                        newBalance = await currencyService.subtractBalance(targetNumberClean, amount);
                        success = newBalance !== null;
                        break;
                    case 'set':
                        success = await currencyService.setBalance(targetNumberClean, amount);
                        newBalance = success ? amount : oldBalance;
                        break;
                }
                
                if (success) {
                    const response = `✅ *Currency Updated*\n\n` +
                        `**Action:** ${action.charAt(0).toUpperCase() + action.slice(1)}\n` +
                        `**User:** +${targetNumberClean}\n` +
                        `**Amount:** ${currencyService.formatCurrency(amount)}\n` +
                        `**Old Balance:** ${currencyService.formatCurrency(oldBalance)}\n` +
                        `**New Balance:** ${currencyService.formatCurrency(newBalance)}\n\n` +
                        `🎉 Operation completed successfully!`;
                    
                    await sock.sendMessage(message.key.remoteJid, { text: response });
                } else {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Operation Failed*\n\n` +
                            `Could not ${action} currency. User may have insufficient funds.`
                    });
                }
            }
        });
    }
};
