import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();

  const navItems = [
    { to: "/", label: "楽譜一覧" },
    { to: "/upload", label: "楽譜を登録" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-indigo-600">
          Doremi
        </Link>
        <nav className="flex items-center gap-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm font-medium ${
                location.pathname === item.to
                  ? "text-indigo-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ログアウト
          </button>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
