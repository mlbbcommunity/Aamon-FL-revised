const config = require('../config');

module.exports = {
    name: 'Utility Tools',
    version: '2.0.0',
    description: 'Enhanced utility commands for daily use',
    author: 'Bot Developer',

    async init(commandManager) {
        this.registerCommands(commandManager);
        
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            author: this.author,
            commands: ['calc', 'qr', 'base64', 'password', 'quote']
        };
    },

    registerCommands(commandManager) {
        // Enhanced Calculator command
        commandManager.register('calc', {
            description: 'Perform mathematical calculations with advanced functions',
            usage: `${config.PREFIX}calc <expression>`,
            role: 'user',
            category: 'utility',
            handler: async (sock, message, args) => {
                if (args.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `🧮 *Calculator Usage*\n\n` +
                            `Usage: \`${config.PREFIX}calc <expression>\`\n\n` +
                            `**Examples:**\n` +
                            `• \`${config.PREFIX}calc 2 + 2\`\n` +
                            `• \`${config.PREFIX}calc 15 * 8\`\n` +
                            `• \`${config.PREFIX}calc sqrt(64)\`\n` +
                            `• \`${config.PREFIX}calc 2^3\`\n\n` +
                            `**Supported functions:** +, -, *, /, ^, sqrt(), sin(), cos(), tan()`
                    });
                    return;
                }

                try {
                    let expression = args.join(' ');
                    
                    // Replace some common math functions
                    expression = expression.replace(/\^/g, '**');
                    expression = expression.replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)');
                    expression = expression.replace(/sin\(([^)]+)\)/g, 'Math.sin($1)');
                    expression = expression.replace(/cos\(([^)]+)\)/g, 'Math.cos($1)');
                    expression = expression.replace(/tan\(([^)]+)\)/g, 'Math.tan($1)');
                    expression = expression.replace(/pi/gi, 'Math.PI');
                    expression = expression.replace(/e/gi, 'Math.E');
                    
                    // Basic security check
                    if (/[a-zA-Z]/.test(expression.replace(/Math\.|sqrt|sin|cos|tan|PI|E/g, ''))) {
                        throw new Error('Invalid characters in expression');
                    }
                    
                    const result = eval(expression);
                    
                    if (isNaN(result)) {
                        throw new Error('Result is not a number');
                    }
                    
                    const response = `🧮 *Calculator Result*\n\n` +
                        `**Expression:** ${args.join(' ')}\n` +
                        `**Result:** ${result}\n\n` +
                        `💡 *Tip:* Try mathematical functions like sqrt(), sin(), cos()!`;
                    
                    await sock.sendMessage(message.key.remoteJid, { text: response });
                    
                } catch (error) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Calculation Error*\n\n` +
                            `Invalid expression or syntax error.\n\n` +
                            `**Example:** \`${config.PREFIX}calc 2 + 2\``
                    });
                }
            }
        });

        // Enhanced QR Code generator
        commandManager.register('qr', {
            description: 'Generate QR code for any text or URL',
            usage: `${config.PREFIX}qr <text>`,
            role: 'user',
            category: 'utility',
            handler: async (sock, message, args) => {
                if (args.length === 0) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `📱 *QR Code Generator*\n\n` +
                            `Usage: \`${config.PREFIX}qr <text>\`\n\n` +
                            `**Examples:**\n` +
                            `• \`${config.PREFIX}qr Hello World\`\n` +
                            `• \`${config.PREFIX}qr https://google.com\`\n` +
                            `• \`${config.PREFIX}qr My contact: +1234567890\``
                    });
                    return;
                }

                const text = args.join(' ');
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(text)}`;
                
                try {
                    await sock.sendMessage(message.key.remoteJid, {
                        image: { url: qrUrl },
                        caption: `📱 *QR Code Generated*\n\n` +
                            `**Content:** ${text}\n` +
                            `**Size:** 512x512 pixels\n\n` +
                            `✨ Scan with any QR code reader!`
                    });
                } catch (error) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *QR Generation Failed*\n\n` +
                            `Could not generate QR code. Please try again with shorter text.`
                    });
                }
            }
        });

        // Enhanced Base64 encoder/decoder
        commandManager.register('base64', {
            description: 'Encode or decode text using Base64',
            usage: `${config.PREFIX}base64 <encode|decode> <text>`,
            role: 'user',
            category: 'utility',
            handler: async (sock, message, args) => {
                if (args.length < 2) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `🔐 *Base64 Encoder/Decoder*\n\n` +
                            `Usage: \`${config.PREFIX}base64 <encode|decode> <text>\`\n\n` +
                            `**Examples:**\n` +
                            `• \`${config.PREFIX}base64 encode Hello World\`\n` +
                            `• \`${config.PREFIX}base64 decode SGVsbG8gV29ybGQ=\``
                    });
                    return;
                }

                const operation = args[0].toLowerCase();
                const text = args.slice(1).join(' ');

                try {
                    let result;
                    
                    if (operation === 'encode') {
                        result = Buffer.from(text, 'utf8').toString('base64');
                    } else if (operation === 'decode') {
                        result = Buffer.from(text, 'base64').toString('utf8');
                    } else {
                        throw new Error('Invalid operation');
                    }

                    const response = `🔐 *Base64 ${operation.charAt(0).toUpperCase() + operation.slice(1)}*\n\n` +
                        `**Input:** ${text}\n` +
                        `**Output:** ${result}\n\n` +
                        `✅ Operation completed successfully!`;
                    
                    await sock.sendMessage(message.key.remoteJid, { text: response });
                    
                } catch (error) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `❌ *Base64 Error*\n\n` +
                            `Invalid operation or input format.\n` +
                            `Use "encode" or "decode" as the operation.`
                    });
                }
            }
        });

        // Enhanced Password generator
        commandManager.register('password', {
            description: 'Generate a secure random password',
            usage: `${config.PREFIX}password [length]`,
            role: 'user',
            category: 'utility',
            handler: async (sock, message, args) => {
                const length = parseInt(args[0]) || 12;
                
                if (length < 4 || length > 50) {
                    await sock.sendMessage(message.key.remoteJid, {
                        text: `🔒 *Password Generator*\n\n` +
                            `Usage: \`${config.PREFIX}password [length]\`\n\n` +
                            `**Length:** 4-50 characters (default: 12)\n` +
                            `**Example:** \`${config.PREFIX}password 16\``
                    });
                    return;
                }

                const charset = {
                    lowercase: 'abcdefghijklmnopqrstuvwxyz',
                    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                    numbers: '0123456789',
                    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
                };

                let password = '';
                const allChars = Object.values(charset).join('');
                
                // Ensure at least one character from each set
                password += charset.lowercase[Math.floor(Math.random() * charset.lowercase.length)];
                password += charset.uppercase[Math.floor(Math.random() * charset.uppercase.length)];
                password += charset.numbers[Math.floor(Math.random() * charset.numbers.length)];
                password += charset.symbols[Math.floor(Math.random() * charset.symbols.length)];
                
                // Fill the rest randomly
                for (let i = password.length; i < length; i++) {
                    password += allChars[Math.floor(Math.random() * allChars.length)];
                }
                
                // Shuffle the password
                password = password.split('').sort(() => Math.random() - 0.5).join('');

                const response = `🔒 *Secure Password Generated*\n\n` +
                    `**Password:** \`${password}\`\n` +
                    `**Length:** ${length} characters\n` +
                    `**Strength:** Very Strong 💪\n\n` +
                    `⚠️ *Security Tip:* Save this password securely and don't share it!`;
                
                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });

        // Enhanced Quote command
        commandManager.register('quote', {
            description: 'Get an inspirational quote to motivate your day',
            usage: `${config.PREFIX}quote`,
            role: 'user',
            category: 'general',
            handler: async (sock, message, args) => {
                const quotes = [
                    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
                    { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
                    { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
                    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
                    { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
                    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
                    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
                    { text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
                    { text: "You learn more from failure than from success. Don't let it stop you. Failure builds character.", author: "Unknown" },
                    { text: "If you are working on something that you really care about, you don't have to be pushed. The vision pulls you.", author: "Steve Jobs" }
                ];

                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                
                const response = `💭 *Inspirational Quote*\n\n` +
                    `"${randomQuote.text}"\n\n` +
                    `— *${randomQuote.author}*\n\n` +
                    `✨ Let this inspire your day!`;
                
                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });
    }
};
