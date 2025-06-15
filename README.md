# Enhanced WhatsApp Bot with Currency System

A powerful WhatsApp bot built with Baileys library featuring role-based permissions, plugin system, currency system, and games - now with enhanced prefix "." commands.

## 🚀 New Features

### ✨ Enhanced in v2.0
- **Changed prefix from "!" to "."** - All commands now use dot prefix
- **Complete Currency System** - Earn, spend, and manage community credits (cc)
- **Slots Game** - Exciting slot machine game with betting and winnings
- **Sudo System** - Temporary admin privileges for users
- **Enhanced Commands** - Improved formatting and functionality across all commands
- **Better Error Handling** - More detailed error messages and user feedback

## 🎯 Core Features

- 🤖 **WhatsApp Bot**: Built with Baileys library for reliable WhatsApp Web API integration
- 🔐 **Code-based Pairing**: No QR code scanning required - uses pairing codes for authentication
- 👑 **Role System**: Four-tier role system (Owner, Admin, Sudo, User) with permission-based command access
- 💰 **Currency System**: Complete economy with community credits, daily bonuses, and transfers
- 🎰 **Games**: Slots game with betting system and multiple payout combinations
- 🔌 **Plugin System**: Dynamic plugin loading for extensible command functionality
- 📱 **Rich Commands**: 20+ commands including utilities, games, and admin tools
- 🔄 **Auto Reconnection**: Handles connection drops and automatically reconnects
- 📊 **Comprehensive Logging**: Enhanced logging with Pino for debugging and monitoring
- ☁️ **Deploy Ready**: Configured for easy deployment on cloud platforms

## 🎮 Commands Overview

### General Commands (All Users)
- `.ping` - Check bot responsiveness and latency
- `.menu` - Display available commands based on your role
- `.hello [name]` - Get a personalized greeting
- `.time` - Get current server time with timezone info
- `.joke` - Get a random programming joke

### Currency System
- `.balance` - Check your current balance
- `.daily` - Claim daily bonus (100 cc)
- `.pay @user <amount>` - Transfer currency to another user
- `.rich` - View top currency holders leaderboard

### Games
- `.slots <bet>` - Play slots game with betting system
  - 🍒🍒🍒 - 3x bet payout
  - 🍋🍋🍋 - 5x bet payout
  - 🍊🍊🍊 - 8x bet payout
  - 💎💎💎 - 20x bet payout
  - 🎯🎯🎯 - 50x bet payout (JACKPOT!)

### Text Games
- `.riddle` - Get fun riddles to solve
- `.trivia` - Answer multiple choice trivia questions
- `.wordchain [word]` - Play word chain games
- `.rhyme <word>` - Find words that rhyme
- `.story [add sentence]` - Collaborative story building
- `.anagram` - Solve anagram puzzles
- `.guess [number]` - Number guessing game (1-100)

### Utility Tools
- `.calc <expression>` - Mathematical calculator with functions
- `.qr <text>` - Generate QR codes for any text/URL
- `.quote` - Get inspirational quotes
- `.base64 <encode|decode> <text>` - Base64 encoder/decoder
- `.password [length]` - Generate secure random passwords

### Admin Commands
- `.status` - Check bot status and system information
- `.plugins` - List all loaded plugins with details
- `.reloadplugin <filename>` - Reload a specific plugin
- `.loadplugins` - Reload all plugins
- `.info` - Get detailed system information
- `.setsudo @user [duration]` - Grant temporary sudo privileges
- `.currency <give|take|set> @user <amount>` - Manage user balances

### Owner Commands
- `.addadmin @user` - Add a user as permanent admin
- `.broadcast <message>` - Send message to all recent contacts
- `.restart` - Restart the bot with proper cleanup
- `.eval <code>` - Execute JavaScript code (debugging)

## 🏗️ Installation & Setup

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd whatsapp-bot-enhanced
npm install
