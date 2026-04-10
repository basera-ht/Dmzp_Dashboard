import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { ProtectedRoute, GuestRoute } from '../components/ProtectedRoute'
import { Root } from './pages/Root'
import { Dashboard } from './pages/Dashboard'
import { AllProfiles } from './pages/AllProfiles'
import { Reports } from './pages/Reports'
import { Events } from './pages/Events'
import { Settings } from './pages/Settings'
import { LoginPage } from './pages/Login'
import { SignupPage } from './pages/Signup'

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
      <LoginPage />
    </GuestLayout>
  )
}

function SignupLayout() {
  return (
    <GuestLayout>
      <SignupPage />
    </GuestLayout>
  )
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
      { index: true, Component: Dashboard },
      { path: 'profiles', Component: AllProfiles },
      { path: 'events', Component: Events },
      { path: 'reports', Component: Reports },
      { path: 'settings', Component: Settings },
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
