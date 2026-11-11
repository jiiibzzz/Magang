import { useState, useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import api from '../../api/axios'
import { useConfirmModal } from '../../components/ConfirmModal'

export default function ChatCenter() {
  const { user } = useAuth()
  const location = useLocation()
  const isCustomer = user?.roles?.some(role => role.name === 'customer')

  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [files, setFiles] = useState([])
  
  // Message input
  const [typedMessage, setTypedMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingText, setEditingText] = useState('')

  // File upload input
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileKeterangan, setFileKeterangan] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)

  // Edit file/document state
  const [editingFileId, setEditingFileId] = useState(null)
  const [editingFileKeterangan, setEditingFileKeterangan] = useState('')
  const [editingFileObj, setEditingFileObj] = useState(null)
  const [editingFileKeteranganFile, setEditingFileKeteranganFile] = useState(null)
  const [updatingFile, setUpdatingFile] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messageEndRef = useRef(null)
  const { confirm, ModalComponent } = useConfirmModal()

  // Toggle layout states
  const [showSessionsSidebar, setShowSessionsSidebar] = useState(true)
  const [showDocsSidebar, setShowDocsSidebar] = useState(true)

  console.log('ChatCenter: user =', user, 'isCustomer =', isCustomer, 'activeSession =', activeSession);

  // Fetch all chat sessions
  const fetchSessions = async (selectId = null) => {
    try {
      const res = await api.get('/chats')
      const data = res.data || []
      setSessions(data)
      
      // Handle auto-selection of a session
      let targetId = selectId || location.state?.activeChatId
      if (targetId) {
        const found = data.find(s => String(s.id) === String(targetId))
        if (found) {
          handleSelectSession(found)
        } else if (data.length > 0) {
          handleSelectSession(data[0])
        }
      } else if (!activeSession && data.length > 0) {
        handleSelectSession(data[0])
      } else if (activeSession) {
        // Refresh active session data
        const updated = data.find(s => s.id === activeSession.id)
        if (updated) {
          setActiveSession(updated)
        }
      } else {
        // Clear old sessions messages if no sessions left
        setMessages([])
        setFiles([])
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch messages and files for the active session
  const fetchSessionDetails = async (sessionId) => {
    try {
      const res = await api.get(`/chats/${sessionId}`)
      setMessages(res.data.messages || [])
      setFiles(res.data.files || [])
    } catch (err) {
      console.error('Failed to load session details:', err)
    }
  }

  useEffect(() => {
    fetchSessions()
    return () => {
      // Cleanup states on unmount/logout
      setSessions([])
      setActiveSession(null)
      setMessages([])
      setFiles([])
    }
  }, [user])

  // Auto-poll messages every 4 seconds for "live" feel
  useEffect(() => {
    if (!activeSession) return
    
    const interval = setInterval(() => {
      fetchSessionDetails(activeSession.id)
    }, 4000)

    return () => clearInterval(interval)
  }, [activeSession])

  // Scroll to bottom when messages load/change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectSession = (session) => {
    setActiveSession(session)
    setLoadingMessages(true)
    api.get(`/chats/${session.id}`)
      .then(res => {
        setMessages(res.data.messages || [])
        setFiles(res.data.files || [])
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingMessages(false))
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!typedMessage.trim() || !activeSession || sendingMessage) return

    setSendingMessage(true)
    try {
      const res = await api.post(`/chats/${activeSession.id}/messages`, {
        message: typedMessage
      })
      setMessages(prev => [...prev, res.data])
      setTypedMessage('')
    } catch (err) {
      console.error(err)
      alert('Gagal mengirim pesan.')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSaveEdit = async (e, msgId) => {
    e.preventDefault()
    if (!editingText.trim() || !activeSession) return

    try {
      const res = await api.put(`/chats/${activeSession.id}/messages/${msgId}`, {
        message: editingText
      })
      setMessages(prev => prev.map(m => m.id === msgId ? res.data : m))
      setEditingMessageId(null)
      setEditingText('')
    } catch (err) {
      console.error(err)
      alert('Gagal mengedit pesan.')
    }
  }

  const handleDeleteMessage = (msgId) => {
    confirm('Apakah Anda yakin ingin menghapus pesan ini?', async () => {
      try {
        await api.delete(`/chats/${activeSession.id}/messages/${msgId}`)
        setMessages(prev => prev.filter(m => m.id !== msgId))
      } catch (err) {
        console.error(err)
        alert('Gagal menghapus pesan.')
      }
    }, 'Hapus Pesan')
  }

  const handleDeleteSession = (sessionId) => {
    confirm('Apakah Anda yakin ingin menghapus topik konsultasi ini secara permanen beserta seluruh berkas di dalamnya?', async () => {
      try {
        await api.delete(`/chats/${sessionId}`)
        setActiveSession(null)
        fetchSessions()
      } catch (err) {
        console.error(err)
        alert('Gagal menghapus topik konsultasi.')
      }
    }, 'Hapus Topik Konsultasi')
  }

  // Marketing mengambil alih chat yang belum punya marketing (mis. dari tombol Konsultasi layanan/produk)
  const [claiming, setClaiming] = useState(false)
  const handleClaim = async () => {
    if (!activeSession || isCustomer || claiming) return
    setClaiming(true)
    try {
      const res = await api.post(`/chats/${activeSession.id}/claim`)
      fetchSessions(res.data.id)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Gagal mengklaim obrolan.')
      fetchSessions(activeSession.id)
    } finally {
      setClaiming(false)
    }
  }

  const handleUpdateStatus = async (status) => {
    if (!activeSession || isCustomer) return
    try {
      const res = await api.put(`/chats/${activeSession.id}/status`, { status })
      setActiveSession(res.data)
      fetchSessions(res.data.id)
    } catch (err) {
      console.error(err)
      alert('Gagal mengubah tahapan pengerjaan.')
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile || !fileKeterangan.trim() || !activeSession || uploadingFile) return

    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('keterangan', fileKeterangan)

    try {
      const res = await api.post(`/chats/${activeSession.id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setFiles(prev => [...prev, res.data])
      setSelectedFile(null)
      setFileKeterangan('')
      // Refresh messages to show the file upload system log message
      fetchSessionDetails(activeSession.id)
      
      // Reset input element
      const fileInput = document.getElementById('chat-file-input')
      if (fileInput) fileInput.value = ''
    } catch (err) {
      console.error(err)
      alert('Gagal mengunggah berkas. Ukuran maksimal 10MB.')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleUpdateFile = async (e) => {
    e.preventDefault()
    if (!editingFileKeterangan.trim() || !activeSession || updatingFile) return

    setUpdatingFile(true)
    const formData = new FormData()
    formData.append('_method', 'PUT') // Method spoofing for Laravel PUT requests with file upload
    formData.append('keterangan', editingFileKeterangan)
    if (editingFileKeteranganFile) {
      formData.append('file', editingFileKeteranganFile)
    }

    try {
      const res = await api.post(`/chats/${activeSession.id}/files/${editingFileId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setFiles(prev => prev.map(f => f.id === editingFileId ? res.data : f))
      setEditingFileId(null)
      setEditingFileKeterangan('')
      setEditingFileKeteranganFile(null)
      setEditingFileObj(null)
      fetchSessionDetails(activeSession.id)
    } catch (err) {
      console.error(err)
      alert('Gagal memperbarui berkas.')
    } finally {
      setUpdatingFile(false)
    }
  }

  const handleDeleteFile = (fileId) => {
    confirm('Apakah Anda yakin ingin menghapus dokumen ini?', async () => {
      try {
        await api.delete(`/chats/${activeSession.id}/files/${fileId}`)
        setFiles(prev => prev.filter(f => f.id !== fileId))
        fetchSessionDetails(activeSession.id)
      } catch (err) {
        console.error(err)
        alert('Gagal menghapus berkas.')
      }
    }, 'Hapus Dokumen')
  }

  const getSystemMessageClass = (message) => {
    if (message.includes('menjadi "Ketertarikan"')) {
      return 'bg-sky-50 text-sky-700 border-sky-200/60'
    }
    if (message.includes('menjadi "Ditindaklanjuti"')) {
      return 'bg-blue-50 text-blue-700 border-blue-200/60'
    }
    if (message.includes('menjadi "Penawaran"')) {
      return 'bg-amber-50 text-amber-700 border-amber-200/60'
    }
    if (message.includes('menjadi "Deal"')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/60 font-bold'
    }
    if (message.includes('menjadi "Arsip"')) {
      return 'bg-gray-100 text-gray-500 border-gray-300'
    }
    if (message.includes('telah diklaim oleh')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/60 font-semibold'
    }
    if (message.includes('Mengunggah dokumen')) {
      return 'bg-slate-100 text-slate-700 border-slate-200'
    }
    return 'bg-base-200 border border-base-300 text-base-content/60'
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Ketertarikan': return 'bg-sky-100 text-sky-700 border-sky-300'
      case 'Ditindaklanjuti': return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'Penawaran': return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'Deal': return 'bg-emerald-100 text-emerald-700 border-emerald-300'
      case 'Arsip': return 'bg-gray-100 text-gray-500 border-gray-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="flex flex-1 w-full h-full min-h-0 border border-base-300 rounded-2xl overflow-hidden bg-base-100 shadow-sm relative">
      
      {/* Backdrop overlay for mobile sidebar */}
      {showSessionsSidebar && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setShowSessionsSidebar(false)}
        />
      )}

      {/* ════════════════════ LEFT COLUMN: CHAT SESSIONS ════════════════════ */}
      {showSessionsSidebar && (
        <div className="absolute md:relative z-40 w-60 sm:w-64 border-r border-base-300 flex flex-col shrink-0 bg-base-50 h-full min-h-0 transition-all duration-300">
          <div className="p-4 border-b border-base-300 bg-base-100 shrink-0 flex justify-between items-center">
            <div>
              <h2 className="font-extrabold text-secondary text-base">
                {isCustomer ? 'Riwayat Konsultasi' : 'Daftar Chat Klien'}
              </h2>
              <p className="text-[10px] text-base-content/50 font-semibold uppercase tracking-wider mt-0.5">
                {isCustomer ? 'Hubungi Marketing' : 'Klien & Konsultasi'}
              </p>
            </div>
            <button 
              onClick={() => setShowSessionsSidebar(false)} 
              className="btn btn-ghost btn-xs text-base-content/55 font-bold hover:bg-base-200"
              title="Sembunyikan Daftar Chat"
            >
              &larr;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2 text-base-content/40">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-xs font-bold">Belum ada obrolan</p>
                <p className="text-[10px] leading-relaxed">
                  {isCustomer ? 'Silakan tanya tim kami dari halaman produk/layanan.' : 'Belum ada obrolan masuk dari customer.'}
                </p>
              </div>
            ) : (
              sessions.map((sess) => {
                const active = activeSession?.id === sess.id
                return (
                  <button
                    key={sess.id}
                    onClick={() => handleSelectSession(sess)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                      active 
                        ? 'bg-primary text-primary-content border-primary shadow-md shadow-primary/10' 
                        : 'bg-white border-base-200/80 hover:bg-base-200/50 hover:border-base-300 text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="avatar shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ring-2 ${active ? 'bg-primary-focus text-primary-content ring-primary-content/20' : 'bg-primary/10 text-primary ring-primary/20'}`}>
                          {isCustomer ? (
                            sess.marketing?.avatar ? (
                              <img src={`http://localhost:8000/storage/${sess.marketing.avatar}`} alt={sess.marketing?.name} className="rounded-full" />
                            ) : (
                              sess.marketing?.name?.charAt(0).toUpperCase() || 'M'
                            )
                          ) : (
                            sess.customer?.avatar ? (
                              <img src={`http://localhost:8000/storage/${sess.customer.avatar}`} alt={sess.customer?.name} className="rounded-full" />
                            ) : (
                              sess.customer?.name?.charAt(0).toUpperCase() || 'C'
                            )
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex justify-between items-start gap-1 w-full group/sess">
                          <span className="font-extrabold text-xs truncate max-w-[110px]">
                            {isCustomer ? (sess.product?.nama || sess.layanan?.title || 'Pertanyaan Umum') : sess.customer?.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSession(sess.id); }}
                              className="opacity-0 group-hover/sess:opacity-100 p-0.5 rounded text-rose-600 hover:bg-rose-50 transition-opacity ml-1"
                              title="Hapus topik konsultasi"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-0.5 text-[10px] w-full">
                          <span className={active ? 'text-primary-content/75' : 'text-base-content/50'}>
                            {isCustomer ? 'Marketing / CS:' : 'Produk:'}
                          </span>
                          <span className="font-semibold truncate">
                            {isCustomer ? (sess.marketing?.name || 'Menunggu Respons Marketing') : (sess.product?.nama || sess.layanan?.title || 'Pertanyaan Umum')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Button to reopen Left Sidebar if hidden */}
      {!showSessionsSidebar && (
        <button
          onClick={() => setShowSessionsSidebar(true)}
          className="absolute left-2 top-2 z-30 btn btn-circle btn-sm btn-primary text-white border-none shadow-md"
          title="Tampilkan Daftar Chat"
        >
          &rarr;
        </button>
      )}

      {/* ════════════════════ MIDDLE COLUMN: CONVERSATION ════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 bg-base-100 h-full min-h-0">
        {activeSession ? (
          <>
            {/* Header info */}
            <div className="px-5 py-3 border-b border-base-300 flex items-center justify-between shrink-0 bg-base-100 shadow-sm">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-secondary text-sm truncate">
                  {isCustomer ? (activeSession.product?.nama || activeSession.layanan?.title || 'Pertanyaan Umum') : activeSession.customer?.name}
                </h3>
                <p className="text-[10px] text-base-content/50 font-bold truncate mt-0.5">
                  {isCustomer ? `Marketing / CS: ${activeSession.marketing?.name || 'Menunggu respons'}` : `Produk: ${activeSession.product?.nama || activeSession.layanan?.title || 'Pertanyaan Umum'}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isCustomer && !activeSession.marketing_id && (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="btn btn-xs bg-primary hover:opacity-90 text-white border-none rounded-lg font-bold px-3"
                    title="Ambil alih obrolan ini sebagai marketing penanggung jawab"
                  >
                    {claiming && <span className="loading loading-spinner loading-xs"></span>}
                    Klaim Chat
                  </button>
                )}
                {!isCustomer && activeSession.marketing && (
                  <span className="text-[10px] font-bold text-base-content/50 hidden sm:inline">PIC: {activeSession.marketing.name}</span>
                )}
                {!showDocsSidebar && (
                  <button
                    onClick={() => setShowDocsSidebar(true)}
                    className="btn btn-ghost btn-xs text-primary font-bold hover:bg-primary/10"
                    title="Tampilkan Dokumen"
                  >
                    Buka Dokumen &rarr;
                  </button>
                )}
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4 bg-[#efeae2] relative custom-scrollbar" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: 'overlay', opacity: 0.95 }}>
              {/* Product Info Box (Shopee style) */}
              {activeSession.product && (
                <div className="bg-white border border-primary/20 rounded-2xl p-3 flex gap-3 shadow-sm max-w-md mx-auto items-center">
                  {activeSession.product.foto_sampul ? (
                    <img 
                      src={`http://localhost:8000/storage/${activeSession.product.foto_sampul}`} 
                      alt={activeSession.product.nama} 
                      className="w-16 h-16 object-cover rounded-xl border border-base-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-xs font-bold font-mono">
                      TI
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">Produk yang Ditanyakan</span>
                    <h4 className="font-bold text-xs text-secondary mt-1 truncate" title={activeSession.product.nama}>
                      {activeSession.product.nama}
                    </h4>
                    <p className="text-[10px] text-base-content/60 truncate mt-0.5">{activeSession.product.deskripsi_singkat}</p>
                  </div>
                  <Link 
                    to={`/produk/${activeSession.product.slug}`} 
                    target="_blank"
                    className="btn btn-xs btn-outline btn-primary rounded-lg text-[9px] font-bold py-1 h-auto"
                  >
                    Lihat Detail
                  </Link>
                </div>
              )}

              {/* Layanan Info Box */}
              {activeSession.layanan && !activeSession.product && (
                <div className="bg-white border border-primary/20 rounded-2xl p-3 flex gap-3 shadow-sm max-w-md mx-auto items-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">Layanan yang Ditanyakan</span>
                    <h4 className="font-bold text-xs text-secondary mt-1 truncate" title={activeSession.layanan.title}>
                      {activeSession.layanan.title}
                    </h4>
                    <p className="text-[10px] text-base-content/60 truncate mt-0.5">{activeSession.layanan.desc}</p>
                  </div>
                </div>
              )}

              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center text-base-content/40 px-4 space-y-1">
                  <p className="text-xs font-bold">Mulai Percakapan</p>
                  <p className="text-[10px]">Tanyakan detail produk/layanan, nego harga, atau kirim berkas dokumen di sini.</p>
                </div>
              ) : (
                messages
                  .filter(msg => !isCustomer || !(msg.message.startsWith('[Sistem] Tahapan pengerjaan diubah') || msg.message.startsWith('[Sistem] Tahapan lead diubah')))
                  .map((msg) => {
                  const isSystem = msg.message.startsWith('[Sistem]')
                  
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <span className={`text-[10px] font-semibold px-3 py-1.5 rounded-full text-center border shadow-sm shadow-black/5 ${getSystemMessageClass(msg.message)}`}>
                          {msg.message.replace('[Sistem] ', '')}
                        </span>
                      </div>
                    )
                  }

                  const isMe = msg.sender_id === user.id
                  return (
                    <div key={msg.id} className={`chat ${isMe ? 'chat-end' : 'chat-start'}`}>
                      <div className="chat-image avatar">
                        <div className="w-8 rounded-full bg-neutral text-neutral-content flex items-center justify-center text-xs font-bold">
                          {msg.sender?.avatar ? (
                            <img src={`http://localhost:8000/storage/${msg.sender.avatar}`} alt={msg.sender?.name} />
                          ) : (
                            msg.sender?.name ? msg.sender.name.charAt(0).toUpperCase() : '?'
                          )}
                        </div>
                      </div>
                      <div className="chat-header text-[10px] text-base-content/50 font-bold mb-0.5">
                        {msg.sender?.name}
                      </div>
                      <div className={`chat-bubble text-xs leading-relaxed max-w-sm rounded-2xl relative group border-none shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] py-2 px-3 ${
                        isMe ? 'bg-[#d9fdd3] text-[#111b21]' : 'bg-white text-[#111b21]'
                      }`}>
                        {editingMessageId === msg.id ? (
                          <form onSubmit={(e) => handleSaveEdit(e, msg.id)} className="flex flex-col gap-1.5 min-w-[200px] py-0.5">
                            <input
                              type="text"
                              className="input input-bordered input-xs w-full text-xs text-[#111b21] bg-white rounded-lg focus:outline-none"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => { setEditingMessageId(null); setEditingText(''); }}
                                className="btn btn-ghost btn-xs text-[10px] text-slate-500 hover:text-[#111b21] hover:bg-slate-100/50"
                              >
                                Batal
                              </button>
                              <button
                                type="submit"
                                className="btn btn-secondary btn-xs text-[10px] text-white border-0 bg-primary hover:bg-primary-hover"
                                disabled={!editingText.trim()}
                              >
                                Simpan
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="inline-flex items-end gap-3 max-w-full break-all">
                            <span className="text-[13px] leading-relaxed break-words whitespace-pre-wrap select-text">
                              {msg.message}
                            </span>
                            <div className="inline-flex items-center gap-1 text-[9px] text-[#667781] shrink-0 select-none pb-0.5">
                              {msg.is_edited && <span className="italic text-[#667781]/80 font-medium">(diedit)</span>}
                              <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && (
                                msg.is_read ? (
                                  <span className="text-[#53bdeb] flex items-center shrink-0" title="Dibaca">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 15" width="16" height="15" fill="none">
                                      <path d="M15 3L7 11l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M11.5 3L7.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M8.5 11l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </span>
                                ) : (
                                  <span className="text-[#8696a0] flex items-center shrink-0" title="Terkirim">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 15" width="16" height="15" fill="none">
                                      <path d="M15 3L7 11l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M11.5 3L7.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M8.5 11l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Edit & Delete Button overlay on hover */}
                        {editingMessageId !== msg.id && (
                          <div className={`absolute ${isMe ? '-left-16' : '-right-16'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white border border-base-300 p-1 rounded-xl shadow-md z-30`}>
                            {isMe && (
                              <button
                                onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.message); }}
                                className="p-1 rounded-lg text-slate-500 hover:bg-base-200 hover:text-secondary cursor-pointer"
                                title="Edit pesan"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 rounded-lg text-error hover:bg-red-50 cursor-pointer"
                              title="Hapus pesan"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Chat Input form */}
            <div className="p-4 border-t border-base-300 bg-base-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered rounded-xl flex-1 text-sm focus:border-primary/50 focus:outline-none"
                    placeholder="Tulis pesan Anda..."
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary rounded-xl text-white font-bold px-4 border-none shadow-md shadow-primary/10"
                    disabled={sendingMessage || !typedMessage.trim()}
                  >
                    Kirim
                  </button>
                </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center text-base-content/40 p-10 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-base-200 flex items-center justify-center text-base-content/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-secondary">Pilih Obrolan</h3>
              <p className="text-xs leading-relaxed max-w-xs mx-auto mt-1">Silakan pilih salah satu klien atau obrolan di sebelah kiri untuk melihat pesan.</p>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop overlay for mobile docs sidebar */}
      {activeSession && showDocsSidebar && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setShowDocsSidebar(false)}
        />
      )}

      {/* ════════════════════ RIGHT COLUMN: FILES AND SHARING (SkPL) ════════════════════ */}
      {activeSession && showDocsSidebar && (
        <div className="absolute right-0 md:relative z-40 w-64 sm:w-72 border-l border-base-300 flex flex-col shrink-0 bg-base-50 h-full min-h-0 transition-all duration-300">
          
          {/* Header */}
          <div className="p-4 border-b border-base-300 bg-base-100 shrink-0 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-secondary text-sm">Dokumen & Lampiran</h3>
              <p className="text-[10px] text-base-content/50 font-semibold uppercase tracking-wider mt-0.5">
                Berkas SkPL & Proposal
              </p>
            </div>
            <button 
              onClick={() => setShowDocsSidebar(false)} 
              className="btn btn-ghost btn-xs text-base-content/55 font-bold hover:bg-base-200"
              title="Sembunyikan Dokumen"
            >
              &rarr;
            </button>
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 custom-scrollbar">
            {files.length === 0 ? (
              <div className="text-center py-10 text-base-content/40 space-y-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mx-auto opacity-35" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-[11px] font-bold">Belum ada dokumen</p>
                <p className="text-[10px] leading-relaxed">Kedua belah pihak dapat mengunggah berkas untuk proyek ini.</p>
              </div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="p-3 bg-white border border-base-200 rounded-2xl flex flex-col gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-secondary truncate" title={file.file_name}>
                        {file.file_name}
                      </p>
                      <p className="text-[10px] text-base-content/50 mt-0.5 font-medium">
                        Oleh: {file.uploader?.name}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 bg-base-50 rounded-xl border border-base-100 text-[10px] text-base-content/70 leading-relaxed font-semibold">
                    Keterangan: {file.keterangan}
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-base-content/40 border-t border-base-100 pt-2 mt-1">
                    <span>{new Date(file.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    <div className="flex items-center gap-2 font-bold">
                      {file.uploader_id === user.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFileId(file.id)
                              setEditingFileKeterangan(file.keterangan)
                              setEditingFileObj(file)
                            }}
                            className="text-amber-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-error hover:underline"
                          >
                            Hapus
                          </button>
                        </>
                      )}
                      <a
                        href={`http://localhost:8000/storage/${file.file_path}`}
                        download={file.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        Download &darr;
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* File upload form / Edit form */}
          <div className="p-4 border-t border-base-300 bg-base-100 shrink-0">
            {editingFileId ? (
              <form onSubmit={handleUpdateFile} className="space-y-3">
                <div className="text-[10px] font-bold text-amber-600 flex justify-between items-center">
                  <span>Mode Edit: {editingFileObj?.file_name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFileId(null)
                      setEditingFileKeterangan('')
                      setEditingFileKeteranganFile(null)
                      setEditingFileObj(null)
                    }}
                    className="text-base-content/50 hover:text-error"
                  >
                    Batal
                  </button>
                </div>

                <div className="form-control">
                  <label className="label py-0.5"><span className="label-text text-[10px] font-bold">Ganti Berkas (Opsional)</span></label>
                  <input
                    type="file"
                    onChange={(e) => setEditingFileKeteranganFile(e.target.files[0] || null)}
                    className="file-input file-input-bordered file-input-warning file-input-xs rounded-xl w-full text-[11px]"
                  />
                </div>

                <div className="form-control">
                  <label className="label py-0.5"><span className="label-text text-[10px] font-bold">Keterangan Dokumen</span></label>
                  <input
                    type="text"
                    placeholder="Keterangan dokumen..."
                    className="input input-bordered input-xs rounded-xl text-xs w-full focus:border-primary/50 focus:outline-none"
                    value={editingFileKeterangan}
                    onChange={(e) => setEditingFileKeterangan(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingFile || !editingFileKeterangan.trim()}
                  className="btn btn-warning btn-xs w-full text-secondary font-bold rounded-xl h-8 border-none"
                >
                  {updatingFile ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    'Simpan Berkas'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleFileUpload} className="space-y-3">
                <div className="form-control">
                  <input
                    type="file"
                    id="chat-file-input"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="file-input file-input-bordered file-input-primary file-input-xs rounded-xl w-full text-[11px]"
                    required
                  />
                </div>

                <div className="form-control">
                  <input
                    type="text"
                    placeholder="Keterangan dokumen (wajib)..."
                    className="input input-bordered input-xs rounded-xl text-xs w-full focus:border-primary/50 focus:outline-none"
                    value={fileKeterangan}
                    onChange={(e) => setFileKeterangan(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingFile || !selectedFile || !fileKeterangan.trim()}
                  className="btn btn-primary btn-xs w-full text-white font-bold rounded-xl h-8 border-none"
                >
                  {uploadingFile ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    'Unggah Berkas'
                  )}
                </button>
              </form>
            )}
          </div>

        </div>
      )}

      <ModalComponent />
    </div>
  )
}
