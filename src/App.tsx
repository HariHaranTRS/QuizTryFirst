import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import QuizCreator from "./components/QuizCreator";
import UserHome from "./components/UserHome";
import QuizAttempt from "./components/QuizAttempt";
import Leaderboard from "./components/Leaderboard";
import Layout from "./components/Layout";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout user={user} />}>
          {/* User Routes */}
          <Route path="/" element={<UserHome />} />
          <Route path="/quiz/:date" element={<QuizAttempt />} />
          <Route path="/leaderboard/:date" element={<Leaderboard />} />

          {/* Admin Routes */}
          <Route
            path="/admin/login"
            element={user ? <Navigate to="/admin" /> : <AdminLogin />}
          />
          <Route
            path="/admin"
            element={user ? <AdminDashboard /> : <Navigate to="/admin/login" />}
          />
          <Route
            path="/admin/quiz/new"
            element={user ? <QuizCreator /> : <Navigate to="/admin/login" />}
          />
          <Route
            path="/admin/quiz/edit/:date"
            element={user ? <QuizCreator /> : <Navigate to="/admin/login" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
