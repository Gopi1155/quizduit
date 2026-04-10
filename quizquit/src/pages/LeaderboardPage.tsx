import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { LeaderboardEntry, Subject } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, User as UserIcon, Filter, Globe } from 'lucide-react';

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('overall');
  const [loading, setLoading] = useState(true);
  const [loadingRankings, setLoadingRankings] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      setSubjects(subjectsData);
      setLoading(false);
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchRankings = async () => {
      setLoadingRankings(true);
      const path = selectedSubjectId === 'overall' 
        ? 'leaderboards/overall/rankings' 
        : `leaderboards/${selectedSubjectId}/rankings`;
      
      const q = query(
        collection(db, path),
        orderBy('score', 'desc'),
        limit(50)
      );
      
      try {
        const querySnapshot = await getDocs(q);
        const rankingsData = querySnapshot.docs.map(doc => doc.data() as LeaderboardEntry);
        setRankings(rankingsData);
      } catch (error) {
        console.error("Error fetching rankings:", error);
        setRankings([]);
      } finally {
        setLoadingRankings(false);
      }
    };

    fetchRankings();
  }, [selectedSubjectId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-12 bg-white rounded-2xl animate-pulse border border-neutral-100"></div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-neutral-100"></div>
        ))}
      </div>
    );
  }

  const selectedSubjectName = selectedSubjectId === 'overall' 
    ? 'Global' 
    : subjects.find(s => s.id === selectedSubjectId)?.name || 'Subject';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10 text-center">
        <div className="inline-flex p-3 bg-yellow-50 rounded-2xl mb-4">
          <Trophy className="w-8 h-8 text-yellow-600" />
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">{selectedSubjectName} Leaderboard</h1>
        <p className="text-neutral-500 mt-2">
          {selectedSubjectId === 'overall' 
            ? 'The top performers across all subjects and levels.' 
            : `Top performers in ${selectedSubjectName}.`}
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setSelectedSubjectId('overall')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
            selectedSubjectId === 'overall'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
              : 'bg-white text-neutral-500 border-neutral-200 hover:border-indigo-300'
          }`}
        >
          <Globe className="w-4 h-4" />
          Overall
        </button>
        {subjects.map(subject => (
          <button
            key={subject.id}
            onClick={() => setSelectedSubjectId(subject.id)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${
              selectedSubjectId === subject.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                : 'bg-white text-neutral-500 border-neutral-200 hover:border-indigo-300'
            }`}
          >
            {subject.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xl shadow-neutral-200/50 min-h-[400px]">
        {loadingRankings ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="text-neutral-400 font-medium">Loading rankings...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {rankings.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-20 text-center text-neutral-400"
              >
                No rankings yet for this category. Be the first to join!
              </motion.div>
            ) : (
              <motion.div
                key={selectedSubjectId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="divide-y divide-neutral-100"
              >
                {rankings.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between p-5 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-8 text-center font-black text-neutral-400">
                        {index === 0 && <Medal className="w-6 h-6 text-yellow-500 mx-auto" />}
                        {index === 1 && <Medal className="w-6 h-6 text-neutral-300 mx-auto" />}
                        {index === 2 && <Medal className="w-6 h-6 text-amber-600 mx-auto" />}
                        {index > 2 && index + 1}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {entry.photoURL ? (
                          <img src={entry.photoURL} alt={entry.username} className="w-10 h-10 rounded-full border border-neutral-200" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                            <UserIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-neutral-900">{entry.username}</div>
                          <div className="text-xs text-neutral-500">
                            Last active {entry.lastUpdated?.toDate ? new Date(entry.lastUpdated.toDate()).toLocaleDateString() : 'Recently'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-indigo-600">{entry.score}</div>
                      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Points</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
