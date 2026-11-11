import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import api from '../api/axios'

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Eye Toggle                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function EyeToggle({ show, onToggle }) {
  return (
    <button 
      type="button" 
      tabIndex={-1} 
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-primary transition-colors"
      title={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
    >
      {show ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Field Wrapper                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function Field({ label, error, hint, children }) {
  return (
    <div className="space-y-1 text-left">
      <label className="block text-[11px] font-bold text-secondary">{label}</label>
      {children}
      {error && <p className="text-[10px] text-rose-500 font-medium mt-0.5">{error}</p>}
      {!error && hint && <p className="text-[10px] text-base-content/40 mt-0.5">{hint}</p>}
    </div>
  )
}

const inputBase = `w-full px-3 py-2 text-xs rounded-xl outline-none transition-all duration-200 text-base-content placeholder-base-content/30 bg-base-50 border border-base-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/20`
const inputStyle = (err = false) => ({
  border: err ? '1px solid rgba(239,68,68,0.5)' : undefined,
})

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Page                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function Login() {
  const [tab, setTab] = useState('login')
  const [showPw, setShowPw] = useState(false)
  const [showCf, setShowCf] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPw, setRegPw] = useState('')
  const [regCf, setRegCf] = useState('')
  const [regErrors, setRegErrors] = useState({})

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectAlert = location.state?.alert || ''

  // Logo Settings
  const [logo, setLogo] = useState(null)
  
  useEffect(() => {
    try {
      const cached = localStorage.getItem("kurva_site_settings")
      if (cached) {
        const data = JSON.parse(cached)
        if (data.logo) setLogo(data.logo)
      }
    } catch (e) {
      console.error(e)
    }

    api.get("/public/pengaturan")
      .then(res => {
        if (res.data && res.data.logo) {
          setLogo(res.data.logo)
        }
      })
      .catch(err => console.error(err))
  }, [])

  // Marketing yang dipilih dari tombol "Konsultasi Gratis" sebelum login.
  const startChatWith = location.state?.startChatWith || null

  useEffect(() => {
    // Saat ada konsultasi tertunda, navigasi ditangani lanjutkanSetelahMasuk().
    if (user && !startChatWith) {
      navigate('/admin', { replace: true })
    }
  }, [user, navigate, startChatWith])

  const lanjutkanSetelahMasuk = async (akun) => {
    const isCustomer = akun?.roles?.some((r) => r.name === 'customer') ?? true
    if (startChatWith && isCustomer) {
      try {
        const res = await api.post('/chats', { marketing_id: startChatWith })
        navigate('/admin/chat', { replace: true, state: { activeChatId: res.data.id } })
        return
      } catch (err) {
        console.error('Gagal memulai konsultasi setelah login', err)
      }
    }
    navigate('/admin', { replace: true })
  }

  const switchTo = (t) => {
    setTab(t); setError(''); setRegErrors({})
    setShowPw(false); setShowCf(false)
  }

  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_email')
    const savedPassword = localStorage.getItem('remember_password')
    if (savedEmail && savedPassword) {
      setEmail(savedEmail)
      setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])

  // Bedakan server mati/tidak terjangkau dari kredensial yang memang salah.
  const pesanError = (err, fallback) => {
    if (!err.response) return 'Tidak dapat terhubung ke server. Pastikan backend (php artisan serve) sedang berjalan.'
    if (err.response.status >= 500) return 'Terjadi kesalahan di server. Silakan coba lagi.'
    return err.response.data?.message || fallback
  }

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { 
      const data = await login(email, password)
      if (rememberMe) {
        localStorage.setItem('remember_email', email)
        localStorage.setItem('remember_password', password)
      } else {
        localStorage.removeItem('remember_email')
        localStorage.removeItem('remember_password')
      }
      await lanjutkanSetelahMasuk(data?.user)
    }
    catch (err) { setError(pesanError(err, 'Email atau kata sandi salah.')) }
    finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setRegErrors({}); setLoading(true)
    try { 
      const data = await register(regName, regEmail, regPhone, regPw, regCf)
      await lanjutkanSetelahMasuk(data?.user)
    }
    catch (err) {
      if (err.response?.status === 422) setRegErrors(err.response.data.errors || {})
      else setError(pesanError(err, 'Pendaftaran gagal.'))
    }
    finally { setLoading(false) }
  }

  const Spinner = () => (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-[#EBF3EF] via-[#F4F8F6] to-[#E3EFEA] relative overflow-hidden">
      
      {/* Background Decorative Ambient Radial Glows */}
      <div 
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none opacity-45 blur-3xl rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(46,150,120,0.25) 0%, rgba(15,74,61,0.08) 50%, transparent 75%)' }} 
      />
      <div 
        className="absolute -bottom-20 right-10 w-[500px] h-[350px] pointer-events-none opacity-30 blur-3xl rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(46,150,120,0.2) 0%, transparent 70%)' }} 
      />
      <div 
        className="absolute top-1/3 -left-20 w-[400px] h-[300px] pointer-events-none opacity-20 blur-3xl rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(15,74,61,0.15) 0%, transparent 70%)' }} 
      />

      {/* Centered Auth Card */}
      <div className="w-full max-w-[430px] bg-white border border-[#DCE6E1] shadow-[0_12px_35px_rgba(15,74,61,0.08)] rounded-3xl p-5 sm:p-6 relative z-10">

        {/* Back Link & Brand Logo */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-base-200/80">
          <Link 
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-base-content/60 hover:text-primary transition-colors group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Beranda</span>
          </Link>

          <div className="flex items-center">
            {logo ? (
              <img 
                src={`http://localhost:8000/storage/${logo}`} 
                alt="Logo Kurva" 
                className="h-7 object-contain max-w-[130px]"
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-[#0F4A3D] flex items-center justify-center shadow-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="font-black text-xs text-secondary tracking-tight">KURVA</span>
              </div>
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="text-left mb-3.5">
          <h1 className="text-lg sm:text-xl font-extrabold text-secondary tracking-tight">
            {tab === 'login' ? 'Masuk ke Akun Anda' : 'Buat Akun Baru'}
          </h1>
          <p className="text-base-content/60 text-[11px] mt-0.5 leading-relaxed">
            {tab === 'login'
              ? 'Kelola layanan, pantau progres proyek, dan konsultasi teknis.'
              : 'Daftarkan akun untuk mulai berkonsultasi dan memesan layanan.'}
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex rounded-xl bg-base-100 p-1 border border-base-200 mb-3.5">
          <button
            type="button"
            onClick={() => switchTo('login')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
              tab === 'login'
                ? 'bg-primary text-white shadow-xs'
                : 'text-base-content/60 hover:text-secondary'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => switchTo('register')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
              tab === 'register'
                ? 'bg-primary text-white shadow-xs'
                : 'text-base-content/60 hover:text-secondary'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {/* Info Alert (dari redirect) */}
        {redirectAlert && !error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs text-primary bg-primary/10 border border-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 100-6 1 1 0 000 6z" clipRule="evenodd" />
            </svg>
            <span>{redirectAlert}</span>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-700 bg-rose-50 border border-rose-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ──── LOGIN FORM ──── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <Field label={<>Email <span className="text-primary">*</span></>}>
              <input 
                type="email" 
                className={inputBase} 
                style={inputStyle()}
                placeholder="nama@email.com"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                autoFocus
              />
            </Field>

            <Field label={<>Kata Sandi <span className="text-primary">*</span></>}>
              <div className="relative">
                <input 
                  type={showPw ? 'text' : 'password'} 
                  className={inputBase} 
                  style={{ ...inputStyle(), paddingRight: '2.5rem' }}
                  placeholder="Masukkan kata sandi"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
                <EyeToggle show={showPw} onToggle={() => setShowPw(!showPw)} />
              </div>
            </Field>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-base-content/65 font-medium">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="checkbox checkbox-primary checkbox-xs rounded"
                />
                <span>Ingat saya</span>
              </label>
            </div>

            <div className="pt-1">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-primary via-[#249374] to-[#0F4A3D] shadow-sm hover:shadow-md hover:shadow-primary/20 transition-all duration-200 hover:opacity-95 active:scale-[0.98] border border-white/20"
              >
                {loading ? <Spinner /> : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Masuk ke Akun</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-base-content/50 pt-1">
              Belum punya akun?{' '}
              <button 
                type="button" 
                onClick={() => switchTo('register')}
                className="text-primary font-bold hover:underline transition-colors ml-1"
              >
                Daftar sekarang
              </button>
            </p>
          </form>
        )}

        {/* ──── REGISTER FORM (Optimized compact layout) ──── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-2.5">
            <Field label={<>Nama Lengkap <span className="text-primary">*</span></>} error={regErrors.name?.[0]}>
              <input 
                type="text" 
                className={inputBase} 
                style={inputStyle(!!regErrors.name)}
                placeholder="Masukkan nama lengkap"
                value={regName} 
                onChange={e => setRegName(e.target.value)} 
                required 
                autoFocus
              />
            </Field>

            <Field label={<>Alamat Email <span className="text-primary">*</span></>} error={regErrors.email?.[0]}>
              <input 
                type="email" 
                className={inputBase} 
                style={inputStyle(!!regErrors.email)}
                placeholder="nama@email.com"
                value={regEmail} 
                onChange={e => setRegEmail(e.target.value)} 
                required 
              />
            </Field>

            <Field label={<>Nomor WhatsApp <span className="text-primary">*</span></>} error={regErrors.phone?.[0]}>
              <input 
                type="tel" 
                className={inputBase} 
                style={inputStyle(!!regErrors.phone)}
                placeholder="08xxxxxxxxxx"
                value={regPhone} 
                onChange={e => setRegPhone(e.target.value)} 
                required 
              />
            </Field>

            {/* Grid for Password & Confirmation Password (Side by side on desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Field label={<>Kata Sandi <span className="text-primary">*</span></>} error={regErrors.password?.[0]}>
                <div className="relative">
                  <input 
                    type={showPw ? 'text' : 'password'} 
                    className={inputBase}
                    style={{ ...inputStyle(!!regErrors.password), paddingRight: '2.3rem' }}
                    placeholder="Min 8 karakter"
                    value={regPw} 
                    onChange={e => setRegPw(e.target.value)} 
                    required 
                  />
                  <EyeToggle show={showPw} onToggle={() => setShowPw(!showPw)} />
                </div>
              </Field>

              <Field label={<>Ulangi Sandi <span className="text-primary">*</span></>}>
                <div className="relative">
                  <input 
                    type={showCf ? 'text' : 'password'} 
                    className={inputBase}
                    style={{ ...inputStyle(), paddingRight: '2.3rem' }}
                    placeholder="Ulangi sandi"
                    value={regCf} 
                    onChange={e => setRegCf(e.target.value)} 
                    required 
                  />
                  <EyeToggle show={showCf} onToggle={() => setShowCf(!showCf)} />
                </div>
              </Field>
            </div>

            <div className="pt-1.5">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-primary via-[#249374] to-[#0F4A3D] shadow-sm hover:shadow-md hover:shadow-primary/20 transition-all duration-200 hover:opacity-95 active:scale-[0.98] border border-white/20"
              >
                {loading ? <Spinner /> : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Daftarkan Akun</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-base-content/50 pt-0.5">
              Sudah punya akun?{' '}
              <button 
                type="button" 
                onClick={() => switchTo('login')}
                className="text-primary font-bold hover:underline transition-colors ml-1"
              >
                Masuk di sini
              </button>
            </p>
          </form>
        )}

      </div>

    </div>
  )
}
