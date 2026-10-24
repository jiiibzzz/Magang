import { useState, useEffect, useCallback } from 'react'
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api from '../api/axios'

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', category: 'UTAMA' },
  { path: '/admin/chat', label: 'Chat & Konsultasi', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', permission: 'kelola_chat', category: 'UTAMA' },
  { path: '/admin/penawaran', label: 'Penawaran', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', category: 'UTAMA' },
  { path: '/admin/negosiasi', label: 'Negosiasi', icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z', category: 'UTAMA' },
  { path: '/admin/proyek', label: 'Proyek', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', category: 'UTAMA' },
  
  { path: '/admin/riwayat-transaksi', label: 'Riwayat Transaksi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', category: 'RIWAYAT' },
  
  { path: '/admin/rfm', label: 'Analisis RFM', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', permission: 'kelola_penawaran', category: 'MARKETING' },
  { path: '/admin/promo-campaign', label: 'Promo Campaign', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', permission: 'kelola_penawaran', category: 'MARKETING' },
  { path: '/admin/broadcast-maintenance', label: 'Broadcast Maintenance', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', permission: 'kelola_penawaran', category: 'MARKETING' },
  
  { path: '/admin/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', permission: 'users.view', category: 'MANAJEMEN PENGGUNA' },
  { path: '/admin/roles', label: 'Roles', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', permission: 'roles.view', category: 'MANAJEMEN PENGGUNA' },
  { path: '/admin/permissions', label: 'Permissions', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', permission: 'permissions.view', category: 'MANAJEMEN PENGGUNA' },
  
  { path: '/admin/kategori-artikel', label: 'Kategori Blog', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', permission: 'kelola_artikel', category: 'KONTEN & INFORMASI' },
  { path: '/admin/kategori-layanan', label: 'Kategori Layanan', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', permission: 'kelola_layanan', category: 'KONTEN & INFORMASI' },
  { path: '/admin/layanan', label: 'Layanan', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', permission: 'kelola_layanan', category: 'KONTEN & INFORMASI' },
  { path: '/admin/produk', label: 'Produk', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', permission: 'kelola_produk', category: 'KONTEN & INFORMASI' },
  { path: '/admin/artikel', label: 'Artikel', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z', permission: 'kelola_artikel', category: 'KONTEN & INFORMASI' },
  { path: '/admin/testimoni', label: 'Testimoni & Rating', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.977-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', permission: 'kelola_testimoni', category: 'KONTEN & INFORMASI' },
  { path: '/admin/anggota-tim', label: 'Anggota Tim', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', permission: 'kelola_anggota_tim', category: 'KONTEN & INFORMASI' },
  { path: '/admin/faq', label: 'FAQ', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', permission: 'kelola_faq', category: 'KONTEN & INFORMASI' },
  
  { path: '/admin/pesan-kontak', label: 'Pesan Kontak', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', permission: 'kelola_pesan_kontak', category: 'INTERAKSI PENGUNJUNG' },
  { path: '/admin/pelanggan-newsletter', label: 'Newsletter', icon: 'M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206', permission: 'kelola_newsletter', category: 'INTERAKSI PENGUNJUNG' },
  
  { path: '/admin/pengaturan-situs', label: 'Pengaturan Situs', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z', permission: 'kelola_pengaturan', category: 'SISTEM' },
  { path: '/admin/client-logos', label: 'Logo Klien', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', permission: 'kelola_pengaturan', category: 'SISTEM' },
  { path: '/admin/keunggulans', label: 'Keunggulan', icon: 'M13 10V3L4 14h7v7l9-11h-7z', permission: 'kelola_pengaturan', category: 'SISTEM' }
];

export default function Layout() {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Sidebar open/close state with persistence in localStorage (default to false on mobile screens)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('kurva_sidebar_open')
      if (saved !== null) return saved === 'true'
      return window.innerWidth >= 768
    } catch {
      return window.innerWidth >= 768
    }
  })

  // Close sidebar on initial mobile render
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    };
    window.addEventListener('resize', handleResize);
    // Initial check
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev
      try {
        localStorage.setItem('kurva_sidebar_open', String(next))
      } catch {}
      return next
    })
  }

  const [logo, setLogo] = useState(() => {
    try {
      const cached = localStorage.getItem("kurva_site_settings")
      if (cached) {
        const data = JSON.parse(cached)
        return data.logo || null
      }
    } catch {}
    return null
  })
  const [notifications, setNotifications] = useState({ chat: 0, penawaran: 0, proyek: 0, has_penawaran: false, has_selesai_lead: false })
  const [activeBroadcasts, setActiveBroadcasts] = useState([])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard/sidebar-notifications')
      setNotifications(res.data || { chat: 0, penawaran: 0, proyek: 0, has_penawaran: false, has_selesai_lead: false })
    } catch (err) {
      console.error('Failed to fetch sidebar notifications', err)
    }
  }, [])

  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await api.get('/broadcast-maintenance/active')
      setActiveBroadcasts(res.data || [])
    } catch {}
  }, [])

  const dismissBroadcast = async (id) => {
    try {
      await api.post(`/broadcast-maintenance/${id}/read`)
      setActiveBroadcasts(prev => prev.filter(b => b.id !== id))
    } catch {}
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      fetchBroadcasts()
      const interval = setInterval(fetchNotifications, 10000)
      return () => clearInterval(interval)
    }
  }, [user, fetchNotifications, fetchBroadcasts])

  const fetchLogo = useCallback(async () => {
    try {
      const res = await api.get(`/public/pengaturan?_t=${Date.now()}`)
      const data = res.data || {}
      const realSettings = data.settings || data
      if (realSettings && realSettings.logo) {
        setLogo(realSettings.logo)
        try {
          const cached = localStorage.getItem("kurva_site_settings")
          const currentSettings = cached ? JSON.parse(cached) : {}
          currentSettings.logo = realSettings.logo
          localStorage.setItem("kurva_site_settings", JSON.stringify(currentSettings))
        } catch (e) {
          console.error(e)
        }
      } else {
        setLogo(null)
      }
    } catch (err) {
      console.error('Failed to fetch site logo', err)
    }
  }, [])

  useEffect(() => {
    fetchLogo()
    const handleLogoUpdateEvent = () => fetchLogo()
    window.addEventListener('logo-updated', handleLogoUpdateEvent)
    return () => window.removeEventListener('logo-updated', handleLogoUpdateEvent)
  }, [fetchLogo])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const roleName = user?.roles?.[0]?.name || 'pengguna'

  const visibleMenuItems = menuItems.filter(item => {
    const isCustomer = user?.roles?.some(role => role.name === 'customer');
    
    if (item.path === '/admin/chat' && isCustomer) return true
    
    if (item.path === '/admin/testimoni' && isCustomer) {
      return notifications.has_selesai_lead;
    }
    
    if (item.path === '/admin/penawaran') {
      const isMarketing = user?.roles?.some(role => role.name === 'marketing');
      if (isCustomer) {
        return notifications.has_penawaran;
      }
      return isMarketing;
    }
    if (item.path === '/admin/proyek') {
      const isMarketing = user?.roles?.some(role => role.name === 'marketing');
      return isMarketing || isCustomer;
    }
    if (item.path === '/admin/negosiasi') {
      return isCustomer || hasPermission('kelola_negosiasi');
    }
    if (item.path === '/admin/riwayat-transaksi') {
      const isMarketing = user?.roles?.some(role => role.name === 'marketing');
      return isMarketing || isCustomer;
    }
    return !item.permission || hasPermission(item.permission)
  })

  const groupedMenus = visibleMenuItems.reduce((acc, item) => {
    const isMarketing = user?.roles?.some(role => role.name === 'marketing');
    const isAdmin = user?.roles?.some(role => role.name === 'admin');
    const isCustomer = user?.roles?.some(role => role.name === 'customer');

    const menuItemCopy = { ...item };

    if (isAdmin) {
      if (menuItemCopy.category !== 'UTAMA' && menuItemCopy.category !== 'MANAJEMEN PENGGUNA' && menuItemCopy.category !== 'SISTEM') {
        return acc;
      }
      if (menuItemCopy.path === '/admin/chat') {
        return acc;
      }
    } else if (isMarketing) {
      if (menuItemCopy.category === 'MANAJEMEN PENGGUNA' || menuItemCopy.category === 'SISTEM') {
        return acc;
      }
    } else if (isCustomer) {
      if (menuItemCopy.category !== 'UTAMA' && menuItemCopy.category !== 'RIWAYAT' && menuItemCopy.path !== '/admin/testimoni') {
        return acc;
      }
      menuItemCopy.category = 'UTAMA';
    }

    const cat = menuItemCopy.category || 'LAINNYA'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(menuItemCopy)
    return acc
  }, {})

  const isChatPage = location.pathname.startsWith('/admin/chat')

  return (
    <div className="min-h-screen bg-[#F0F4F2] flex min-w-0 overflow-x-hidden relative">
      {/* ── Mobile Backdrop Overlay ── */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-20 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside 
        className={`fixed h-full z-30 flex flex-col bg-gradient-to-b from-white via-[#F8FAF9] to-[#EDF3F0] border-r border-[#DCE6E1] shadow-[4px_0_24px_rgba(15,74,61,0.04)] transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? 'w-64 translate-x-0' 
            : '-translate-x-full md:translate-x-0 md:w-20'
        }`}
      >
        {/* Mobile close sidebar area */}
        {sidebarOpen && (
          <button 
            className="md:hidden absolute top-4 -right-10 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border border-white/20"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        )}
        
        {/* Logo & Brand Header Card */}
        <div className="p-3.5 pb-3 border-b border-[#E2ECE7] flex flex-col justify-between">
          <Link 
            to="/" 
            className={`group flex items-center justify-center p-2 rounded-2xl bg-white shadow-sm border border-[#DCE6E1] hover:border-primary/50 hover:shadow-md transition-all duration-300 w-full min-h-[50px] overflow-hidden ${
              !sidebarOpen ? 'p-1.5' : ''
            }`}
            title="Kunjungi Website Utama"
          >
            {logo && sidebarOpen ? (
              <img 
                src={`http://localhost:8000/storage/${logo}`} 
                alt="Logo Kurva" 
                className="h-8 w-auto max-w-[170px] object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-[#0F4A3D] text-white flex items-center justify-center font-black text-base shadow-sm shadow-primary/30 shrink-0">
                  K
                </div>
                {sidebarOpen && (
                  <div className="text-left">
                    <span className="font-extrabold text-sm tracking-tight text-secondary block leading-tight">KURVA</span>
                    <span className="text-[9px] text-base-content/50 font-bold tracking-widest uppercase block">Growth Tech</span>
                  </div>
                )}
              </div>
            )}
          </Link>

          {/* Role Status Pill (Expanded Only) */}
          {sidebarOpen && (
            <div className="mt-2 flex items-center justify-center">
              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 w-full">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                {roleName.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 p-2.5 space-y-3.5 overflow-y-auto custom-scrollbar">
          {Object.entries(groupedMenus).map(([category, items]) => (
            <div key={category} className="space-y-1">
              {sidebarOpen ? (
                <div className="flex items-center gap-1.5 px-2.5 pt-1 mb-1">
                  <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                  <h3 className="text-[10px] font-extrabold text-base-content/40 uppercase tracking-widest">
                    {category}
                  </h3>
                </div>
              ) : (
                <div className="w-6 h-0.5 bg-[#DCE6E1] mx-auto my-2 rounded-full" />
              )}

              {items.map((item) => {
                const getNotifCount = () => {
                  if (item.path === '/admin/chat') return notifications.chat;
                  if (item.path === '/admin/penawaran') return notifications.penawaran;
                  if (item.path === '/admin/proyek') return notifications.proyek;
                  return 0;
                };
                const notifCount = getNotifCount();
                const active = isActive(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`group relative flex items-center ${
                      sidebarOpen ? 'justify-between px-3 py-2.5' : 'justify-center p-2.5'
                    } rounded-xl text-xs font-semibold transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-primary to-[#1e7e63] text-white shadow-md shadow-primary/25 translate-x-0.5'
                        : 'text-base-content/70 hover:text-primary hover:bg-white hover:shadow-sm hover:border hover:border-[#DCE6E1]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1 rounded-lg transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                        active ? 'bg-white/20 text-white' : 'text-primary/70 group-hover:text-primary'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                        </svg>
                      </div>
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </div>

                    {/* Notification Badge */}
                    {notifCount > 0 && (
                      sidebarOpen ? (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ${
                          active 
                            ? 'bg-white text-primary' 
                            : 'bg-primary text-white animate-pulse'
                        }`}>
                          {notifCount}
                        </span>
                      ) : (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white animate-pulse" />
                      )
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile & Logout Bottom Card */}
        <div className={`p-2.5 border-t border-[#E2ECE7] bg-white/70 backdrop-blur-sm ${!sidebarOpen ? 'flex flex-col items-center gap-2' : ''}`}>
          <Link
            to="/admin/profile"
            title={!sidebarOpen ? `${user?.name} (${user?.email})` : undefined}
            className={`flex items-center gap-2.5 p-2 rounded-xl text-xs transition-all duration-200 border ${
              isActive('/admin/profile')
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white/90 text-base-content hover:border-primary/40 hover:shadow-sm border-[#DCE6E1]'
            } ${!sidebarOpen ? 'justify-center w-full' : ''}`}
          >
            <div className="relative shrink-0">
              <div className="avatar">
                <div className="w-8 h-8 rounded-xl ring-2 ring-primary/20 overflow-hidden">
                  {user?.avatar ? (
                    <img src={`http://localhost:8000/storage/${user.avatar}`} alt={user.name} />
                  ) : (
                    <div className="bg-gradient-to-br from-primary to-[#0F4A3D] text-white w-full h-full flex items-center justify-center font-bold text-xs">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            </div>

            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate leading-tight">{user?.name}</p>
                <p className={`text-[11px] truncate mt-0.5 ${isActive('/admin/profile') ? 'text-white/80' : 'text-base-content/50'}`}>
                  {user?.email}
                </p>
              </div>
            )}
          </Link>

          <button 
            onClick={handleLogout} 
            title={!sidebarOpen ? "Keluar (Logout)" : undefined}
            className={`flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 transition-all duration-200 ${
              sidebarOpen ? 'w-full mt-1.5' : 'w-full'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && <span>Keluar (Logout)</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area with Sticky Top Navbar ── */}
      <div 
        className={`flex-1 transition-all duration-300 ease-in-out min-h-screen min-w-0 ${
          isChatPage ? 'h-screen overflow-hidden flex flex-col' : ''
        } ${
          sidebarOpen ? 'md:ml-64 ml-0' : 'ml-0 md:ml-20'
        }`}
      >
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-md border-b border-[#DCE6E1] px-6 py-3 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl bg-white border border-[#DCE6E1] text-base-content/70 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 shadow-xs"
              title={sidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-secondary capitalize">{roleName} Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white border border-primary/20 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Situs Utama
            </Link>

            <div className="avatar">
              <div className="w-8 h-8 rounded-xl ring-2 ring-primary/20 overflow-hidden">
                {user?.avatar ? (
                  <img src={`http://localhost:8000/storage/${user.avatar}`} alt={user.name} />
                ) : (
                  <div className="bg-primary text-white w-full h-full flex items-center justify-center font-bold text-xs">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`w-full mx-auto ${
          isChatPage ? 'p-2 sm:p-2.5 max-w-full flex-1 flex flex-col min-h-0 overflow-hidden' : 'p-4 sm:p-6 max-w-7xl'
        }`}>
          {activeBroadcasts.length > 0 && (
            <div className="space-y-2 mb-4">
              {activeBroadcasts.map(b => {
                const isUrgent = b.jenis === 'trouble' || b.jenis === 'maintenance'
                const bannerBg = isUrgent
                  ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white border border-red-400/40'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                const jenisLabel = b.jenis === 'trouble' ? 'TROUBLE' : b.jenis === 'maintenance' ? 'MAINTENANCE' : 'INFO'
                return (
                  <div key={b.id} className={`flex items-start gap-3 p-4 rounded-2xl shadow-lg text-sm font-semibold ${bannerBg}`}>
                    {isUrgent ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isUrgent && <span className="badge badge-sm bg-white/20 text-white border-0 font-bold text-[9px] uppercase tracking-wider animate-pulse">Urgent</span>}
                        <span className="font-extrabold">[{jenisLabel}] {b.judul}</span>
                      </div>
                      <p className={`text-xs font-normal mt-1 ${isUrgent ? 'text-red-100' : 'opacity-80'}`}>{b.pesan}</p>
                    </div>
                    <button onClick={() => dismissBroadcast(b.id)} className={`btn btn-ghost btn-xs btn-circle shrink-0 ${isUrgent ? 'text-white hover:bg-white/20' : ''}`}>✕</button>
                  </div>
                )
              })}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}