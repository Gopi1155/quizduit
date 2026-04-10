import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Subject, UserProfile } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Lock, CheckCircle2 } from 'lucide-react';

export default function LevelSelection() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId || !auth.currentUser) return;
      
      const subjectRef = doc(db, 'subjects', subjectId);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      const [subjectSnap, userSnap] = await Promise.all([
        getDoc(subjectRef),
        getDoc(userRef)
      ]);

      if (subjectSnap.exists()) {
        setSubject({ id: subjectSnap.id, ...subjectSnap.data() } as Subject);
      }
      if (userSnap.exists()) {
        setProfile(userSnap.data() as UserProfile);
      }
      setLoading(false);
    };
    fetchData();
  }, [subjectId]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 bg-neutral-200 rounded"></div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-neutral-100"></div>)}
      </div>
    </div>;
  }

  const completedLevel = (profile?.progress && subjectId) ? (profile.progress[subjectId] || 0) : 0;

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => selectedLevel ? setSelectedLevel(null) : navigate('/')} 
          className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-neutral-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            {subject?.name} {selectedLevel ? `- Level ${selectedLevel}` : ''}
          </h1>
          <p className="text-neutral-500">
            {selectedLevel ? 'Select a round to begin.' : 'Select a level to begin your challenge.'}
          </p>
        </div>
      </div>

      {!selectedLevel ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => {
            const levelNum = i + 1;
            const isLocked = levelNum > completedLevel + 1;
            const isCompleted = levelNum <= completedLevel;
            
            return (
              <motion.div
                key={levelNum}
                whileHover={!isLocked ? { scale: 1.05 } : {}}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                onClick={() => !isLocked && setSelectedLevel(levelNum)}
                className={`relative p-6 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isLocked 
                    ? 'bg-neutral-50 border-neutral-100 text-neutral-300 cursor-not-allowed' 
                    : 'bg-white border-neutral-200 hover:border-indigo-500 text-neutral-900 shadow-sm hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                  isLocked ? 'bg-neutral-100' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {isLocked ? <Lock className="w-5 h-5" /> : levelNum}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Level</span>
                
                {isCompleted && (
                  <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-green-500" />
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
          {[1, 2, 3].map((roundNum) => (
            <motion.div
              key={roundNum}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/quiz/${subjectId}/${selectedLevel}/${roundNum}`)}
              className="bg-white p-8 rounded-3xl border-2 border-neutral-200 hover:border-indigo-500 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <span className="text-xl font-black">{roundNum}</span>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-1">Round {roundNum}</h3>
              <p className="text-sm text-neutral-500">10 Questions • {roundNum === 1 ? 'Easy' : roundNum === 2 ? 'Medium' : 'Hard'}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
