import { useState, useEffect } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/useAuth"
import { serviceCategories as staticCategories } from "../data/servicesData"
import { ServiceIcon } from "./ServiceIcon"
import api from "../api/axios"

// Nav items with icons
const navItems = [
  {
    to: "/",
    label: "Beranda",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    exact: true,
  },
  {
    to: "/layanan",
    label: "Layanan",
    isDropdown: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: "/produk",
    label: "Produk",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: "/tentang",
    label: "Tentang Kami",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: "/blog",
    label: "Blog",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  {
    to: "/kontak",
    label: "Hubungi Kami",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export default function PublicLayout() {
  const { user, logout } = useAuth()
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem("kurva_site_settings")
      return cached ? JSON.parse(cached) : {}
    } catch {
      return {}
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
  const [categories, setCategories] = useState(staticCategories)
  const [onlineMarketings, setOnlineMarketings] = useState([])
  const location = useLocation()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const navigate = useNavigate()

  const fetchOnlineMarketings = async () => {
    try {
      const res = await api.get("/public/online-marketings")
      setOnlineMarketings(res.data || [])
    } catch (err) {
      console.error("Failed to load online marketings", err)
    }
  }

  const handleStartConsultation = async (marketingId) => {
    if (!user) {
      navigate('/login', {
        state: {
          from: location.pathname,
          alert: 'Silakan masuk atau daftar akun terlebih dahulu untuk berkonsultasi dengan tim Marketing yang sedang online.',
          startChatWith: marketingId,
        }
      })
      return
    }

    try {
      const res = await api.post('/chats', {
        marketing_id: marketingId
      })
      navigate('/admin/chat', {
        state: {
          activeChatId: res.data.id
        }
      })
    } catch (err) {
      console.error("Failed to start chat session", err)
      alert("Gagal memulai obrolan. Silakan coba kembali.")
    }
  }

  const isCustomer = user?.roles?.some((r) => r.name === 'customer')

  // Tombol "Konsultasi Gratis": tampil untuk pengunjung dan customer yang sudah login.
  const konsultasiGratis = (
onlineMarketings.length > 0 ? (
                    <div className="dropdown dropdown-hover dropdown-end">
                      <div
                        tabIndex={0}
                        role="button"
                        onMouseEnter={fetchOnlineMarketings}
                        className="btn btn-primary border-none btn-sm rounded-full text-white font-bold shadow-md shadow-primary/20 flex items-center gap-1.5"
                      >
                        <span>Konsultasi Gratis</span>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                      <ul tabIndex={0} className="dropdown-content menu p-2.5 shadow-xl bg-white border border-[#DCE6E1] rounded-2xl w-64 mt-1.5 z-[100] space-y-1">
                        <div className="px-2.5 py-1.5 border-b border-base-200">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Marketing Online</span>
                          <p className="text-[9px] text-base-content/40 mt-0.5">Pilih marketing untuk memulai konsultasi langsung.</p>
                        </div>
                        {onlineMarketings.map((m) => (
                          <li key={m.id}>
                            <button
                              onClick={() => handleStartConsultation(m.id)}
                              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-primary/5 text-left transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden relative">
                                {m.avatar ? (
                                  <img src={`http://localhost:8000/storage/${m.avatar}`} alt={m.name} className="w-full h-full object-cover" />
                                ) : (
                                  m.name?.charAt(0).toUpperCase()
                                )}
                                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs text-secondary truncate leading-tight">{m.name}</p>
                                <p className="text-[9px] text-base-content/50 truncate mt-0.5">Aktif sekarang</p>
                              </div>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      onMouseEnter={fetchOnlineMarketings}
                      className="btn btn-primary border-none btn-sm rounded-full text-white font-bold shadow-md shadow-primary/20"
                    >
                      Konsultasi Gratis
                    </Link>
                  )
  )

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  // User yang login tetap bisa melihat halaman profile company.
  // Redirect dihapus.
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }

      // Scroll Reveal Animation logic
      const reveals = document.querySelectorAll(".scroll-reveal")
      reveals.forEach((reveal) => {
        const windowHeight = window.innerHeight
        const elementTop = reveal.getBoundingClientRect().top
        const elementVisible = 100
        if (elementTop < windowHeight - elementVisible) {
          reveal.classList.add("active")
        }
      })
    }
    window.addEventListener("scroll", handleScroll)
    // Run once on load to reveal elements already in viewport
    setTimeout(handleScroll, 100)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    api
      .get("/public/pengaturan")
      .then((res) => {
        const data = res.data || {}
        const realSettings = data.settings || data
        setSettings(realSettings)
        localStorage.setItem("kurva_site_settings", JSON.stringify(realSettings))
        if (realSettings.favicon) {
          const faviconEl = document.querySelector("link[rel=\"icon\"]")
          if (faviconEl) faviconEl.href = `http://localhost:8000/storage/${realSettings.favicon}`
        }
      })
      .catch((err) => console.error(err))

    // Fetch dynamic categories
    api
      .get("/public/layanan")
      .then((res) => {
        if (res.data && res.data.length > 0) {
          const mapped = res.data.map(cat => ({
            id: cat.id_kategori_layanan,
            slug: cat.slug,
            name: cat.name,
            subtitle: cat.subtitle,
            description: cat.description,
            iconId: cat.icon_id,
            items: (cat.layanan || []).map(item => ({
              id: item.id_layanan,
              num: item.num,
              title: item.title,
              badge: item.badge,
              desc: item.desc,
              tag: item.tag
            }))
          }))
          setCategories(mapped)
        }
      })
      .catch((err) => console.error("Failed to load services API:", err))

    // Initial fetch of online marketings to check status immediately
    fetchOnlineMarketings()

    // Poll online marketings status every 15 seconds to keep it fresh
    const interval = setInterval(fetchOnlineMarketings, 15000)
    return () => clearInterval(interval)
  }, [])

  // Close mobile menu and reset scroll reveal triggers on route change
  useEffect(() => {
    setMobileOpen(false)
    // Small delay to let DOM render before triggering visibility check
    setTimeout(() => {
      window.dispatchEvent(new Event('scroll'))
    }, 100)
  }, [location.pathname, location.search])

  const isActive = (to, exact = false) => {
    if (exact) return location.pathname === to
    return location.pathname === to || location.pathname.startsWith(to + "/")
  }

  const waNumber = (settings.no_telp || "081234567890").replace(/\D/g, "")
  const waLink = `https://wa.me/62${waNumber.startsWith("0") ? waNumber.slice(1) : waNumber}`

  return (
    <div className="min-h-screen bg-base-100 flex flex-col font-sans">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-base-100/95 backdrop-blur-md border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="text-2xl font-black text-secondary flex items-center gap-2 tracking-tight shrink-0">
              {settings.logo ? (
                <img
                  src={`http://localhost:8000/storage/${settings.logo}`}
                  alt={settings.nama_perusahaan || "Logo"}
                  className="h-14 object-contain"
                  width="176"
                  height="56"
                />
              ) : (
                <div className="flex flex-col leading-none">
                  <span className="text-2xl font-black italic text-primary tracking-tight">KURVA</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-base-content/40 mt-0.5">Growth Technology</span>
                </div>
              )}
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                if (item.isDropdown) {
                  return (
                    <div className="relative group" key={item.to}>
                      <Link
                        to={item.to}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive(item.to)
                            ? "text-primary bg-primary/10"
                            : "text-base-content/70 hover:text-primary hover:bg-base-200"
                        }`}
                      >
                        <span className={isActive(item.to) ? "text-primary" : "text-base-content/40"}>
                          {item.icon}
                        </span>
                        {item.label}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-60 group-hover:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </Link>

                      {/* Dropdown Menu */}
                      <div className="absolute top-full left-0 mt-1 w-60 bg-base-100 border border-base-200 shadow-xl rounded-2xl p-1.5 hidden group-hover:block z-50 animate-[fadeIn_0.15s_ease]">
                        <Link
                          to="/layanan"
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
                        >
                          <span>&bull; Semua Layanan (Overview)</span>
                        </Link>
                        <div className="border-t border-base-200 my-1"></div>
                        {categories.map((cat) => (
                          <Link
                            key={cat.id}
                            to={`/layanan?kategori=${cat.slug}`}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-base-content/80 hover:text-primary hover:bg-base-200 transition-colors"
                          >
                            <span className="text-primary/70"><ServiceIcon iconId={cat.iconId} className="h-3.5 w-3.5" /></span>
                            <span>{cat.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(item.to, item.exact)
                        ? "text-primary bg-primary/10"
                        : "text-base-content/70 hover:text-primary hover:bg-base-200"
                    }`}
                  >
                    <span className={isActive(item.to, item.exact) ? "text-primary" : "text-base-content/40"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Right side actions */}
            <div className="hidden md:flex items-center gap-3 min-h-[44px]">
              {useAuth().loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-9 w-28 bg-base-200 animate-pulse rounded-full"></div>
                  <div className="h-9 w-28 bg-base-200 animate-pulse rounded-full"></div>
                </div>
              ) : user ? (
                <>
                  {/* Account Dropdown */}
                  <div className="dropdown dropdown-end">
                    <div 
                      tabIndex={0} 
                      role="button" 
                      className="group flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[#DCE6E1] hover:border-primary/50 hover:shadow-xs hover:bg-base-100 transition-all duration-200 bg-white select-none cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full ring-2 ring-primary/20 bg-gradient-to-br from-primary to-[#0F4A3D] text-white flex items-center justify-center text-xs font-black shrink-0 overflow-hidden shadow-xs">
                        {user.avatar ? (
                          <img src={`http://localhost:8000/storage/${user.avatar}`} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="text-left pr-0.5">
                        <p className="text-xs font-bold text-secondary truncate max-w-[85px] leading-tight">{user.name?.split(" ")[0]}</p>
                        <p className="text-[9px] text-primary font-bold uppercase tracking-wider mt-0.5">
                          {user.roles?.[0]?.name || 'Pelanggan'}
                        </p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-base-content/40 group-hover:text-primary transition-colors" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <ul tabIndex={0} className="dropdown-content menu p-2 shadow-xl bg-white border border-[#DCE6E1] rounded-2xl w-64 mt-2.5 z-[100] space-y-1.5">
                      {/* User Info Header */}
                      <div className="px-3.5 py-2.5 border-b border-base-200/80 bg-base-50/50 rounded-xl">
                        <p className="font-bold text-sm text-secondary truncate">{user.name}</p>
                        <p className="text-xs text-base-content/50 truncate mt-0.5">{user.email}</p>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-2 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                          {user.roles?.[0]?.name || 'Pelanggan'}
                        </span>
                      </div>

                      {/* Dropdown Items */}
                      <li>
                        <Link to="/admin" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-secondary hover:bg-primary/5 hover:text-primary transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          Ringkasan Akun
                        </Link>
                      </li>
                      <li>
                        <button onClick={handleLogout} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 w-full text-left transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Keluar
                        </button>
                      </li>
                    </ul>
                  </div>

                  {isCustomer && konsultasiGratis}

                  {/* Premium Mulai Proyek Button */}
                  <Link 
                    to="/admin/proyek" 
                    className="group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary via-[#249374] to-[#0F4A3D] text-white font-extrabold text-xs tracking-wide shadow-[0_4px_14px_rgba(46,150,120,0.35)] hover:shadow-[0_6px_22px_rgba(46,150,120,0.5)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 border border-white/20"
                    title="Buka Halaman Manajemen Proyek"
                  >
                    <span className="p-1 rounded-full bg-white/20 text-white transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </span>
                    <span>Mulai Proyek</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-ghost btn-sm rounded-full text-base-content/80 hover:text-primary">
                    Masuk
                  </Link>
                  {konsultasiGratis}
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-base-content/70 hover:bg-base-200 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-base-200 bg-base-100 px-4 pb-4 space-y-1 animate-[fadeIn_0.15s_ease]">
            {navItems.map((item) => {
              if (item.isDropdown) {
                return (
                  <div key={item.to} className="space-y-1">
                    <button
                      onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-base-content/80 hover:text-primary hover:bg-base-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-primary">{item.icon}</span>
                        {item.label}
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {mobileServicesOpen && (
                      <div className="pl-6 space-y-1 border-l-2 border-primary/20 ml-3">
                        <Link to="/layanan" className="block px-3 py-1.5 rounded-md text-xs font-bold text-primary hover:bg-base-200">
                          &bull; Semua Layanan
                        </Link>
                        {categories.map((cat) => (
                          <Link
                            key={cat.id}
                            to={`/layanan?kategori=${cat.slug}`}
                            className="block px-3 py-1.5 rounded-md text-xs text-base-content/70 hover:text-primary hover:bg-base-200"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.to, item.exact)
                      ? "text-primary bg-primary/10"
                      : "text-base-content/70 hover:text-primary hover:bg-base-200"
                  }`}
                >
                  <span className={isActive(item.to, item.exact) ? "text-primary" : "text-base-content/40"}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              )
            })}
            {(!user || isCustomer) && onlineMarketings.length > 0 && (
              <div className="pt-2 space-y-1">
                <p className="px-3 text-[10px] font-bold text-primary uppercase tracking-wider">Konsultasi Gratis · Marketing Online</p>
                {onlineMarketings.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleStartConsultation(m.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left text-base-content/80 hover:bg-primary/5"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="pt-2 flex gap-2">
              {user ? (
                <Link to="/admin" className="btn btn-primary btn-sm flex-1 rounded-full">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-ghost btn-sm flex-1 rounded-full">Masuk</Link>
                  <Link to="/kontak" className="btn btn-primary border-none btn-sm flex-1 text-white rounded-full">Konsultasi</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0B3027] text-secondary-content border-t border-[#0F4236]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Perusahaan Info */}
            <div className="space-y-4">
              <Link to="/" className="inline-block">
              {settings.logo ? (
                <div className="bg-white/80 backdrop-blur-xs rounded-xl p-1.5 inline-block">
                  <img
                    src={`http://localhost:8000/storage/${settings.logo}`}
                    alt={settings.nama_perusahaan || "Logo"}
                    className="h-12 object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-black italic text-primary tracking-tight">KURVA</span>
                  <span className="text-[7.5px] font-bold uppercase tracking-widest text-white/40 mt-0.5">Growth Technology</span>
                </div>
              )}
              </Link>
              <p className="text-sm text-secondary-content/70 leading-relaxed">
                {settings.sejarah_perusahaan ||
                  "Solusi teknologi informasi terintegrasi untuk mendukung pertumbuhan bisnis Anda di era digital."}
              </p>

              {/* Social icons */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={settings.instagram || "https://instagram.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-primary text-secondary-content/70 hover:text-white flex items-center justify-center transition-all duration-200"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href={settings.facebook || "https://facebook.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-blue-600 text-secondary-content/70 hover:text-white flex items-center justify-center transition-all duration-200"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href={settings.linkedin || "https://linkedin.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="LinkedIn"
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-blue-500 text-secondary-content/70 hover:text-white flex items-center justify-center transition-all duration-200"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Navigasi */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Navigasi</h3>
              <ul className="space-y-2.5 text-sm text-secondary-content/70">
                <li><Link to="/" className="hover:text-primary transition-colors flex items-center gap-2"><span className="text-primary/50">›</span> Beranda</Link></li>
                <li><Link to="/layanan" className="hover:text-primary transition-colors flex items-center gap-2"><span className="text-primary/50">›</span> Layanan</Link></li>
                <li><Link to="/produk" className="hover:text-primary transition-colors flex items-center gap-2"><span className="text-primary/50">›</span> Produk</Link></li>
                <li><Link to="/tentang" className="hover:text-primary transition-colors flex items-center gap-2"><span className="text-primary/50">›</span> Tentang Kami</Link></li>
                <li><Link to="/blog" className="hover:text-primary transition-colors flex items-center gap-2"><span className="text-primary/50">›</span> Blog</Link></li>
                <li><Link to="/kontak" className="hover:text-primary transition-colors flex items-center gap-2"><span className="text-primary/50">›</span> Hubungi Kami</Link></li>
              </ul>
            </div>

            {/* Kontak */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Kontak</h3>
              <ul className="space-y-3 text-sm text-secondary-content/70">
                <li className="flex items-start gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{settings.alamat || "Yogyakarta, Indonesia"}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${settings.email_perusahaan || "info@kurvamedia.id"}`} className="hover:text-primary transition-colors">
                    {settings.email_perusahaan || "info@kurvamedia.id"}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    WhatsApp: {settings.no_telp || "081234567890"}
                  </a>
                </li>
              </ul>
            </div>

            {/* Newsletter / CTA */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Konsultasi Gratis</h3>
              <p className="text-sm text-secondary-content/70 mb-4 leading-relaxed">
                Punya proyek impian? Hubungi kami dan dapatkan estimasi gratis dalam 24 jam.
              </p>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary border-none btn-sm rounded-lg w-full text-white font-bold gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat WhatsApp
              </a>
              <Link to="/kontak" className="btn btn-outline btn-sm rounded-lg w-full mt-2 text-secondary-content/70 border-secondary-content/20 hover:border-primary hover:text-primary hover:bg-transparent">
                Form Kontak
              </Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-8 border-t border-secondary-content/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-secondary-content/40">
            <span>&copy; {new Date().getFullYear()} {settings.nama_perusahaan || "CV Kurva Media Teknologi"}. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-[99] p-3 rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all duration-300 animate-[fadeIn_0.2s_ease]"
          aria-label="Scroll to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  )
}
