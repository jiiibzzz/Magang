<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proyek;
use App\Models\ChatSession;
use App\Services\Negosiasi\NegosiasiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProyekController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Proyek::with(['penawaran', 'customer', 'layanan', 'chatSession', 'sesiNegosiasi:id,proyek_id,status,tahap,menunggu_respons_dari']);

        if ($user->hasRole('customer')) {
            $query->where('customer_id', $user->id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_proyek', 'like', "%{$search}%")
                  ->orWhere('deskripsi_kebutuhan', 'like', "%{$search}%")
                  ->orWhere('status_proyek', 'like', "%{$search}%");
            });
        }

        return response()->json($query->latest()->paginate(10));
    }

    public function store(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'layanan_id' => 'required|exists:layanan,id_layanan',
            'nama_proyek' => 'required|string|max:255',
            'deskripsi_kebutuhan' => 'required|string',
        ]);

        $proyek = Proyek::create([
            'customer_id' => $user->id,
            'layanan_id' => $request->layanan_id,
            'nama_proyek' => $request->nama_proyek,
            'deskripsi_kebutuhan' => $request->deskripsi_kebutuhan,
            'progress' => 0,
            'status_proyek' => 'pengajuan',
            'timeline' => [
                [
                    'judul' => 'Pengajuan Proyek',
                    'deskripsi' => 'Pengajuan brief proyek oleh customer.',
                    'tanggal' => date('Y-m-d'),
                    'selesai' => true
                ]
            ],
            'dokumentasi' => []
        ]);

        // Cek apakah ada chat session aktif milik customer ini untuk dihubungkan
        $activeChat = ChatSession::where('customer_id', $user->id)
            ->where('status', '!=', 'Arsip')
            ->latest()
            ->first();

        if ($activeChat) {
            $proyek->update(['chat_session_id' => $activeChat->id]);
        }

        return response()->json($proyek->load(['customer', 'layanan', 'chatSession']), 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $proyek = Proyek::with(['penawaran', 'customer', 'layanan', 'chatSession', 'sesiNegosiasi:id,proyek_id,status,tahap,menunggu_respons_dari'])->findOrFail($id);

        if ($user->hasRole('customer') && (int) $proyek->customer_id !== (int) $user->id) {
            return response()->json(['message' => 'Anda tidak memiliki akses ke proyek ini.'], 403);
        }

        return response()->json($proyek);
    }

    public function update(Request $request, $id)
    {
        $proyek = Proyek::findOrFail($id);

        $request->validate([
            'nama_proyek' => 'required|string|max:255',
            'deskripsi_kebutuhan' => 'required|string',
            'progress' => 'required|integer|min:0|max:100',
            'status_proyek' => 'required|string|in:pengajuan,ditolak,negosiasi,Proses Pengerjaan,Selesai,Maintenance,Arsip',
            'alasan_penolakan' => 'nullable|string',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date',
            'timeline' => 'nullable|array',
        ]);

        $data = $request->only('nama_proyek', 'deskripsi_kebutuhan', 'progress', 'status_proyek', 'alasan_penolakan', 'tanggal_mulai', 'tanggal_selesai');

        if (in_array($request->status_proyek, ['Selesai', 'Arsip']) && empty($data['tanggal_selesai']) && empty($proyek->tanggal_selesai)) {
            $data['tanggal_selesai'] = date('Y-m-d');
        }

        if ($request->has('timeline')) {
            $data['timeline'] = $request->timeline;
        }

        if (in_array($request->status_proyek, ['Selesai', 'Arsip'])) {
            $timeline = $data['timeline'] ?? $proyek->timeline ?? [];
            $hasSelesai = collect($timeline)->contains(function ($item) {
                return str_contains(strtolower($item['judul'] ?? ''), 'selesai');
            });
            if (!$hasSelesai) {
                $timeline[] = [
                    'judul' => 'Tahap Selesai',
                    'deskripsi' => 'Proyek telah selesai dikerjakan sesuai spesifikasi dan kontrak.',
                    'tanggal' => date('Y-m-d'),
                    'selesai' => true,
                ];
                $data['timeline'] = $timeline;
            }
        }

        $proyek->update($data);

        return response()->json($proyek->load(['penawaran', 'customer', 'layanan', 'chatSession']));
    }

    public function validasi(Request $request, $id)
    {
        $proyek = Proyek::findOrFail($id);

        if ($proyek->status_proyek !== 'pengajuan') {
            return response()->json([
                'message' => 'Validasi awal hanya dapat dilakukan pada proyek dengan status pengajuan.'
            ], 422);
        }

        $request->validate([
            'aksi' => 'required|in:terima,tolak',
            'alasan_penolakan' => 'nullable|string|max:1000',
        ]);

        $timeline = $proyek->timeline ?? [];

        if ($request->aksi === 'terima') {
            $timeline[] = [
                'judul' => 'Pengajuan Diterima - Sesi Negosiasi Dibuka',
                'deskripsi' => 'Tim marketing menerima pengajuan proyek dan membuka sesi negosiasi (pertanyaan kebutuhan, rancangan, penawaran harga).',
                'tanggal' => date('Y-m-d'),
                'selesai' => true,
            ];

            DB::transaction(function () use ($proyek, $timeline, $request) {
                $proyek->update([
                    'status_proyek' => 'negosiasi',
                    'progress' => 20,
                    'alasan_penolakan' => null,
                    'timeline' => $timeline,
                ]);

                app(NegosiasiService::class)->bukaSesi($proyek, $request->user());
            });
        } else {
            $alasan = $request->alasan_penolakan ?: 'Pengajuan proyek belum dapat kami proses saat ini.';
            $timeline[] = [
                'judul' => 'Pengajuan Ditolak',
                'deskripsi' => 'Catatan: ' . $alasan,
                'tanggal' => date('Y-m-d'),
                'selesai' => true,
            ];

            $proyek->update([
                'status_proyek' => 'ditolak',
                'progress' => 0,
                'alasan_penolakan' => $alasan,
                'timeline' => $timeline,
            ]);
        }

        return response()->json($proyek->load(['penawaran', 'customer', 'layanan', 'sesiNegosiasi']));
    }

    public function uploadDokumentasi(Request $request, $id)
    {
        $proyek = Proyek::findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:20480', // 20MB
            'keterangan' => 'required|string|max:255',
        ]);

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        $filePath = $file->store('proyek_dokumentasi', 'public');

        $dokumenList = $proyek->dokumentasi ?? [];
        $dokumenList[] = [
            'id' => uniqid(),
            'file_name' => $fileName,
            'file_path' => $filePath,
            'keterangan' => $request->keterangan,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $proyek->update([
            'dokumentasi' => $dokumenList
        ]);

        return response()->json($proyek->load(['penawaran', 'customer', 'layanan']));
    }

    public function deleteDokumentasi(Request $request, $id, $dokumenId)
    {
        $proyek = Proyek::findOrFail($id);
        $dokumenList = $proyek->dokumentasi ?? [];

        $filtered = [];
        foreach ($dokumenList as $dok) {
            if ($dok['id'] === $dokumenId) {
                Storage::disk('public')->delete($dok['file_path']);
            } else {
                $filtered[] = $dok;
            }
        }

        $proyek->update([
            'dokumentasi' => $filtered
        ]);

        return response()->json($proyek->load(['penawaran', 'customer', 'layanan']));
    }

    public function destroy($id)
    {
        $proyek = Proyek::findOrFail($id);
        $dokumenList = $proyek->dokumentasi ?? [];
        foreach ($dokumenList as $dok) {
            Storage::disk('public')->delete($dok['file_path']);
        }
        $proyek->delete();

        return response()->json(['message' => 'Proyek berhasil dihapus']);
    }
}
