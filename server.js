const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const User = require('./models/User');
const { auth, authorize, generateToken, checkRepairOwnership } = require('./middleware/auth');
const Repair = require('./models/Repair');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// File upload endpoint
app.post('/api/uploads', upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const fileUrls = req.files.map(file => ({
            url: `/uploads/${file.filename}`,
            filename: file.filename
        }));

        res.json({ files: fileUrls });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error uploading files' });
    }
});

// Delete file endpoint
app.delete('/api/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'public/uploads', filename);

    fs.unlink(filepath, (err) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).json({ error: 'Error deleting file' });
        }
        res.json({ message: 'File deleted successfully' });
    });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('Registration failed: Email already exists');
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Create new user
        const user = new User({
            name,
            email,
            password,
            username: email.split('@')[0], // Generate username from email
            role: 'customer', // Default role
            phone: req.body.phone || '' // Optional phone number
        });

        console.log('Creating new user:', { name, email, role: user.role });
        await user.save();
        console.log('User created successfully:', user._id);

        const token = generateToken(user);
        console.log('Token generated for new user');

        res.status(201).json({
            user: user.getPublicProfile(),
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ 
            message: error.message,
            details: error.stack
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email });

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            console.log('Login failed: User not found');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('Login failed: Invalid password');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user);
        console.log('Login successful:', { userId: user._id });

        res.json({
            user: user.getPublicProfile(),
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Protected Routes
app.get('/api/auth/me', auth, async (req, res) => {
    try {
        console.log('Token verification request:', { 
            userId: req.user._id,
            role: req.user.role 
        });
        // Return user data without sensitive information
        res.json(req.user.getPublicProfile());
    } catch (error) {
        console.error('Error in /api/auth/me:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// User management routes (admin only)
app.get('/api/users', auth, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/users/:id', auth, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get customers list (admin/technician only)
app.get('/api/users/customers', auth, authorize('admin', 'technician'), async (req, res) => {
    try {
        console.log('Fetching customers...', { 
            userId: req.user._id,
            userRole: req.user.role,
            token: req.token ? 'present' : 'missing'
        });

        // First check if there are any users at all
        const totalUsers = await User.countDocuments();
        console.log('Total users in database:', totalUsers);

        const customers = await User.find({ role: 'customer' })
            .select('_id name phone email')
            .sort({ name: 1 });
        
        console.log('Found customers:', {
            count: customers.length,
            customers: customers.map(c => ({
                id: c._id,
                name: c.name,
                email: c.email,
                phone: c.phone || 'no phone'
            }))
        });

        if (customers.length === 0) {
            console.log('No customers found in database');
            // Return empty array instead of error
            return res.json([]);
        }

        res.json(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ 
            error: 'Failed to fetch customers',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Debug endpoint to check database status (temporary)
app.get('/api/debug/users', auth, authorize('admin'), async (req, res) => {
    try {
        const allUsers = await User.find({}).select('-password');
        const userCounts = {
            total: allUsers.length,
            byRole: {
                admin: allUsers.filter(u => u.role === 'admin').length,
                technician: allUsers.filter(u => u.role === 'technician').length,
                customer: allUsers.filter(u => u.role === 'customer').length
            },
            users: allUsers.map(u => ({
                id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                phone: u.phone
            }))
        };
        res.json(userCounts);
    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update repair routes to include authentication
app.get('/api/repairs', auth, async (req, res) => {
    try {
        let query = {};
        
        // Filter repairs based on user role
        if (req.user.role === 'customer') {
            query.customerId = req.user._id;
        } else if (req.user.role === 'technician') {
            query.assignedTechnician = req.user.name;
        }

        const repairs = await Repair.find(query).sort({ createdAt: -1 });
        res.json(repairs);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add route for getting a single repair
app.get('/api/repairs/:id', auth, checkRepairOwnership, async (req, res) => {
    try {
        console.log('Fetching repair with ID:', req.params.id);
        console.log('User requesting repair:', req.user._id);

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            console.log('Invalid ObjectId format:', req.params.id);
            return res.status(400).json({ 
                error: 'Invalid repair ID format',
                details: 'The provided ID is not a valid MongoDB ObjectId'
            });
        }

        const repair = await Repair.findById(req.params.id);
        console.log('Repair found:', repair ? 'Yes' : 'No');

        if (!repair) {
            console.log('Repair not found for ID:', req.params.id);
            return res.status(404).json({ 
                error: 'Repair not found',
                details: 'No repair exists with the provided ID'
            });
        }

        // Log repair ownership check
        console.log('Repair customerId:', repair.customerId);
        console.log('Requesting user ID:', req.user._id);
        console.log('User role:', req.user.role);

        res.json(repair);
    } catch (error) {
        console.error('Error in GET /api/repairs/:id:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ 
                error: 'Invalid repair ID format',
                details: error.message
            });
        }

        res.status(500).json({ 
            error: 'Server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Export repairs route
app.get('/api/repairs/export', auth, async (req, res) => {
    try {
        let query = {};
        
        // Filter repairs based on user role
        if (req.user.role === 'customer') {
            query.customerId = req.user._id;
        } else if (req.user.role === 'technician') {
            query.assignedTechnician = req.user.name;
        }

        const repairs = await Repair.find(query)
            .select('-__v') // Exclude version field
            .sort({ createdAt: -1 });

        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=repairs-export-${new Date().toISOString().split('T')[0]}.json`);
        
        res.json(repairs);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export repairs' });
    }
});

// Create new repair
app.post('/api/repairs', auth, async (req, res) => {
    try {
        console.log('Creating new repair:', { 
            userRole: req.user.role,
            hasCustomerId: !!req.body.customerId 
        });

        const repairData = {
            ...req.body,
            // Only set customerId if provided, otherwise use the logged-in user's ID
            customerId: req.body.customerId || req.user._id,
            // If no customerId provided, use the logged-in user's info
            customerName: req.body.customerName || req.user.name,
            customerPhone: req.body.customerPhone || req.user.phone || ''
        };

        const repair = new Repair(repairData);
        await repair.save();
        
        console.log('Repair created successfully:', repair._id);
        res.status(201).json(repair);
    } catch (error) {
        console.error('Error creating repair:', error);
        res.status(400).json({ 
            error: 'Failed to create repair',
            details: error.message
        });
    }
});

app.put('/api/repairs/:id', auth, checkRepairOwnership, async (req, res) => {
    try {
        const repair = await Repair.findById(req.params.id);
        
        // Only allow status updates for technicians
        if (req.user.role === 'technician') {
            const allowedUpdates = ['status', 'actualCost', 'notes'];
            Object.keys(req.body).forEach(key => {
                if (!allowedUpdates.includes(key)) {
                    delete req.body[key];
                }
            });
        }

        Object.assign(repair, req.body);
        await repair.save();
        res.json(repair);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/repairs/:id', auth, authorize('admin'), async (req, res) => {
    try {
        const repair = await Repair.findByIdAndDelete(req.params.id);
        if (!repair) {
            return res.status(404).json({ error: 'Repair not found' });
        }
        res.json({ message: 'Repair deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Stats route (admin only)
app.get('/api/stats', auth, authorize('admin'), async (req, res) => {
    try {
        const stats = await Repair.aggregate([
            {
                $group: {
                    _id: null,
                    totalRepairs: { $sum: 1 },
                    totalEstimatedCost: { $sum: '$estimatedCost' },
                    totalActualCost: { $sum: { $ifNull: ['$actualCost', 0] } },
                    pendingCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    inProgressCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
                    },
                    completedCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Get monthly repair counts for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyStats = await Repair.aggregate([
            {
                $match: {
                    createdDate: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdDate' },
                        month: { $month: '$createdDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Format monthly stats
        const monthlyData = monthlyStats.map(stat => ({
            month: new Date(stat._id.year, stat._id.month - 1).toLocaleString('default', { month: 'short' }),
            count: stat.count
        }));

        res.json({
            ...stats[0],
            monthlyData
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://dumanmurat9:L4G3fx2CYd3Una36@cluster0.xzbrgw5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
    
    // Start server only after successful database connection
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
})
.catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit if cannot connect to database
}); 