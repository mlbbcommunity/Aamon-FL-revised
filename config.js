require('dotenv').config();

const config = {
    // Bot Configuration
    BOT_NAME: process.env.BOT_NAME || 'Aamon',
    PREFIX: process.env.PREFIX || '.',
    
    // Phone Numbers (without + symbol)
    PHONE_NUMBER: process.env.PHONE_NUMBER || '',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '27683913716',
    
    // Admin Numbers (comma-separated list)
    ADMIN_NUMBERS: process.env.ADMIN_NUMBERS ? 
        process.env.ADMIN_NUMBERS.split(',').map(num => num.trim()) : [],
    
    // Bot Settings
    AUTO_READ: process.env.AUTO_READ === 'true',
    AUTO_TYPING: process.env.AUTO_TYPING === 'true',
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Rate Limiting
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 10,
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
    
    // Currency System
    CURRENCY_NAME: process.env.CURRENCY_NAME || 'cc',
    CURRENCY_SYMBOL: process.env.CURRENCY_SYMBOL || '💰',
    DAILY_BONUS_AMOUNT: parseInt(process.env.DAILY_BONUS_AMOUNT) || 100,
    STARTING_BALANCE: parseInt(process.env.STARTING_BALANCE) || 1000,
    
    // Slots Game Configuration
    SLOTS_MIN_BET: parseInt(process.env.SLOTS_MIN_BET) || 10,
    SLOTS_MAX_BET: parseInt(process.env.SLOTS_MAX_BET) || 1000,
    
    // Port (for deployment)
    PORT: parseInt(process.env.PORT) || 8000
};

// Validation
if (!config.PHONE_NUMBER) {
    console.error('❌ PHONE_NUMBER is required in environment variables');
    process.exit(1);
}

if (!config.OWNER_NUMBER) {
    console.error('❌ OWNER_NUMBER is required in environment variables');
    process.exit(1);
}

module.exports = config;
