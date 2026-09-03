import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { AreaDetail } from './pages/AreaDetail'
import { StationDetail } from './pages/StationDetail'
import { GuideDetail } from './pages/GuideDetail'
import { GuideEditor } from './pages/GuideEditor'
import { SearchPage } from './pages/Search'
import { Admin } from './pages/Admin'
import { StationQr } from './pages/StationQr'
import { GuideQr } from './pages/GuideQr'
import { Favorites } from './pages/Favorites'
import { AdminUsers } from './pages/AdminUsers'
import { GuideVersions } from './pages/GuideVersions'
import { ActivityLog } from './pages/ActivityLog'
import { QuickHelp } from './pages/QuickHelp'
import { ProblemReports } from './pages/ProblemReports'
import { NewGuideStart } from './pages/NewGuideStart'
const ImportGuides = lazy(() => import('./pages/ImportGuides').then((m) => ({ default: m.ImportGuides })))
import { Drafts } from './pages/Drafts'
import { FeedbackOverview } from './pages/FeedbackOverview'

export default function App() {
  return (
    <BrowserRouter basename="/DFM-Wiki">
      <AuthProvider>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/quick-help" element={<QuickHelp />} />
            <Route
              path="/new-guide"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <NewGuideStart />
                </ProtectedRoute>
              }
            />
            <Route path="/areas/:areaId" element={<AreaDetail />} />
            <Route path="/stations/:stationId" element={<StationDetail />} />
            <Route path="/guides/:guideId" element={<GuideDetail />} />

            <Route
              path="/stations/:stationId/qr"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <StationQr />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guides/:guideId/qr"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <GuideQr />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stations/:stationId/new-guide"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <GuideEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guides/:guideId/edit"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <GuideEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guides/:guideId/versions"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <GuideVersions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/activity"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <ActivityLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/problems"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <ProblemReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/import"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <Suspense fallback={<p className="text-neutral-500 text-sm">Lädt …</p>}>
                    <ImportGuides />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/drafts"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <Drafts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/feedback"
              element={
                <ProtectedRoute allowedRoles={['admin', 'technician']}>
                  <FeedbackOverview />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
