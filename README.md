# Car Repair Tracking System

A modern, full-stack web application for managing car repair services. Built with Node.js, Express, MongoDB, and vanilla JavaScript, featuring a beautiful glassmorphism UI design.

## 🌟 Features

### Authentication & Authorization
- Secure user authentication with JWT
- Role-based access control (Admin, Technician, Customer)
- Protected API endpoints
- Session management
- Password encryption with bcrypt

### Repair Management
- Create, read, update, and delete repair records
- Track repair status (Pending, In Progress, Completed)
- Assign technicians to repairs
- Manage repair costs (estimated and actual)
- Add detailed repair notes and descriptions
- Upload and manage repair images
- Search and filter repairs by status, customer, or vehicle

### Customer Management
- Customer registration and profile management
- Vehicle information tracking
- Repair history per customer
- Contact information management

### Dashboard & Analytics
- Real-time repair statistics
- Monthly repair trends
- Cost tracking and analysis
- Status distribution visualization
- Performance metrics for technicians

### User Interface
- Responsive design with glassmorphism UI
- Modern animations and transitions
- Intuitive navigation
- Real-time updates
- Offline support with data synchronization
- Mobile-friendly interface

## 🛠️ Technical Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Security:** bcryptjs for password hashing
- **API:** RESTful architecture

### Frontend
- **Core:** Vanilla JavaScript (ES6+)
- **Styling:** Modern CSS3 with custom properties
- **Icons:** Font Awesome
- **Charts:** Chart.js for data visualization
- **Storage:** LocalStorage for offline support
- **UI Components:** Custom-built with modern design patterns

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager
- Modern web browser with JavaScript enabled

## 🚀 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd car-repair
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

4. Start MongoDB:
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo service mongod start
```

5. Start the application:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

6. Access the application:
```
http://localhost:3000
```

## 📁 Project Structure

```
car-repair/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── login.html         # Login page
│   ├── css/              # Stylesheets
│   │   └── styles.css    # Main CSS file
│   ├── js/               # Frontend JavaScript
│   │   ├── app.js        # Main application logic
│   │   ├── auth.js       # Authentication handling
│   │   └── ui.js         # UI components
│   └── uploads/          # Uploaded repair images
├── models/                # Database models
│   ├── User.js           # User model
│   └── Repair.js         # Repair model
├── middleware/           # Custom middleware
│   └── auth.js          # Authentication middleware
├── server.js            # Express server and API
├── package.json         # Project dependencies
└── README.md           # Documentation
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/customers` - Get customer list
- `DELETE /api/users/:id` - Delete user (admin only)

### Repairs
- `GET /api/repairs` - Get all repairs
- `POST /api/repairs` - Create new repair
- `GET /api/repairs/:id` - Get single repair
- `PUT /api/repairs/:id` - Update repair
- `DELETE /api/repairs/:id` - Delete repair (admin only)

### Statistics
- `GET /api/stats` - Get repair statistics (admin only)

### File Upload
- `POST /api/uploads` - Upload repair images
- `DELETE /api/uploads/:filename` - Delete uploaded file

## 🔒 Security Features

- JWT-based authentication
- Password encryption
- Role-based access control
- Protected API endpoints
- Secure file upload handling
- Input validation and sanitization
- CORS protection
- Rate limiting

## 📱 Offline Support

- Local storage for offline data
- Automatic synchronization when online
- Conflict resolution
- Data persistence
- Background sync

## 🧪 Development

### Running Tests
```bash
# Coming soon
npm test
```

### Code Style
- Follow JavaScript Standard Style
- Use ESLint for code linting
- Write meaningful commit messages

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Font Awesome for icons
- Chart.js for data visualization
- MongoDB for database
- Express.js team for the framework 