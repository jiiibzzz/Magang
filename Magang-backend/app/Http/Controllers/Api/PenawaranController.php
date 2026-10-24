<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Negosiasi;
use App\Models\Notifikasi;
use App\Models\Penawaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PenawaranController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Penawaran::with(['marketing', 'customer', 'produk', 'layanan', 'negosiasi:id,penawaran_id,status,tahap']);

        if ($user->hasRole('customer')) {
            $query->where('customer_id', $user->id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('judul', 'like', "%{$search}%")
                  ->orWhere('deskripsi', 'like', "%{$search}%");
            });
        }

        return response()->json($query->latest()->paginate(10));
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:users,id',
            'produk_id' => 'nullable|exists:produks,id_produk',
            'layanan_id' => 'nullable|exists:layanan,id_layanan',
            'judul' => 'required|string|max:255',
            'deskripsi' => 'required|string',
            'harga' => 'nullable|numeric|min:0',
            'brosur' => 'required|file|max:10240', // Brosur wajib jika buat baru
            'chat_session_id' => 'nullable|exists:chat_sessions,id',
        ]);

        $data = $request->only('customer_id', 'produk_id', 'layanan_id', 'judul', 'deskripsi', 'harga');
        $data['marketing_id'] = $request->user()->id;
        $data['status'] = 'pending';
        $data['chat_session_id'] = $this->tentukanChatSessionId($request);

        if ($request->hasFile('brosur')) {
            $data['brosur_path'] = $request->file('brosur')->store('brosur_penawaran', 'public');
        }

        $penawaran = Penawaran::create($data);

        return response()->json($penawaran->load(['marketing', 'customer', 'produk', 'layanan']), 201);
    }

    public function show($id)
    {
        $penawaran = Penawaran::with(['marketing', 'customer', 'produk', 'layanan'])->findOrFail($id);
        return response()->json($penawaran);
    }

    public function update(Request $request, $id)
    {
        $penawaran = Penawaran::findOrFail($id);

        $request->validate([
            'customer_id' => 'required|exists:users,id',
            'produk_id' => 'nullable|exists:produks,id_produk',
            'layanan_id' => 'nullable|exists:layanan,id_layanan',
            'judul' => 'required|string|max:255',
            'deskripsi' => 'required|string',
            'harga' => 'nullable|numeric|min:0',
            'brosur' => 'nullable|file|max:10240',
        ]);

        $data = $request->only('customer_id', 'produk_id', 'layanan_id', 'judul', 'deskripsi', 'harga');

        if ($request->hasFile('brosur')) {
            if ($penawaran->brosur_path) {
                Storage::disk('public')->delete($penawaran->brosur_path);
            }
            $data['brosur_path'] = $request->file('brosur')->store('brosur_penawaran', 'public');
        }

        $penawaran->update($data);

        return response()->json($penawaran->load(['marketing', 'customer', 'produk', 'layanan']));
    }

    /**
     * Customer menanggapi penawaran awal.
     *
     * Diubah untuk Sistem Negosiasi:
     * - "diterima" sekarang berarti customer setuju LANJUT KE PEMBAHASAN PROYEK,
     *   bukan setuju harga. Harga di penawaran awal hanya indikatif.
     * - Yang dibuat adalah sesi Negosiasi, bukan Proyek. Proyek dibuat nanti
     *   setelah kesepakatan dikunci.
     * - tanggal_deal TIDAK diisi di sini, supaya analisis RFM dan Riwayat
     *   Transaksi hanya menghitung negosiasi yang benar-benar berhasil.
     * - Hanya customer pemilik penawaran yang boleh menanggapi, dan hanya
     *   selama penawaran masih "pending".
     */
    public function updateStatus(Request $request, $id)
    {
        $penawaran = Penawaran::findOrFail($id);
        $user = $request->user();

        if ((int) $user->id !== (int) $penawaran->customer_id) {
            return response()->json(['message' => 'Hanya customer pemilik penawaran yang dapat menanggapi penawaran ini.'], 403);
        }

        if ($penawaran->status !== 'pending') {
            return response()->json(['message' => 'Penawaran ini sudah ditanggapi sebelumnya.'], 409);
        }

        $request->validate([
            'status' => 'required|in:diterima,ditolak',
        ]);

        DB::transaction(function () use ($penawaran, $request, $user) {
            $penawaran->update(['status' => $request->status]);

            if ($request->status !== 'diterima') {
                return;
            }

            $negosiasi = Negosiasi::create([
                'penawaran_id' => $penawaran->id,
                'chat_session_id' => $penawaran->chat_session_id,
                'customer_id' => $penawaran->customer_id,
                'marketing_id' => $penawaran->marketing_id,
                'status' => Negosiasi::STATUS_AKTIF,
                'tahap' => Negosiasi::TAHAP_MENYUSUN_PERTANYAAN,
            ]);

            if ($penawaran->chatSession) {
                $statusLama = $penawaran->chatSession->status;
                $penawaran->chatSession->update(['status' => 'Negosiasi']);

                ChatMessage::create([
                    'chat_session_id' => $penawaran->chat_session_id,
                    'sender_id' => $user->id,
                    'message' => '[Sistem] Tahapan lead diubah dari "' . $statusLama . '" menjadi "Negosiasi".',
                ]);
            }

            Notifikasi::create([
                'negosiasi_id' => $negosiasi->id,
                'user_id' => $penawaran->marketing_id,
                'judul' => 'Customer lanjut ke pembahasan proyek',
                'pesan' => 'Customer menerima penawaran "' . $penawaran->judul . '". Silakan kirim pertanyaan kebutuhan proyek.',
            ]);
        });

        return response()->json($penawaran->fresh()->load(['marketing', 'customer', 'produk', 'layanan', 'negosiasi']));
    }

    /**
     * Cari sesi chat untuk penawaran: pakai yang dikirim marketing kalau ada
     * (dan memang milik customer yang sama), kalau tidak ambil sesi chat aktif
     * terbaru milik customer tersebut.
     */
    private function tentukanChatSessionId(Request $request): ?int
    {
        if ($request->filled('chat_session_id')) {
            $sesi = ChatSession::where('id', $request->chat_session_id)
                ->where('customer_id', $request->customer_id)
                ->first();

            return $sesi?->id;
        }

        return ChatSession::where('customer_id', $request->customer_id)
            ->where('status', '!=', 'Arsip')
            ->latest()
            ->value('id');
    }

    public function destroy($id)
    {
        $penawaran = Penawaran::findOrFail($id);

        // Penawaran yang sudah masuk negosiasi tidak boleh dihapus,
        // supaya riwayat negosiasi dan kesepakatannya tidak hilang.
        if ($penawaran->negosiasi()->exists()) {
            return response()->json(['message' => 'Penawaran ini sudah masuk tahap negosiasi dan tidak dapat dihapus.'], 409);
        }

        if ($penawaran->brosur_path) {
            Storage::disk('public')->delete($penawaran->brosur_path);
        }
        $penawaran->delete();

        return response()->json(['message' => 'Penawaran berhasil dihapus']);
    }
}
