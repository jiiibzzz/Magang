<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Penawaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PenawaranController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Penawaran::with(['marketing', 'customer', 'produk', 'layanan', 'proyekTerkait']);

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
            'proyek_id' => 'nullable|exists:proyeks,id',
            'produk_id' => 'nullable|exists:produks,id_produk',
            'layanan_id' => 'nullable|exists:layanan,id_layanan',
            'judul' => 'required|string|max:255',
            'deskripsi' => 'required|string',
            'harga' => 'nullable|numeric|min:0',
            'brosur' => 'required|file|max:10240', // Brosur wajib jika buat baru
        ]);

        $data = $request->only('customer_id', 'proyek_id', 'produk_id', 'layanan_id', 'judul', 'deskripsi', 'harga');
        $data['marketing_id'] = $request->user()->id;
        $data['status'] = 'pending';

        if ($request->hasFile('brosur')) {
            $data['brosur_path'] = $request->file('brosur')->store('brosur_penawaran', 'public');
        }

        $penawaran = Penawaran::create($data);

        return response()->json($penawaran->load(['marketing', 'customer', 'produk', 'layanan']), 201);
    }

    public function show($id)
    {
        $penawaran = Penawaran::with(['marketing', 'customer', 'produk', 'layanan', 'proyekTerkait'])->findOrFail($id);
        return response()->json($penawaran);
    }

    public function update(Request $request, $id)
    {
        $penawaran = Penawaran::findOrFail($id);

        if ($penawaran->status === 'diterima') {
            return response()->json([
                'message' => 'Penawaran yang sudah diterima dan menjadi deal tidak dapat diubah lagi.'
            ], 422);
        }

        $request->validate([
            'customer_id' => 'required|exists:users,id',
            'proyek_id' => 'nullable|exists:proyeks,id',
            'produk_id' => 'nullable|exists:produks,id_produk',
            'layanan_id' => 'nullable|exists:layanan,id_layanan',
            'judul' => 'required|string|max:255',
            'deskripsi' => 'required|string',
            'harga' => 'nullable|numeric|min:0',
            'brosur' => 'nullable|file|max:10240',
        ]);

        $data = $request->only('customer_id', 'proyek_id', 'produk_id', 'layanan_id', 'judul', 'deskripsi', 'harga');

        if ($request->hasFile('brosur')) {
            if ($penawaran->brosur_path) {
                Storage::disk('public')->delete($penawaran->brosur_path);
            }
            $data['brosur_path'] = $request->file('brosur')->store('brosur_penawaran', 'public');
        }

        $penawaran->update($data);

        return response()->json($penawaran->load(['marketing', 'customer', 'produk', 'layanan']));
    }

    public function updateStatus(Request $request, $id)
    {
        $penawaran = Penawaran::findOrFail($id);
        $user = $request->user();

        // Customer hanya dapat menyetujui / menolak penawaran miliknya sendiri
        // Marketing / Admin dapat mengelola penawaran
        $isMarketingOrAdmin = $user->hasRole(['admin', 'marketing', 'super admin']) 
            || $user->hasPermissionTo('kelola_penawaran');

        if (!$isMarketingOrAdmin && (int) $penawaran->customer_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses untuk mengubah status penawaran ini.'
            ], 403);
        }

        $request->validate([
            'status' => 'required|in:diterima,ditolak',
        ]);

        // Guard: penawaran yang sudah diterima tidak boleh diubah lagi
        // (mencegah reset tanggal_deal & proyek duplikat)
        if ($penawaran->status === 'diterima') {
            return response()->json(['message' => 'Penawaran sudah diterima sebelumnya dan tidak dapat diubah lagi.'], 409);
        }

        $updateData = ['status' => $request->status];
        if ($request->status === 'diterima') {
            $updateData['tanggal_deal'] = now();
        }
        $penawaran->update($updateData);

        if ($request->status === 'diterima') {
            if ($penawaran->proyek_id) {
                // Penawaran respons terhadap tawaran customer → update proyek yang sudah ada
                $proyek = \App\Models\Proyek::find($penawaran->proyek_id);
                if ($proyek) {
                    $timeline = $proyek->timeline ?? [];
                    $timeline[] = [
                        'judul' => 'Penawaran Disetujui Customer (Harga Final)',
                        'deskripsi' => 'Customer menyetujui penawaran dengan harga final Rp ' . number_format($penawaran->harga, 0, ',', '.') . '. Proyek masuk tahap Proses Pengerjaan.',
                        'tanggal' => date('Y-m-d'),
                        'selesai' => true,
                    ];
                    $proyek->update([
                        'penawaran_id' => $penawaran->id,
                        'status_proyek' => 'Proses Pengerjaan',
                        'progress' => 70,
                        'harga_kontrak' => $penawaran->harga,
                        'harga_tawaran' => null,
                        'alasan_tawaran' => null,
                        'timeline' => $timeline,
                    ]);
                }
            } else {
                // Penawaran marketing-initiated → buat proyek baru
                $existingProyek = \App\Models\Proyek::where('penawaran_id', $penawaran->id)->first();
                if (!$existingProyek) {
                    \App\Models\Proyek::create([
                        'penawaran_id' => $penawaran->id,
                        'customer_id' => $penawaran->customer_id,
                        'layanan_id' => $penawaran->layanan_id,
                        'nama_proyek' => $penawaran->judul,
                        'deskripsi_kebutuhan' => $penawaran->deskripsi,
                        'harga_kontrak' => $penawaran->harga,
                        'progress' => 0,
                        'status_proyek' => 'pengajuan',
                        'timeline' => [
                            [
                                'judul' => 'Inisiasi Proyek',
                                'deskripsi' => 'Proyek dibentuk dari penawaran yang diterima.',
                                'tanggal' => date('Y-m-d'),
                                'selesai' => true
                            ]
                        ],
                        'dokumentasi' => []
                    ]);
                }
            }
        }

        return response()->json($penawaran->load(['marketing', 'customer', 'produk', 'layanan']));
    }

    public function destroy($id)
    {
        $penawaran = Penawaran::findOrFail($id);

        if ($penawaran->status === 'diterima') {
            return response()->json([
                'message' => 'Penawaran yang sudah berstatus diterima (deal) tidak dapat dihapus.'
            ], 422);
        }

        if ($penawaran->brosur_path) {
            Storage::disk('public')->delete($penawaran->brosur_path);
        }
        $penawaran->delete();

        return response()->json(['message' => 'Penawaran berhasil dihapus']);
    }
}
