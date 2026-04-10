import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Subject } from '../types';
import { User as UserIcon, Calendar, Trophy, Mail, BookOpen, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfilePageProps {
  profile: UserProfile | null;
}

export default function ProfilePage({ profile }: ProfilePageProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      setSubjects(subjectsData);
    };
    fetchSubjects();
  }, []);

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xl shadow-neutral-200/50"
      >
        <div className="h-32 bg-indigo-600 relative">
          <div className="absolute -bottom-12 left-8">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.username}
                className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-4 border-white bg-neutral-100 flex items-center justify-center text-neutral-400 shadow-lg">
                <UserIcon className="w-10 h-10" />
              </div>
            )}
          </div>
        </div>

        <div className="pt-16 pb-10 px-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{profile.username}</h1>
              <p className="text-neutral-500 flex items-center gap-1 mt-1">
                <Mail className="w-4 h-4" />
                {profile.email}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-indigo-600">{profile.totalScore}</div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Points</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl text-neutral-400 shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Joined</div>
                <div className="font-bold text-neutral-900">
                  {profile.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : 'Recently'}
                </div>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl text-neutral-400 shadow-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Rank</div>
                <div className="font-bold text-neutral-900">Top 1%</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          Subject Progress
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map((subject) => {
            const completed = profile.progress?.[subject.id] || 0;
            const percentage = (completed / 10) * 100;

            return (
              <div key={subject.id} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-neutral-900">{subject.name}</h3>
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    Level {completed}/10
                  </div>
                </div>
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Progress</span>
                  <span>{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
