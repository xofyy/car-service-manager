const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const Repair = require('../models/Repair');

// Use a more secure secret key
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
const TOKEN_EXPIRY = '24h';

// Generate JWT token
const generateToken = (user) => {
    console.log('Generating token for user:', user._id);
    return jwt.sign(
        { 
            id: user._id,
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
};

// Verify JWT token middleware
const auth = async (req, res, next) => {
    console.log('Auth middleware called');
    
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        console.log('Auth header:', authHeader ? 'present' : 'missing');
        
        if (!authHeader) {
            console.log('No auth header found');
            return res.status(401).json({ 
                error: 'No authorization header found',
                code: 'NO_AUTH_HEADER'
            });
        }

        // Extract token
        const token = authHeader.replace('Bearer ', '');
        console.log('Token extracted:', token ? 'present' : 'missing');
        
        if (!token) {
            console.log('No token found in header');
            return res.status(401).json({ 
                error: 'No token provided',
                code: 'NO_TOKEN'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
            console.log('Token verified:', { userId: decoded.id });
        } catch (jwtError) {
            console.log('Token verification failed:', jwtError.name);
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token has expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    error: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            }
            throw jwtError;
        }

        // Find user
        const user = await User.findOne({ _id: decoded.id });
        console.log('User lookup:', user ? 'found' : 'not found');
        
        if (!user) {
            console.log('User not found for token');
            return res.status(401).json({ 
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check token expiration
        const tokenExp = decoded.exp * 1000;
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        if (tokenExp - now < oneHour) {
            console.log('Token expiring soon, generating new token');
            const newToken = generateToken(user);
            res.setHeader('X-New-Token', newToken);
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();
        console.log('Last login updated');

        // Attach user and token to request
        req.token = token;
        req.user = user;
        console.log('Auth middleware completed successfully');
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ 
            error: 'Authentication failed',
            code: 'AUTH_FAILED'
        });
    }
};

// Role-based access control middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Access denied. Insufficient permissions.' 
            });
        }
        next();
    };
};

// Check if user owns the repair (for customers)
const checkRepairOwnership = async (req, res, next) => {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ 
                error: 'Invalid repair ID format',
                details: 'The provided ID is not a valid MongoDB ObjectId'
            });
        }

        const repair = await Repair.findById(req.params.id);
        
        if (!repair) {
            return res.status(404).json({ 
                error: 'Repair not found',
                details: 'No repair exists with the provided ID'
            });
        }

        // Allow access if user is admin or technician
        if (req.user.role === 'admin' || req.user.role === 'technician') {
            return next();
        }

        // For customers, check if they own the repair
        // Convert both IDs to strings for comparison
        const repairCustomerId = repair.customerId.toString();
        const userId = req.user._id.toString();

        console.log('Ownership check:', {
            repairCustomerId,
            userId,
            userRole: req.user.role
        });

        if (repairCustomerId !== userId) {
            return res.status(403).json({ 
                error: 'Access denied',
                details: 'You can only view and edit your own repairs'
            });
        }

        next();
    } catch (error) {
        console.error('Error in checkRepairOwnership:', error);
        res.status(500).json({ 
            error: 'Server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    generateToken,
    auth,
    authorize,
    checkRepairOwnership,
    JWT_SECRET,
    TOKEN_EXPIRY
}; 