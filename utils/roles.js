const config = require('../config');
const logger = require('./logger');

class RoleManager {
    constructor() {
        this.roles = {
            OWNER: 'owner',
            ADMIN: 'admin',
            CITIZEN: 'citizen'
        };
        
        // Temporary sudo users (in memory)
        this.sudoUsers = new Map();
        
        // Muted users tracking
        this.mutedUsers = new Map();
        
        // Command role restrictions (command -> minimum role required)
        this.commandRoles = new Map();
        
        // Initialize default command roles
        this.initializeDefaultCommandRoles();
    }

    /**
     * Initialize default command roles
     */
    initializeDefaultCommandRoles() {
        // Owner-only commands
        this.commandRoles.set('addadmin', this.roles.OWNER);
        this.commandRoles.set('removeadmin', this.roles.OWNER);
        this.commandRoles.set('broadcast', this.roles.OWNER);
        this.commandRoles.set('eval', this.roles.OWNER);
        this.commandRoles.set('setrole', this.roles.OWNER);
        this.commandRoles.set('commandrole', this.roles.OWNER);
        
        // Admin commands
        this.commandRoles.set('mute', this.roles.ADMIN);
        this.commandRoles.set('unmute', this.roles.ADMIN);
        this.commandRoles.set('restart', this.roles.ADMIN);
        this.commandRoles.set('info', this.roles.ADMIN);
        this.commandRoles.set('status', this.roles.ADMIN);
        this.commandRoles.set('plugins', this.roles.ADMIN);
        this.commandRoles.set('setsudo', this.roles.ADMIN);
        
        // Citizen commands (default level)
        this.commandRoles.set('ping', this.roles.CITIZEN);
        this.commandRoles.set('menu', this.roles.CITIZEN);
        this.commandRoles.set('balance', this.roles.CITIZEN);
        this.commandRoles.set('daily', this.roles.CITIZEN);
        this.commandRoles.set('slots', this.roles.CITIZEN);
        this.commandRoles.set('pay', this.roles.CITIZEN);
        this.commandRoles.set('rich', this.roles.CITIZEN);
        this.commandRoles.set('calc', this.roles.CITIZEN);
        this.commandRoles.set('qr', this.roles.CITIZEN);
        this.commandRoles.set('quote', this.roles.CITIZEN);
        this.commandRoles.set('hello', this.roles.CITIZEN);
        this.commandRoles.set('time', this.roles.CITIZEN);
        this.commandRoles.set('joke', this.roles.CITIZEN);
    }

    /**
     * Get user role based on phone number
     * @param {string} phoneNumber - User's phone number
     * @returns {string} - User role
     */
    getUserRole(phoneNumber) {
        try {
            // Extract number from JID format
            const number = phoneNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');
            
            // Check if owner
            if (number === config.OWNER_NUMBER) {
                return this.roles.OWNER;
            }
            
            // Check if admin
            if (config.ADMIN_NUMBERS.includes(number)) {
                return this.roles.ADMIN;
            }
            
            // Default to citizen
            return this.roles.CITIZEN;
        } catch (error) {
            logger.error('Error determining user role:', error);
            return this.roles.CITIZEN;
        }
    }

    /**
     * Check if user is owner
     * @param {string} phoneNumber - User's phone number
     * @returns {boolean}
     */
    isOwner(phoneNumber) {
        return this.getUserRole(phoneNumber) === this.roles.OWNER;
    }

    /**
     * Check if user is admin or higher
     * @param {string} phoneNumber - User's phone number
     * @returns {boolean}
     */
    isAdmin(phoneNumber) {
        const role = this.getUserRole(phoneNumber);
        return role === this.roles.ADMIN || role === this.roles.OWNER;
    }

    /**
     * Check if user has required permission level
     * @param {string} phoneNumber - User's phone number
     * @param {string} requiredRole - Required role level
     * @returns {boolean}
     */
    hasPermission(phoneNumber, requiredRole) {
        const userRole = this.getUserRole(phoneNumber);
        
        switch (requiredRole) {
            case this.roles.OWNER:
                return userRole === this.roles.OWNER;
            case this.roles.ADMIN:
                return userRole === this.roles.ADMIN || userRole === this.roles.OWNER;
            case this.roles.CITIZEN:
                return true; // All users have citizen level access
            default:
                return false;
        }
    }

    /**
     * Check command permission based on dynamic role system
     * @param {string} phoneNumber - User's phone number
     * @param {string} commandName - Command name
     * @returns {boolean}
     */
    hasCommandPermission(phoneNumber, commandName) {
        const userRole = this.getUserRole(phoneNumber);
        const requiredRole = this.commandRoles.get(commandName) || this.roles.CITIZEN;
        
        return this.hasPermission(phoneNumber, requiredRole);
    }

    /**
     * Set command role requirement (owner only)
     * @param {string} commandName - Command name
     * @param {string} role - Required role
     * @param {string} requesterNumber - Phone number of requester
     * @returns {boolean}
     */
    setCommandRole(commandName, role, requesterNumber) {
        if (!this.isOwner(requesterNumber)) {
            return false;
        }

        if (!Object.values(this.roles).includes(role)) {
            return false;
        }

        this.commandRoles.set(commandName, role);
        logger.info(`Command role updated: ${commandName} -> ${role} by ${requesterNumber}`);
        return true;
    }

    /**
     * Get command role requirement
     * @param {string} commandName - Command name
     * @returns {string}
     */
    getCommandRole(commandName) {
        return this.commandRoles.get(commandName) || this.roles.CITIZEN;
    }

    /**
     * Get role display name
     * @param {string} phoneNumber - User's phone number
     * @returns {string}
     */
    getRoleDisplay(phoneNumber) {
        const role = this.getUserRole(phoneNumber);
        switch (role) {
            case this.roles.OWNER:
                return '👑 Owner';
            case this.roles.ADMIN:
                return '⚡ Admin';
            case this.roles.CITIZEN:
                return '👤 Citizen';
            default:
                return '❓ Unknown';
        }
    }

    /**
     * Mute a user in a group
     * @param {string} userNumber - User's phone number to mute
     * @param {string} groupId - Group ID
     * @param {string} requesterNumber - Phone number of requester
     * @returns {boolean}
     */
    muteUser(userNumber, groupId, requesterNumber) {
        if (!this.isAdmin(requesterNumber)) {
            return false;
        }

        const key = `${groupId}:${userNumber}`;
        this.mutedUsers.set(key, {
            mutedBy: requesterNumber,
            mutedAt: Date.now(),
            groupId: groupId,
            userNumber: userNumber
        });

        logger.info(`User ${userNumber} muted in group ${groupId} by ${requesterNumber}`);
        return true;
    }

    /**
     * Unmute a user in a group
     * @param {string} userNumber - User's phone number to unmute
     * @param {string} groupId - Group ID
     * @param {string} requesterNumber - Phone number of requester
     * @returns {boolean}
     */
    unmuteUser(userNumber, groupId, requesterNumber) {
        if (!this.isAdmin(requesterNumber)) {
            return false;
        }

        const key = `${groupId}:${userNumber}`;
        const deleted = this.mutedUsers.delete(key);

        if (deleted) {
            logger.info(`User ${userNumber} unmuted in group ${groupId} by ${requesterNumber}`);
        }

        return deleted;
    }

    /**
     * Check if a user is muted in a group
     * @param {string} userNumber - User's phone number
     * @param {string} groupId - Group ID
     * @returns {boolean}
     */
    isUserMuted(userNumber, groupId) {
        const key = `${groupId}:${userNumber}`;
        return this.mutedUsers.has(key);
    }

    /**
     * Get all muted users in a group
     * @param {string} groupId - Group ID
     * @returns {Array}
     */
    getMutedUsersInGroup(groupId) {
        const mutedUsers = [];
        for (const [key, data] of this.mutedUsers.entries()) {
            if (data.groupId === groupId) {
                mutedUsers.push(data);
            }
        }
        return mutedUsers;
    }

    /**
     * Add user to admin list (owner only)
     * @param {string} phoneNumber - Phone number to add as admin
     * @param {string} requesterNumber - Phone number of requester
     * @returns {boolean}
     */
    addAdmin(phoneNumber, requesterNumber) {
        if (!this.isOwner(requesterNumber)) {
            return false;
        }

        const number = phoneNumber.replace(/[^0-9]/g, '');
        if (!config.ADMIN_NUMBERS.includes(number)) {
            config.ADMIN_NUMBERS.push(number);
            logger.info(`Added ${number} as admin by ${requesterNumber}`);
            return true;
        }
        
        return false; // Already admin
    }

    /**
     * Remove user from admin list (owner only)
     * @param {string} phoneNumber - Phone number to remove from admin
     * @param {string} requesterNumber - Phone number of requester
     * @returns {boolean}
     */
    removeAdmin(phoneNumber, requesterNumber) {
        if (!this.isOwner(requesterNumber)) {
            return false;
        }

        const number = phoneNumber.replace(/[^0-9]/g, '');
        const index = config.ADMIN_NUMBERS.indexOf(number);
        
        if (index > -1) {
            config.ADMIN_NUMBERS.splice(index, 1);
            logger.info(`Removed ${number} from admin by ${requesterNumber}`);
            return true;
        }
        
        return false; // Not admin
    }

    /**
     * Grant sudo privileges to a user (admin+ only)
     * @param {string} phoneNumber - Phone number to grant sudo
     * @param {string} requesterNumber - Phone number of requester
     * @param {number} duration - Duration in minutes (default: 60)
     * @returns {boolean}
     */
    grantSudo(phoneNumber, requesterNumber, duration = 60) {
        if (!this.isAdmin(requesterNumber)) {
            return false;
        }

        const number = phoneNumber.replace(/[^0-9]/g, '');
        const expiresAt = Date.now() + (duration * 60 * 1000);
        
        this.sudoUsers.set(number, {
            grantedBy: requesterNumber.replace(/[^0-9]/g, ''),
            grantedAt: Date.now(),
            expiresAt: expiresAt,
            duration: duration
        });

        logger.info(`Granted sudo to ${number} for ${duration} minutes by ${requesterNumber}`);
        return true;
    }

    /**
     * Revoke sudo privileges from a user (admin+ only)
     * @param {string} phoneNumber - Phone number to revoke sudo
     * @param {string} requesterNumber - Phone number of requester
     * @returns {boolean}
     */
    revokeSudo(phoneNumber, requesterNumber) {
        if (!this.isAdmin(requesterNumber)) {
            return false;
        }

        const number = phoneNumber.replace(/[^0-9]/g, '');
        const removed = this.sudoUsers.delete(number);

        if (removed) {
            logger.info(`Revoked sudo from ${number} by ${requesterNumber}`);
        }

        return removed;
    }

    /**
     * Get sudo information for a user
     * @param {string} phoneNumber - User's phone number
     * @returns {Object|null}
     */
    getSudoInfo(phoneNumber) {
        const number = phoneNumber.replace('@s.whatsapp.net', '').replace('@c.us', '');
        return this.sudoUsers.get(number) || null;
    }

    /**
     * Get all current sudo users
     * @returns {Array}
     */
    getAllSudoUsers() {
        const now = Date.now();
        const validSudoUsers = [];

        for (const [number, info] of this.sudoUsers.entries()) {
            if (now < info.expiresAt) {
                validSudoUsers.push({
                    number,
                    ...info,
                    timeLeft: Math.ceil((info.expiresAt - now) / (1000 * 60))
                });
            } else {
                // Clean up expired sudo users
                this.sudoUsers.delete(number);
            }
        }

        return validSudoUsers;
    }
}

module.exports = new RoleManager();
