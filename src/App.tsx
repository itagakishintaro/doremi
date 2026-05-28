import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ScoreUpload } from "./pages/ScoreUpload";
import { ScoreDetail } from "./pages/ScoreDetail";
import { Practice } from "./pages/Practice";
import { Result } from "./pages/Result";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<ScoreUpload />} />
          <Route path="/scores/:scoreId" element={<ScoreDetail />} />
          <Route path="/scores/:scoreId/practice/:partId" element={<Practice />} />
          <Route path="/scores/:scoreId/result" element={<Result />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
