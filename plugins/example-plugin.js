const config = require('../config');

module.exports = {
    name: 'Example Plugin',
    version: '2.0.0',
    description: 'Enhanced example plugin with improved commands',
    author: 'Bot Developer',

    async init(commandManager) {
        this.registerCommands(commandManager);
        
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            author: this.author,
            commands: ['hello', 'time', 'joke']
        };
    },

    registerCommands(commandManager) {
        // Enhanced Hello command
        commandManager.register('hello', {
            description: 'Get a personalized greeting with your name',
            usage: `${config.PREFIX}hello [name]`,
            role: 'user',
            category: 'general',
            handler: async (sock, message, args) => {
                const name = args.join(' ') || 'Friend';
                const greetings = [
                    `Hello there, ${name}! 👋`,
                    `Hey ${name}! How are you doing? 😊`,
                    `Greetings, ${name}! Nice to meet you! 🤝`,
                    `Hi ${name}! Hope you're having a great day! ✨`,
                    `Welcome ${name}! Thanks for using our bot! 🎉`
                ];
                
                const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
                
                const response = `🌟 *Personal Greeting* 🌟\n\n${randomGreeting}\n\n💡 *Tip:* Use \`${config.PREFIX}menu\` to see all available commands!`;
                
                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });

        // Enhanced Time command
        commandManager.register('time', {
            description: 'Get current server time with timezone info',
            usage: `${config.PREFIX}time`,
            role: 'user',
            category: 'utility',
            handler: async (sock, message, args) => {
                const now = new Date();
                const options = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                };
                
                const timeString = now.toLocaleDateString('en-US', options);
                const utcTime = now.toUTCString();
                const timestamp = Math.floor(now.getTime() / 1000);
                
                const response = `🕐 *Current Server Time*\n\n` +
                    `📅 **Local Time:** ${timeString}\n` +
                    `🌍 **UTC Time:** ${utcTime}\n` +
                    `⏱️ **Unix Timestamp:** ${timestamp}\n\n` +
                    `🤖 *Server uptime:* ${this.getUptime()}`;
                
                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });

        // Enhanced Joke command
        commandManager.register('joke', {
            description: 'Get a random programming joke to brighten your day',
            usage: `${config.PREFIX}joke`,
            role: 'user',
            category: 'general',
            handler: async (sock, message, args) => {
                const jokes = [
                    "Why do programmers prefer dark mode?\nBecause light attracts bugs! 🐛",
                    "How many programmers does it take to change a light bulb?\nNone, that's a hardware problem! 💡",
                    "Why did the programmer quit his job?\nHe didn't get arrays! 📊",
                    "What's a programmer's favorite hangout place?\nFoo Bar! 🍺",
                    "Why do Java developers wear glasses?\nBecause they can't C#! 👓",
                    "How do you comfort a JavaScript bug?\nYou console it! 🖥️",
                    "Why did the programmer go broke?\nBecause he used up all his cache! 💸",
                    "What do you call a programmer from Finland?\nNerdic! 🇫🇮",
                    "Why don't programmers like nature?\nIt has too many bugs! 🌳",
                    "What's the object-oriented way to become wealthy?\nInheritance! 💰"
                ];
                
                const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
                
                const response = `😄 *Programming Joke* 😄\n\n${randomJoke}\n\n😂 Hope that made you smile!`;
                
                await sock.sendMessage(message.key.remoteJid, { text: response });
            }
        });
    },

    getUptime() {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        return `${hours}h ${minutes}m ${seconds}s`;
    }
};
