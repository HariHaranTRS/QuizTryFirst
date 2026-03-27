import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";
import { Plus, Calendar, Trash2, Edit, Eye, Clock, FileQuestion } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Quiz } from "../types";

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

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
      setQuizzes(data);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await deleteDoc(doc(db, "quizzes", id));
      setQuizzes(quizzes.filter((q) => q.id !== id));
    } catch (err) {
      console.error("Error deleting quiz:", err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-neutral-500 mt-1">Manage your daily quizzes and view results.</p>
        </div>
        <Link
          to="/admin/quiz/new"
          className="bg-neutral-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Quiz</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900"></div>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-300">
          <FileQuestion className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900">No quizzes created yet</h3>
          <p className="text-neutral-500 mt-1">Get started by creating your first daily quiz.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white p-6 rounded-3xl border border-neutral-200 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-neutral-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {format(parseISO(quiz.date), "MMMM do, yyyy")}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <FileQuestion className="w-4 h-4" />
                      {quiz.questions.length} Questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {quiz.questions.reduce((acc, q) => acc + q.timer, 0)}s Total
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/quiz/${quiz.date}`}
                  className="p-3 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-600"
                  title="Preview"
                >
                  <Eye className="w-5 h-5" />
                </Link>
                <Link
                  to={`/admin/quiz/edit/${quiz.date}`}
                  className="p-3 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-600"
                  title="Edit"
                >
                  <Edit className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => quiz.id && handleDelete(quiz.id)}
                  className="p-3 hover:bg-red-50 rounded-xl transition-colors text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
