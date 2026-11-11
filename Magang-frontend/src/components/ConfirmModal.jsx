import React from 'react'

export function useConfirmModal() {
  const [modal, setModal] = React.useState({
    show: false,
    title: 'Konfirmasi',
    message: 'Apakah Anda yakin ingin melakukan tindakan ini?',
    onConfirm: null,
    confirmLabel: 'Hapus',
    tone: 'danger',
  })

  // options: { confirmLabel?: string, tone?: 'danger' | 'success' }
  const confirm = (message, onConfirm, title = 'Konfirmasi Tindakan', options = {}) => {
    setModal({
      show: true,
      title,
      message,
      confirmLabel: options.confirmLabel || 'Hapus',
      tone: options.tone || 'danger',
      onConfirm: () => {
        onConfirm()
        close()
      }
    })
  }

  const close = () => {
    setModal(prev => ({ ...prev, show: false }))
  }

  const ModalComponent = () => {
    if (!modal.show) return null
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-base-200 shadow-2xl flex flex-col space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${modal.tone === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center shrink-0`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-extrabold text-secondary text-sm sm:text-base leading-tight">{modal.title}</h3>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-base-content/75 leading-relaxed">{modal.message}</p>
          <div className="flex gap-2 justify-end pt-2">
            <button 
              type="button" 
              onClick={close} 
              className="btn btn-xs sm:btn-sm btn-ghost rounded-xl font-bold px-4 hover:bg-base-200 text-slate-500"
            >
              Batal
            </button>
            <button 
              type="button" 
              onClick={modal.onConfirm} 
              className={`btn btn-xs sm:btn-sm ${modal.tone === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'} text-white rounded-xl font-bold px-4 border-none shadow-sm`}
            >
              {modal.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return { confirm, ModalComponent }
}
