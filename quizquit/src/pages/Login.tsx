import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-neutral-200/50 p-8 border border-neutral-100"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-indigo-600 p-4 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Welcome to QuizQuit</h1>
          <p className="text-neutral-500 mt-2">Test your knowledge across multiple subjects and climb the leaderboard.</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-neutral-300 text-neutral-700 font-semibold py-3 px-4 rounded-xl hover:bg-neutral-50 transition-all active:scale-[0.98]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
          <p className="text-xs text-neutral-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
