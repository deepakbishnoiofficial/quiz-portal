# QuizMaster 🎯

A modern, full-featured quiz management platform built with React, TypeScript, and Supabase. Create, manage, and take quizzes with an intuitive interface designed for both educators and students.

## ✨ Features

### For Educators
- **Quiz Creation**: Create comprehensive quizzes with multiple question types
- **Admin Dashboard**: Manage all quizzes from a centralized dashboard
- **Analytics**: Track student performance and quiz statistics
- **Question Types**: Support for multiple choice, true/false, and short answer questions

### For Students
- **Interactive Quiz Taking**: Clean, distraction-free quiz interface
- **Student Dashboard**: View available quizzes and track progress
- **Real-time Results**: Instant feedback and detailed results
- **Progress Tracking**: Monitor performance across different categories

### General Features
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Authentication**: Secure user authentication with Supabase
- **Real-time Updates**: Live data synchronization
- **Mobile Responsive**: Works seamlessly on all devices

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI Components
- **Backend**: Supabase (Database + Authentication)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for analytics

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Supabase account (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grade-up-quizzes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── AdminDashboard.tsx
│   ├── QuizCreator.tsx
│   ├── QuizTaking.tsx
│   ├── StudentDashboard.tsx
│   ├── auth/            # Authentication components
│   └── ui/              # Reusable UI components
├── hooks/               # Custom React hooks
├── integrations/
│   └── supabase/        # Supabase configuration
├── lib/                 # Utility functions
├── pages/               # Page components
└── types/               # TypeScript type definitions
```

## 🎮 Usage

### Creating a Quiz
1. Navigate to the Admin Dashboard
2. Click "Create New Quiz"
3. Fill in quiz details (title, description, category, difficulty)
4. Add questions with various types
5. Set time limits and point values
6. Save and publish

### Taking a Quiz
1. Browse available quizzes from the Student Dashboard
2. Select a quiz to start
3. Answer questions within the time limit
4. View detailed results upon completion

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Radix UI](https://www.radix-ui.com/) for accessible UI components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Supabase](https://supabase.com/) for backend services
- [Lucide React](https://lucide.dev/) for beautiful icons

---

Built with ❤️ by Deepak Bishnoi