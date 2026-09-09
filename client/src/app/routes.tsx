import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { ProtectedRoute, GuestRoute } from '../components/ProtectedRoute'
import { Root } from './pages/Root'
import { Loader2 } from 'lucide-react'

// Lazy-loaded page components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const AllProfiles = lazy(() => import('./pages/AllProfiles').then(m => ({ default: m.AllProfiles })))
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })))
const Events = lazy(() => import('./pages/Events').then(m => ({ default: m.Events })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('./pages/Signup').then(m => ({ default: m.SignupPage })))

function PageLoader() {
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
    </div>
  )
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

function GuestLayout({ children }: { children: React.ReactNode }) {
  return <GuestRoute>{children}</GuestRoute>
}

function DashboardLayout() {
  return (
    <ProtectedLayout>
      <Root />
    </ProtectedLayout>
  )
}

function LoginLayout() {
  return (
    <GuestLayout>
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    </GuestLayout>
  )
}

function SignupLayout() {
  return (
    <GuestLayout>
      <Suspense fallback={<PageLoader />}>
        <SignupPage />
      </Suspense>
    </GuestLayout>
  )
}

function SuspendedDashboard() {
  return <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
}
function SuspendedProfiles() {
  return <Suspense fallback={<PageLoader />}><AllProfiles /></Suspense>
}
function SuspendedEvents() {
  return <Suspense fallback={<PageLoader />}><Events /></Suspense>
}
function SuspendedReports() {
  return <Suspense fallback={<PageLoader />}><Reports /></Suspense>
}
function SuspendedSettings() {
  return <Suspense fallback={<PageLoader />}><Settings /></Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginLayout,
  },
  {
    path: '/signup',
    Component: SignupLayout,
  },
  {
    path: '/',
    Component: DashboardLayout,
    children: [
      { index: true, Component: SuspendedDashboard },
      { path: 'profiles', Component: SuspendedProfiles },
      { path: 'events', Component: SuspendedEvents },
      { path: 'reports', Component: SuspendedReports },
      { path: 'settings', Component: SuspendedSettings },
    ],
  },
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900">404</h1>
          <p className="text-gray-500 mt-2">Page not found</p>
          <a href="/" className="text-teal-600 hover:text-teal-700 mt-4 inline-block">
            Go back home
          </a>
        </div>
      </div>
    ),
  },
])

export function AppRouter() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
