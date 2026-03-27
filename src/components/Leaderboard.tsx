import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Submission } from "../types";
import { Trophy, Medal, User as UserIcon, ArrowLeft, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "../lib/utils";

export default function Leaderboard() {
  const { date } = useParams();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (date) fetchLeaderboard(date);
  }, [date]);

  const fetchLeaderboard = async (d: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "submissions"),
        where("quizId", "==", d),
        orderBy("score", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Submission[];
      setSubmissions(data);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-black">Leaderboard</h1>
            <p className="text-neutral-500 flex items-center gap-1 mt-1">
              <Calendar className="w-4 h-4" />
              {date ? format(parseISO(date), "MMMM do, yyyy") : ""}
            </p>
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-neutral-300 text-center">
          <Trophy className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900">No submissions yet</h3>
          <p className="text-neutral-500 mt-1">Be the first to complete this quiz!</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-neutral-200 overflow-hidden shadow-sm">
          <div className="p-8 bg-neutral-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-neutral-900" />
              </div>
              <div>
                <h2 className="text-xl font-black">Top Performers</h2>
                <p className="text-neutral-400 text-sm">Based on score and speed</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-amber-500">{submissions.length}</span>
              <p className="text-neutral-400 text-xs uppercase tracking-widest">Players</p>
            </div>
          </div>

          <div className="divide-y divide-neutral-100">
            {submissions.map((sub, index) => (
              <div
                key={sub.id}
                className={cn(
                  "p-6 flex items-center justify-between transition-colors",
                  index < 3 ? "bg-amber-50/30" : "hover:bg-neutral-50"
                )}
              >
                <div className="flex items-center gap-6">
                  <div className="w-10 text-center">
                    {index === 0 ? (
                      <Medal className="w-8 h-8 text-amber-500 mx-auto" />
                    ) : index === 1 ? (
                      <Medal className="w-8 h-8 text-neutral-400 mx-auto" />
                    ) : index === 2 ? (
                      <Medal className="w-8 h-8 text-amber-700 mx-auto" />
                    ) : (
                      <span className="text-lg font-black text-neutral-300">#{index + 1}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-neutral-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{sub.userName}</h3>
                      <p className="text-xs text-neutral-400 uppercase tracking-widest">Player</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-neutral-900">{sub.score}</div>
                  <p className="text-xs text-neutral-400 uppercase tracking-widest">Points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
