import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";
import { format, isToday, isPast, parseISO } from "date-fns";
import { Quiz } from "../types";
import { Calendar, Play, Trophy, Clock, ChevronRight, FileQuestion } from "lucide-react";
import { cn } from "../lib/utils";

export default function UserHome() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "quizzes"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Quiz[];
      
      // Filter out future quizzes for users
      const filtered = data.filter(quiz => isToday(parseISO(quiz.date)) || isPast(parseISO(quiz.date)));
      setQuizzes(filtered);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  const todayQuiz = quizzes.find(q => q.date === today);
  const pastQuizzes = quizzes.filter(q => q.date !== today);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-neutral-900">
          Daily Quiz <span className="text-amber-500">Challenge</span>
        </h1>
        <p className="text-neutral-500 max-w-lg mx-auto">
          Test your knowledge every day. Earn points, climb the leaderboard, and become a QuizMaster!
        </p>
      </div>

      {/* Today's Quiz */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <h2 className="text-xl font-bold">Today's Quiz</h2>
        </div>

        {todayQuiz ? (
          <div className="bg-neutral-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Trophy className="w-32 h-32" />
            </div>
            
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-amber-400 font-bold tracking-widest uppercase text-xs mb-2">Active Now</p>
                <h3 className="text-3xl font-black">{format(parseISO(todayQuiz.date), "MMMM do, yyyy")}</h3>
              </div>

              <div className="flex flex-wrap gap-6 text-neutral-300">
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-5 h-5" />
                  <span className="font-medium">{todayQuiz.questions.length} Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">{todayQuiz.questions.reduce((acc, q) => acc + q.timer, 0)}s Total</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Link
                  to={`/quiz/${todayQuiz.date}`}
                  className="bg-white text-neutral-900 px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-neutral-100 transition-colors shadow-lg"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Quiz</span>
                </Link>
                <Link
                  to={`/leaderboard/${todayQuiz.date}`}
                  className="bg-neutral-800 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-neutral-700 transition-colors"
                >
                  <Trophy className="w-5 h-5" />
                  <span>Leaderboard</span>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-neutral-300 text-center">
            <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900">No quiz for today yet</h3>
            <p className="text-neutral-500 mt-1">Check back later or try a past quiz!</p>
          </div>
        )}
      </section>

      {/* Past Quizzes */}
      <section>
        <h2 className="text-xl font-bold mb-6">Past Quizzes</h2>
        <div className="grid gap-4">
          {pastQuizzes.length > 0 ? (
            pastQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white p-6 rounded-3xl border border-neutral-200 flex items-center justify-between hover:border-neutral-900 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {format(parseISO(quiz.date), "MMMM do, yyyy")}
                    </h3>
                    <p className="text-sm text-neutral-500">{quiz.questions.length} Questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/leaderboard/${quiz.date}`}
                    className="p-3 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-600"
                    title="Leaderboard"
                  >
                    <Trophy className="w-5 h-5" />
                  </Link>
                  <Link
                    to={`/quiz/${quiz.date}`}
                    className="p-3 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-900"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-neutral-500 italic">No past quizzes available.</p>
          )}
        </div>
      </section>
    </div>
  );
}
