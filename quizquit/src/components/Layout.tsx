import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { LogOut, Home, Trophy, User as UserIcon, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  user: User;
  profile: UserProfile | null;
}

export default function Layout({ user, profile }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { path: '/profile', icon: UserIcon, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-neutral-900 tracking-tight">QuizQuit</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'text-indigo-600'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-neutral-900">{profile?.username}</span>
              <span className="text-xs text-neutral-500">{profile?.totalScore} Points</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-neutral-500 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="bg-white border-t border-neutral-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-neutral-500 text-sm">
          &copy; {new Date().getFullYear()} QuizQuit. All rights reserved.
        </div>
      </footer>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 h-16 flex items-center justify-around z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-colors ${
              location.pathname === item.path ? 'text-indigo-600' : 'text-neutral-500'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
