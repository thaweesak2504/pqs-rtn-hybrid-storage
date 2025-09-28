# PQS RTN Tauri Application

A modern desktop application built with Tauri, React, TypeScript, and Tailwind CSS for the Royal Thai Navy's PQS (Personnel Qualification Standards) system.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure login system with role-based access control
- **Dashboard**: Comprehensive admin dashboard with user management
- **Database Integration**: SQLite database with Tauri backend
- **Avatar Management**: Upload, edit, and manage user avatars
- **Responsive Design**: Works seamlessly across different screen sizes

### Technical Features
- **Reusable Layout Components**: BaseLayout system for consistent UI
- **Right Slide Panel**: User profile management panel
- **Dark Mode Support**: Toggle between light and dark themes
- **Window Controls**: Native window management (minimize, maximize, close)
- **Audio Integration**: Built-in audio player for navy songs
- **Search Functionality**: Global search across the application

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **Tauri** for desktop application framework
- **Rust** for backend logic
- **SQLite** for data storage
- **rusqlite** for database operations

### Development Tools
- **ESLint** for code linting
- **TypeScript** for type safety
- **PostCSS** for CSS processing

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- Rust (latest stable version)
- Git

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pqs-rtn-tauri
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Rust dependencies**
   ```bash
   cd src-tauri
   cargo build
   cd ..
   ```

4. **Run the development server**
   ```bash
   npm run tauri:dev
   ```

## 🏗️ Project Structure

```
pqs-rtn-tauri/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── ui/                  # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── forms/               # Form components
│   │   └── search/              # Search components
│   ├── contexts/                # React contexts
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # API services
│   ├── types/                   # TypeScript type definitions
│   ├── utils/                   # Utility functions
│   └── assets/                  # Static assets
├── src-tauri/                   # Tauri backend
│   ├── src/                     # Rust source code
│   ├── icons/                   # Application icons
│   └── Cargo.toml              # Rust dependencies
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

## 🎯 Key Components

### Layout System
- **BaseLayout**: Reusable layout component with props-based customization
- **PqsLayout**: Standard layout for public pages
- **DashboardLayout**: Enhanced layout with right slide panel for authenticated users

### Authentication
- **AuthContext**: Manages user authentication state
- **SignInPage**: User login interface
- **User Profile Panel**: Right slide panel for user management

### Database
- **SQLite Integration**: Local database for user data and avatars
- **Tauri Commands**: Rust backend commands for database operations
- **User Management**: CRUD operations for user accounts

## 🔧 Development

### Available Scripts

- `npm run dev` - Start Vite development server
- `npm run tauri:dev` - Start Tauri development mode
- `npm run tauri:build` - Build the application for production
- `npm run lint` - Run ESLint

### Code Organization

The project follows a modular architecture:

1. **Components**: Organized by functionality (ui, pages, forms)
2. **Contexts**: Global state management
3. **Hooks**: Reusable logic
4. **Services**: API and data layer
5. **Types**: TypeScript definitions

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Toggle between light and dark themes
- **Smooth Animations**: CSS transitions and React transitions
- **Accessibility**: ARIA labels and keyboard navigation
- **Thai Language Support**: Full Thai language interface

## 🔐 Security

- **Local Database**: SQLite for secure data storage
- **Authentication**: Secure user authentication system
- **Role-based Access**: Different access levels for users
- **Input Validation**: Client and server-side validation

## 📱 Platform Support

- **Windows**: Full support with native window controls
- **macOS**: Compatible (may need additional configuration)
- **Linux**: Compatible (may need additional configuration)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Development Team**: PQS RTN Development Team
- **Project Lead**: Royal Thai Navy IT Department

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for the Royal Thai Navy**
