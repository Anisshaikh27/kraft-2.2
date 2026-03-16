import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
import { BuilderPage } from "./pages/BuilderPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ToastProvider } from "./components/Toast";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FileItem } from "./types";
import { BACKEND_URL } from "./config";

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);

  // Pre-emptively wake up the Render free-tier backend
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`).catch(() => {
      // Silently ignore if it fails or is still booting
    });
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout files={files} />
              </ProtectedRoute>
            }
          >
            <Route index element={<LandingPage />} />
            <Route
              path="builder"
              element={<BuilderPage files={files} setFiles={setFiles} />}
            />
            <Route path="dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;