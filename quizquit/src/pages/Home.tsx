import { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Subject, UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, BookOpen, Code, Globe, FlaskConical, Calculator, 
  Music, Palette, History, Zap, Dna, Map, Trophy, Cpu, 
  Book, TrendingUp, Brain, Search, X, RefreshCw 
} from 'lucide-react';
import { INITIAL_SUBJECTS } from '../constants/subjects';

const iconMap: Record<string, any> = {
  'BookOpen': BookOpen,
  'Code': Code,
  'Globe': Globe,
  'FlaskConical': FlaskConical,
  'Calculator': Calculator,
  'Music': Music,
  'Palette': Palette,
  'History': History,
  'Zap': Zap,
  'Dna': Dna,
  'Map': Map,
  'Trophy': Trophy,
  'Cpu': Cpu,
  'Book': Book,
  'TrendingUp': TrendingUp,
  'Brain': Brain,
};

interface HomeProps {
  profile: UserProfile | null;
}

export default function Home({ profile }: HomeProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  const isAdmin = auth.currentUser?.email === 'gopichnadunukala@gmail.com';

  const fetchSubjects = async () => {
    const querySnapshot = await getDocs(collection(db, 'subjects'));
    const subjectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
    setSubjects(subjectsData);
    setLoading(false);
  };

  useEffect(() => {
    const fetchAndAutoSync = async () => {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      
      // Auto-sync for admin if subjects are missing or count is wrong
      if (isAdmin && subjectsData.length !== INITIAL_SUBJECTS.length) {
        console.log('Auto-syncing subjects for admin...');
        const batch = writeBatch(db);
        
        // Delete existing to ensure clean state if count is wrong
        if (subjectsData.length > 0) {
          querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
        }

        for (const sub of INITIAL_SUBJECTS) {
          const id = sub.name.toLowerCase().replace(/\s+/g, '-');
          const subRef = doc(db, 'subjects', id);
          batch.set(subRef, sub);
        }
        
        await batch.commit();
        // Re-fetch after sync
        const updatedSnapshot = await getDocs(collection(db, 'subjects'));
        const updatedData = updatedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
        setSubjects(updatedData);
      } else {
        setSubjects(subjectsData);
      }
      
      setLoading(false);
    };

    fetchAndAutoSync();
  }, [isAdmin]);

  const syncSubjects = async () => {
    if (!isAdmin) return;
    if (!window.confirm('This will replace the current subjects list with the new 7 subjects. Continue?')) return;
    
    setSyncing(true);
    try {
      // 1. Fetch all current subjects
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      
      // 2. Delete all existing subjects
      const deleteBatch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();

      // 3. Add the new 7 subjects
      const addBatch = writeBatch(db);
      for (const sub of INITIAL_SUBJECTS) {
        const id = sub.name.toLowerCase().replace(/\s+/g, '-');
        const subRef = doc(db, 'subjects', id);
        addBatch.set(subRef, sub);
      }
      await addBatch.commit();
      
      await fetchSubjects();
      alert('Subjects list updated to the requested 7 topics!');
    } catch (error) {
      console.error('Error syncing subjects:', error);
      alert('Failed to sync subjects.');
    } finally {
      setSyncing(false);
    }
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-neutral-100"></div>
        ))}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200">
        <BookOpen className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-neutral-900">No Subjects Found</h2>
        <p className="text-neutral-500 mt-2">The database is currently empty.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="px-4 py-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 leading-none">Total Score</span>
                <span className="text-xl font-black leading-none">{profile?.totalScore || 0}</span>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={syncSubjects}
                disabled={syncing}
                className="p-2 text-neutral-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                title="Sync Subjects Data"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Select a Subject</h1>
          <p className="text-neutral-500 mt-2">Choose a topic to start your quiz journey. Each subject has 10 levels of increasing difficulty.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200">
          <Search className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-neutral-900">No matches found</h3>
          <p className="text-neutral-500 mt-1">Try searching for a different keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredSubjects.map((subject, index) => {
              const Icon = iconMap[subject.icon || 'BookOpen'] || BookOpen;
              return (
                <motion.div
                  key={subject.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => navigate(`/subject/${subject.id}`)}
                  className="group bg-white p-6 rounded-2xl border border-neutral-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">{subject.name}</h3>
                  <p className="text-sm text-neutral-500 line-clamp-2 mb-6 flex-grow">{subject.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-neutral-100 rounded-md text-neutral-500">
                      10 Levels
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                      subject.difficulty === 'Beginner' ? 'bg-green-50 text-green-700 border border-green-100' :
                      subject.difficulty === 'Intermediate' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                      subject.difficulty === 'Expert' ? 'bg-red-50 text-red-700 border border-red-100' :
                      'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}>
                      {subject.difficulty || 'Unrated'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
