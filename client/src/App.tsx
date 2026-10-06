import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedLayout from './components/ProtectedLayout';
import LoginPage from './pages/LoginPage';
import RequestListPage from './pages/RequestListPage';
import RequestDetailPage from './pages/RequestDetailPage';
import RequestFormPage from './pages/RequestFormPage';
import WorkItemListPage from './pages/WorkItemListPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/requests" replace />} />
            <Route path="/requests" element={<RequestListPage />} />
            <Route path="/requests/new" element={<RequestFormPage />} />
            <Route path="/requests/:id" element={<RequestDetailPage />} />
            <Route path="/requests/:id/edit" element={<RequestFormPage />} />
            <Route path="/work-items" element={<WorkItemListPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/requests" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
