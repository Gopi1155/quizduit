import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Question, Subject, Result, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Timer, ArrowRight, Trophy, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Round = 1 | 2 | 3;

export default function QuizPage() {
  const { subjectId, level, round } = useParams<{ subjectId: string; level: string; round: string }>();
  const navigate = useNavigate();
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const currentRound = parseInt(round || '1') as 1 | 2 | 3;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [quizState, setQuizState] = useState<'intro' | 'playing' | 'round_end'>('intro');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<{
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[]>([]);

  const generateDummyQuestions = (subjectName: string, levelNum: number, roundNum: number): Question[] => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `fallback-${Date.now()}-${i}`,
      text: `What is a key concept in ${subjectName} related to Round ${roundNum} difficulty? (Fallback Question ${i + 1})`,
      options: ["Core Principle", "Secondary Detail", "Advanced Theory", "Historical Context"],
      correctAnswer: "Core Principle",
      subjectId: subjectId!,
      level: levelNum,
      round: roundNum as 1 | 2 | 3
    }));
  };

  const generateQuestionsWithAI = async (subjectName: string, levelNum: number, roundNum: number, subjectDifficulty: string): Promise<Question[]> => {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing in both process.env and import.meta.env');
      throw new Error('AI configuration missing. Please ensure GEMINI_API_KEY is set in your secrets.');
    }

    const genAI = new GoogleGenAI({ apiKey });

    const difficultyContext = {
      1: 'Focus on fundamental concepts, basic definitions, and common knowledge. Questions should be straightforward and accessible to beginners.',
      2: 'Include more specific details, application of concepts, and intermediate complexity. Requires a solid understanding of the subject matter.',
      3: 'Challenge the user with advanced theories, complex problem solving, niche facts, and subtle nuances. Suitable for experts or advanced students.'
    }[roundNum as 1 | 2 | 3];

    const prompt = `Generate 10 unique multiple-choice questions for a quiz.
Subject: ${subjectName}
Subject Base Difficulty: ${subjectDifficulty || 'Intermediate'} (This is the overall complexity of the subject)
Level: ${levelNum} (1 is easiest, 10 is hardest)
Round: ${roundNum} (1 = Easy, 2 = Medium, 3 = Hard)
Context: ${difficultyContext}

The questions should be educational, accurate, and strictly follow the specified difficulty level, adjusted for the subject's base difficulty.
Return the questions in JSON format as an array of objects with the following structure:
{
  "text": "string",
  "options": ["string", "string", "string", "string"],
  "correctAnswer": "string" (must be one of the options)
}`;

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            minItems: 10,
            maxItems: 10,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
                correctAnswer: { type: Type.STRING }
              },
              required: ["text", "options", "correctAnswer"]
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      const generatedQuestions: Question[] = [];

      for (const qData of data) {
        const newQ = {
          ...qData,
          subjectId: subjectId!,
          level: levelNum,
          round: roundNum as 1 | 2 | 3
        };
        const docRef = await addDoc(collection(db, 'questions'), newQ);
        generatedQuestions.push({ id: docRef.id, ...newQ });
      }

      return generatedQuestions;
    } catch (error) {
      console.error('AI Generation Error:', error);
      // Fallback to dummy questions if AI fails
      return generateDummyQuestions(subjectName, levelNum, roundNum);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId) return;
      
      try {
        const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
        let currentSubject: Subject | null = null;
        if (subjectDoc.exists()) {
          currentSubject = { id: subjectDoc.id, ...subjectDoc.data() } as Subject;
          setSubject(currentSubject);
        }

        const q = query(
          collection(db, 'questions'),
          where('subjectId', '==', subjectId),
          where('level', '==', parseInt(level || '1')),
          where('round', '==', currentRound)
        );
        const querySnapshot = await getDocs(q);
        let questionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));

        // Detect if we need to regenerate (no questions, wrong count, or dummy questions)
        const isDummy = questionsData.length !== 10 || 
          (questionsData.length > 0 && (
            (questionsData[0].text.includes('Question') && 
             questionsData[0].text.includes('Level') && 
             questionsData[0].text.includes('subject?')) ||
            (questionsData[0].text.includes('Fallback Question'))
          ));

        if (isDummy) {
          console.log('Dummy questions detected, triggering AI generation...');
          if (currentSubject) {
            setGenerating(true);
            try {
              // Delete old dummy questions first if they exist
              if (questionsData.length > 0) {
                const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');
                for (const qDoc of querySnapshot.docs) {
                  await deleteDoc(firestoreDoc(db, 'questions', qDoc.id));
                }
              }

              questionsData = await generateQuestionsWithAI(currentSubject.name, parseInt(level || '1'), currentRound, currentSubject.difficulty);
            } catch (e) {
              console.error('AI Fallback failed', e);
            } finally {
              setGenerating(false);
            }
          }
        }

        setQuestions(questionsData);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'questions');
      }
    };

    fetchData();
  }, [subjectId, level, currentRound]);

  useEffect(() => {
    let timer: any;
    if (quizState === 'playing' && timeLeft > 0 && !selectedOption) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && !selectedOption) {
      handleAnswer('');
    }
    return () => clearInterval(timer);
  }, [quizState, timeLeft, selectedOption]);

  const handleStart = () => {
    setQuizState('playing');
    setTimeLeft(30);
  };

  const handleAnswer = (option: string) => {
    if (selectedOption) return;
    
    setSelectedOption(option);
    const correct = option === questions[currentIndex].correctAnswer;
    setIsCorrect(correct);
    
    // Track answer
    setUserAnswers(prev => [...prev, {
      question: questions[currentIndex].text,
      userAnswer: option,
      correctAnswer: questions[currentIndex].correctAnswer,
      isCorrect: correct
    }]);

    let newScore = score;
    if (correct) {
      newScore = score + 1;
      setScore(newScore);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
        setTimeLeft(30);
      } else {
        setQuizState('round_end');
        handleRoundEnd(newScore);
      }
    }, 1500);
  };

  const handleRoundEnd = async (finalScore: number) => {
    if (!auth.currentUser || !subject) return;

    const passed = finalScore >= 7;

    try {
      const resultData: Omit<Result, 'id'> = {
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        subjectId: subject.id,
        subjectName: subject.name,
        level: parseInt(level || '1'),
        round: currentRound,
        score: finalScore,
        timestamp: serverTimestamp(),
      };
      
      // Perform Firestore updates
      await addDoc(collection(db, 'results'), resultData);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        totalScore: increment(resultData.score)
      });

      // Update leaderboards
      const lbRef = doc(db, `leaderboards/overall/rankings`, auth.currentUser.uid);
      const lbDoc = await getDoc(lbRef);
      if (lbDoc.exists()) {
        await updateDoc(lbRef, {
          score: increment(resultData.score),
          lastUpdated: serverTimestamp()
        });
      } else {
        await setDoc(lbRef, {
          userId: auth.currentUser.uid,
          username: auth.currentUser.displayName || 'Anonymous',
          photoURL: auth.currentUser.photoURL || null,
          score: resultData.score,
          lastUpdated: serverTimestamp()
        });
      }

      const subLbRef = doc(db, `leaderboards/${subject.id}/rankings`, auth.currentUser.uid);
      const subLbDoc = await getDoc(subLbRef);
      if (subLbDoc.exists()) {
        await updateDoc(subLbRef, {
          score: increment(resultData.score),
          lastUpdated: serverTimestamp()
        });
      } else {
        await setDoc(subLbRef, {
          userId: auth.currentUser.uid,
          username: auth.currentUser.displayName || 'Anonymous',
          photoURL: auth.currentUser.photoURL || null,
          score: resultData.score,
          lastUpdated: serverTimestamp()
        });
      }

      if (currentRound === 3 && passed) {
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data() as UserProfile;
        const currentProgress = userData.progress || {};
        const highestLevel = currentProgress[subject.id] || 0;
        const levelNum = parseInt(level || '1');
        
        if (levelNum > highestLevel) {
          await updateDoc(userRef, {
            [`progress.${subject.id}`]: levelNum
          });
        }
      }

      // Fetch updated total points from server to ensure fresh data
      const updatedUserDoc = await getDocFromServer(userRef);
      if (updatedUserDoc.exists()) {
        setTotalPoints(updatedUserDoc.data().totalScore || 0);
      }
    } catch (error) {
      console.error("Error saving quiz results:", error);
      // We don't throw here to avoid breaking the UI transition
      // But we still log it for debugging
    }
  };

  const restartRound = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setUserAnswers([]);
    setScore(0);
    setQuizState('intro');
  };

  const nextRound = () => {
    if (currentRound < 3) {
      navigate(`/quiz/${subjectId}/${level}/${currentRound + 1}`);
    } else {
      navigate(`/subject/${subjectId}`);
    }
  };

  if (loading || generating) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative">
          <motion.div 
            className="w-20 h-20 border-4 border-neutral-100 border-t-indigo-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          {generating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
            </motion.div>
          )}
        </div>
        <h2 className="text-xl font-bold text-neutral-900 mt-6">
          {generating ? 'AI is generating real questions...' : 'Loading Quiz...'}
        </h2>
        <p className="text-neutral-500 mt-2 text-center max-w-xs">
          {generating 
            ? 'We are using Gemini AI to create unique questions for this subject and level.' 
            : 'Preparing your challenge...'}
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200">
        <AlertCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-neutral-900">No Questions Found</h2>
        <p className="text-neutral-500 mt-2">We couldn't find any questions for this level and round.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {quizState === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="bg-white p-10 rounded-3xl border border-neutral-200 text-center shadow-xl shadow-neutral-200/50"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold mb-6">
              Level {level} • {currentRound} Round
            </div>
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">{subject?.name}</h1>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto">
              You'll have 30 seconds for each of the 10 questions. Get ready to test your knowledge!
            </p>
            <button
              onClick={handleStart}
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200"
            >
              Start Quiz
            </button>
          </motion.div>
        )}

        {quizState === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-neutral-100 flex items-center justify-center relative">
                  <Timer className={`w-5 h-5 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-neutral-400'}`} />
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="24" cy="24" r="20"
                      fill="none" stroke="currentColor" strokeWidth="4"
                      className="text-indigo-600"
                      strokeDasharray={125.6}
                      strokeDashoffset={125.6 * (1 - timeLeft / 30)}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Time Left</div>
                  <div className={`text-xl font-black ${timeLeft < 10 ? 'text-red-500' : 'text-neutral-900'}`}>{timeLeft}s</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Question</div>
                <div className="text-xl font-black text-neutral-900">{currentIndex + 1} / {questions.length}</div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-lg shadow-neutral-200/50">
              <h2 className="text-2xl font-bold text-neutral-900 mb-8 leading-tight">
                {questions[currentIndex].text}
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {questions[currentIndex].options.map((option, i) => {
                  const isSelected = selectedOption === option;
                  const isCorrectOption = option === questions[currentIndex].correctAnswer;
                  
                  let buttonClass = "w-full p-5 rounded-2xl border-2 text-left font-semibold transition-all flex items-center justify-between ";
                  if (!selectedOption) {
                    buttonClass += "border-neutral-100 hover:border-indigo-600 hover:bg-indigo-50 text-neutral-700";
                  } else if (isSelected) {
                    buttonClass += isCorrect ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700";
                  } else if (isCorrectOption && selectedOption) {
                    buttonClass += "border-green-500 bg-green-50 text-green-700";
                  } else {
                    buttonClass += "border-neutral-100 text-neutral-400 opacity-50";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(option)}
                      disabled={!!selectedOption}
                      className={buttonClass}
                    >
                      <span>{option}</span>
                      {selectedOption && isCorrectOption && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                      {selectedOption && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {quizState === 'round_end' && (
          <motion.div
            key="round_end"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 sm:p-10 rounded-3xl border border-neutral-200 text-center shadow-xl shadow-neutral-200/50 max-w-4xl w-full mx-auto"
          >
            {score >= 7 ? (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-neutral-900 mb-2">Round {currentRound} Passed!</h2>
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="flex items-baseline gap-1">
                    <p className="text-7xl font-black text-indigo-600">{score}</p>
                    <p className="text-2xl font-bold text-neutral-400">/ 10</p>
                  </div>
                  <p className="text-neutral-500 font-medium text-lg">Excellent work! You've mastered this round.</p>
                  
                  {totalPoints !== null ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-4 p-6 bg-indigo-50 rounded-3xl border-2 border-indigo-100 flex flex-col items-center gap-1 shadow-sm"
                    >
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Global Total Points</span>
                      <span className="text-4xl font-black text-indigo-700">{totalPoints}</span>
                      <div className="flex items-center gap-1 text-green-600 font-bold text-sm mt-1">
                        <ArrowRight className="w-4 h-4 -rotate-45" />
                        <span>+{score} points earned</span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="mt-4 p-6 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200 flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-neutral-300 border-t-indigo-600 rounded-full animate-spin" />
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest italic">Updating Total Points...</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-3xl font-bold text-neutral-900 mb-2">Round {currentRound} Failed</h2>
                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="flex items-baseline gap-1">
                    <p className="text-7xl font-black text-red-600">{score}</p>
                    <p className="text-2xl font-bold text-neutral-400">/ 10</p>
                  </div>
                  <p className="text-neutral-500 font-medium text-lg">You need at least 7 correct answers to proceed.</p>
                  
                  {totalPoints !== null ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-4 p-6 bg-neutral-50 rounded-3xl border-2 border-neutral-100 flex flex-col items-center gap-1 shadow-sm"
                    >
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Global Total Points</span>
                      <span className="text-4xl font-black text-neutral-700">{totalPoints}</span>
                      <div className="flex items-center gap-1 text-neutral-500 font-bold text-sm mt-1">
                        <span>+{score} points added</span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="mt-4 p-6 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200 flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-neutral-300 border-t-indigo-600 rounded-full animate-spin" />
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest italic">Updating Total Points...</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="mb-8 overflow-hidden rounded-2xl border border-neutral-100 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Question</th>
                      <th className="px-4 py-3">Your Answer</th>
                      <th className="px-4 py-3">Correct Answer</th>
                      <th className="px-4 py-3 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {userAnswers.map((answer, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-4 font-medium text-neutral-900 max-w-xs">{answer.question}</td>
                        <td className={`px-4 py-4 ${answer.isCorrect ? 'text-green-600' : 'text-red-600'} font-medium`}>
                          {answer.userAnswer || 'Timed Out'}
                        </td>
                        <td className="px-4 py-4 text-neutral-600 font-medium">{answer.correctAnswer}</td>
                        <td className="px-4 py-4 text-center">
                          {answer.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/')}
                className="py-4 bg-white border-2 border-neutral-200 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
              >
                Exit to Dashboard
              </button>
              
              <button
                onClick={() => navigate(`/subject/${subjectId}`)}
                className="py-4 bg-white border-2 border-neutral-200 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-50 transition-all"
              >
                Back to Levels
              </button>

              {score >= 7 ? (
                <button
                  onClick={nextRound}
                  className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  {currentRound === 3 ? 'Finish Level' : 'Next Round'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={restartRound}
                  className="py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Restart Round
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
