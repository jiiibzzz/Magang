import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading, hasPermission } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><span className="loading loading-spinner loading-lg"></span></div>
  }

  if (!user) return <Navigate to="/login" replace />

  const path = location.pathname

  // Cek otorisasi berdasarkan role dan path
  const isAdmin = user.roles?.some(role => role.name === 'admin')
  const isMarketing = user.roles?.some(role => role.name === 'marketing')

  if (isAdmin) {
    // Admin hanya boleh ke dashboard, profile, user/role/permission management, dan pengaturan-situs
    const allowedAdminPaths = [
      '/admin',
      '/admin/profile',
      '/admin/users',
      '/admin/roles',
      '/admin/permissions',
      '/admin/pengaturan-situs'
    ]
    const isAllowed = allowedAdminPaths.some(p => path === p || path.startsWith(p + '/'))
    if (!isAllowed) {
      return <Navigate to="/admin" replace />
    }
  } else if (isMarketing) {
    // Marketing tidak boleh ke user/role/permission management dan pengaturan-situs
    const forbiddenMarketingPaths = [
      '/admin/users',
      '/admin/roles',
      '/admin/permissions',
      '/admin/pengaturan-situs'
    ]
    const isForbidden = forbiddenMarketingPaths.some(p => path === p || path.startsWith(p + '/'))
    if (isForbidden) {
      return <Navigate to="/admin" replace />
    }
  }

  // Cek akses penawaran & proyek (hanya Marketing & Customer)
  if (path.startsWith('/admin/penawaran') || path.startsWith('/admin/proyek') || path.startsWith('/admin/negosiasi')) {
    const isMarketing = user.roles?.some(role => role.name === 'marketing')
    const isCustomer = user.roles?.some(role => role.name === 'customer')
    if (!isMarketing && !isCustomer) {
      return <Navigate to="/admin" replace />
    }
  }

  // Jika menu memiliki permission 'kelola_chat', cek jika user memiliki permission tersebut
  if (path.startsWith('/admin/chat') && !hasPermission('kelola_chat') && !user.roles?.some(role => role.name === 'customer')) {
    return <Navigate to="/admin" replace />
  }

  return children
}
