const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class CurrencyService {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.dataFile = path.join(this.dataDir, 'currency.json');
        this.users = new Map();
        this.dailyBonuses = new Map();
    }

    /**
     * Initialize the currency service
     */
    async initialize() {
        try {
            // Ensure data directory exists
            await fs.mkdir(this.dataDir, { recursive: true });
            
            // Load existing data
            await this.loadData();
            
            logger.info('Currency service initialized');
        } catch (error) {
            logger.error('Failed to initialize currency service:', error);
        }
    }

    /**
     * Load currency data from file
     */
    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            
            // Load user balances
            if (parsed.users) {
                this.users = new Map(Object.entries(parsed.users));
            }
            
            // Load daily bonus data
            if (parsed.dailyBonuses) {
                this.dailyBonuses = new Map(Object.entries(parsed.dailyBonuses));
            }
            
            logger.info(`Loaded currency data for ${this.users.size} users`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.info('No existing currency data found, starting fresh');
            } else {
                logger.error('Error loading currency data:', error);
            }
        }
    }

    /**
     * Save currency data to file
     */
    async saveData() {
        try {
            const data = {
                users: Object.fromEntries(this.users),
                dailyBonuses: Object.fromEntries(this.dailyBonuses),
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            logger.error('Error saving currency data:', error);
        }
    }

    /**
     * Get user's balance
     * @param {string} userNumber - User's phone number
     * @returns {number} - User's balance
     */
    getBalance(userNumber) {
        const balance = this.users.get(userNumber);
        if (balance === undefined) {
            // Create new user with starting balance
            this.users.set(userNumber, config.STARTING_BALANCE);
            this.saveData();
            return config.STARTING_BALANCE;
        }
        return balance;
    }

    /**
     * Set user's balance
     * @param {string} userNumber - User's phone number
     * @param {number} amount - New balance amount
     * @returns {boolean} - Success status
     */
    async setBalance(userNumber, amount) {
        try {
            if (amount < 0) {
                return false;
            }
            
            this.users.set(userNumber, amount);
            await this.saveData();
            return true;
        } catch (error) {
            logger.error('Error setting balance:', error);
            return false;
        }
    }

    /**
     * Add currency to user's balance
     * @param {string} userNumber - User's phone number
     * @param {number} amount - Amount to add
     * @returns {number} - New balance
     */
    async addBalance(userNumber, amount) {
        const currentBalance = this.getBalance(userNumber);
        const newBalance = currentBalance + amount;
        await this.setBalance(userNumber, newBalance);
        return newBalance;
    }

    /**
     * Subtract currency from user's balance
     * @param {string} userNumber - User's phone number
     * @param {number} amount - Amount to subtract
     * @returns {number|null} - New balance or null if insufficient funds
     */
    async subtractBalance(userNumber, amount) {
        const currentBalance = this.getBalance(userNumber);
        
        if (currentBalance < amount) {
            return null; // Insufficient funds
        }
        
        const newBalance = currentBalance - amount;
        await this.setBalance(userNumber, newBalance);
        return newBalance;
    }

    /**
     * Transfer currency between users
     * @param {string} fromUser - Sender's phone number
     * @param {string} toUser - Recipient's phone number
     * @param {number} amount - Amount to transfer
     * @returns {boolean} - Success status
     */
    async transfer(fromUser, toUser, amount) {
        try {
            const fromBalance = this.getBalance(fromUser);
            
            if (fromBalance < amount) {
                return false; // Insufficient funds
            }
            
            await this.subtractBalance(fromUser, amount);
            await this.addBalance(toUser, amount);
            
            logger.info(`Transfer: ${amount} ${config.CURRENCY_NAME} from ${fromUser} to ${toUser}`);
            return true;
        } catch (error) {
            logger.error('Error during transfer:', error);
            return false;
        }
    }

    /**
     * Check if user can claim daily bonus
     * @param {string} userNumber - User's phone number
     * @returns {boolean} - Can claim status
     */
    canClaimDailyBonus(userNumber) {
        const lastClaim = this.dailyBonuses.get(userNumber);
        
        if (!lastClaim) {
            return true; // Never claimed before
        }
        
        const now = new Date();
        const lastClaimDate = new Date(lastClaim);
        
        // Check if it's a new day
        return now.toDateString() !== lastClaimDate.toDateString();
    }

    /**
     * Claim daily bonus
     * @param {string} userNumber - User's phone number
     * @returns {number|null} - Bonus amount or null if already claimed
     */
    async claimDailyBonus(userNumber) {
        if (!this.canClaimDailyBonus(userNumber)) {
            return null; // Already claimed today
        }
        
        const bonusAmount = config.DAILY_BONUS_AMOUNT;
        const newBalance = await this.addBalance(userNumber, bonusAmount);
        
        // Record the claim time
        this.dailyBonuses.set(userNumber, new Date().toISOString());
        await this.saveData();
        
        logger.info(`Daily bonus claimed: ${userNumber} received ${bonusAmount} ${config.CURRENCY_NAME}`);
        return bonusAmount;
    }

    /**
     * Get time until next daily bonus
     * @param {string} userNumber - User's phone number
     * @returns {string} - Time remaining string
     */
    getTimeUntilNextBonus(userNumber) {
        const lastClaim = this.dailyBonuses.get(userNumber);
        
        if (!lastClaim) {
            return 'Available now';
        }
        
        const lastClaimDate = new Date(lastClaim);
        const nextClaimDate = new Date(lastClaimDate);
        nextClaimDate.setDate(nextClaimDate.getDate() + 1);
        nextClaimDate.setHours(0, 0, 0, 0);
        
        const now = new Date();
        const timeDiff = nextClaimDate - now;
        
        if (timeDiff <= 0) {
            return 'Available now';
        }
        
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    }

    /**
     * Get top users by balance
     * @param {number} limit - Number of users to return
     * @returns {Array} - Array of top users
     */
    getTopUsers(limit = 10) {
        const users = Array.from(this.users.entries())
            .map(([number, balance]) => ({ number, balance }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit);
        
        return users;
    }

    /**
     * Get total currency in circulation
     * @returns {number} - Total currency amount
     */
    getTotalCurrency() {
        return Array.from(this.users.values()).reduce((total, balance) => total + balance, 0);
    }

    /**
     * Get currency statistics
     * @returns {Object} - Currency statistics
     */
    getStats() {
        const totalUsers = this.users.size;
        const totalCurrency = this.getTotalCurrency();
        const averageBalance = totalUsers > 0 ? Math.round(totalCurrency / totalUsers) : 0;
        
        return {
            totalUsers,
            totalCurrency,
            averageBalance,
            dailyBonusesClaimed: this.dailyBonuses.size
        };
    }

    /**
     * Format currency amount
     * @param {number} amount - Currency amount
     * @returns {string} - Formatted currency string
     */
    formatCurrency(amount) {
        return `${config.CURRENCY_SYMBOL} ${amount.toLocaleString()} ${config.CURRENCY_NAME}`;
    }
}

module.exports = new CurrencyService();
