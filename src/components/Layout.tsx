import { Link, Outlet, useNavigate } from "react-router-dom";
import { User, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { LogOut, LayoutDashboard, Home, Trophy, User as UserIcon } from "lucide-react";

export default function Layout({ user }: { user: User | null }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          <span>QuizMaster</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-neutral-100 rounded-full transition-colors" title="Home">
            <Home className="w-5 h-5" />
          </Link>
          {user ? (
            <>
              <Link to="/admin" className="p-2 hover:bg-neutral-100 rounded-full transition-colors" title="Admin Dashboard">
                <LayoutDashboard className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-red-500"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <Link to="/admin/login" className="p-2 hover:bg-neutral-100 rounded-full transition-colors" title="Admin Login">
              <UserIcon className="w-5 h-5" />
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <Outlet />
      </main>

      <footer className="mt-auto py-8 text-center text-neutral-400 text-sm border-t border-neutral-100">
        <p>© 2026 QuizMaster Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}
