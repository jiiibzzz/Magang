<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Penawaran;
use App\Models\Proyek;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RiwayatTransaksiController extends Controller
{
    public function customerIndex(Request $request)
    {
        $userId = $request->user()->id;

        // Ambil penawaran yang sudah deal
        $penawarans = Penawaran::with(['marketing', 'produk', 'layanan', 'proyek'])
            ->where('customer_id', $userId)
            ->where('status', 'diterima')
            ->whereNotNull('tanggal_deal');

        if ($request->filled('search')) {
            $search = $request->search;
            $penawarans->where(function ($q) use ($search) {
                $q->where('judul', 'like', "%{$search}%")
                  ->orWhere('deskripsi', 'like', "%{$search}%");
            });
        }
        if ($request->filled('dari')) {
            $penawarans->whereDate('tanggal_deal', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $penawarans->whereDate('tanggal_deal', '<=', $request->sampai);
        }

        // Ambil proyek yang statusnya Selesai atau Arsip tanpa penawaran (proyek langsung)
        $proyeksLangsung = Proyek::with(['customer', 'layanan', 'chatSession.marketing'])
            ->where('customer_id', $userId)
            ->whereIn('status_proyek', ['Selesai', 'selesai', 'Arsip'])
            ->whereNull('penawaran_id');

        if ($request->filled('search')) {
            $search = $request->search;
            $proyeksLangsung->where(function ($q) use ($search) {
                $q->where('nama_proyek', 'like', "%{$search}%")
                  ->orWhere('deskripsi_kebutuhan', 'like', "%{$search}%");
            });
        }
        if ($request->filled('dari')) {
            $proyeksLangsung->whereDate('updated_at', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $proyeksLangsung->whereDate('updated_at', '<=', $request->sampai);
        }

        // Standardisasi bentuk output
        $dealItems = $penawarans->latest('tanggal_deal')->get()->map(function ($p) {
            return [
                'id' => 'p-' . $p->id,
                'sumber' => 'penawaran',
                'judul' => $p->judul,
                'deskripsi' => $p->deskripsi,
                'produk' => $p->produk,
                'layanan' => $p->layanan,
                'marketing' => $p->marketing,
                'customer' => $p->customer,
                'harga' => $p->harga,
                'tanggal_deal' => $p->tanggal_deal,
                'status_proyek' => $p->proyek?->status_proyek ?: 'Selesai',
                'proyek' => $p->proyek,
            ];
        });

        $proyekItems = $proyeksLangsung->latest('updated_at')->get()->map(function ($pr) {
            return [
                'id' => 'pr-' . $pr->id,
                'sumber' => 'proyek',
                'judul' => $pr->nama_proyek,
                'deskripsi' => $pr->deskripsi_kebutuhan,
                'produk' => null,
                'layanan' => $pr->layanan,
                'marketing' => $pr->chatSession?->marketing,
                'customer' => $pr->customer,
                'harga' => $pr->harga_kontrak, // Harga kontrak yang sudah deal
                'tanggal_deal' => $pr->tanggal_selesai ?: $pr->updated_at,
                'status_proyek' => $pr->status_proyek,
                'proyek' => $pr,
            ];
        });

        $merged = $dealItems->concat($proyekItems)->sortByDesc('tanggal_deal')->values();

        // Paginate manual
        $page = (int) $request->input('page', 1);
        $perPage = 10;
        $total = $merged->count();
        $items = $merged->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $items,
            'current_page' => $page,
            'last_page' => (int) ceil($total / $perPage),
            'total' => $total,
        ]);
    }

    public function marketingIndex(Request $request)
    {
        // 1. Ambil Penawaran Diterima
        $penawarans = Penawaran::with(['customer', 'marketing', 'produk', 'layanan', 'proyek'])
            ->where('status', 'diterima')
            ->whereNotNull('tanggal_deal');

        if ($request->filled('search')) {
            $search = $request->search;
            $penawarans->where(function ($q) use ($search) {
                $q->where('judul', 'like', "%{$search}%")
                  ->orWhereHas('customer', fn($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }
        if ($request->filled('customer_id')) {
            $penawarans->where('customer_id', $request->customer_id);
        }
        if ($request->filled('dari')) {
            $penawarans->whereDate('tanggal_deal', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $penawarans->whereDate('tanggal_deal', '<=', $request->sampai);
        }

        // 2. Ambil Proyek yang Selesai / Arsip langsung tanpa penawaran
        $proyeksLangsung = Proyek::with(['customer', 'layanan', 'chatSession.marketing'])
            ->whereIn('status_proyek', ['Selesai', 'selesai', 'Arsip'])
            ->whereNull('penawaran_id');

        if ($request->filled('search')) {
            $search = $request->search;
            $proyeksLangsung->where(function ($q) use ($search) {
                $q->where('nama_proyek', 'like', "%{$search}%")
                  ->orWhereHas('customer', fn($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }
        if ($request->filled('customer_id')) {
            $proyeksLangsung->where('customer_id', $request->customer_id);
        }
        if ($request->filled('dari')) {
            $proyeksLangsung->whereDate('updated_at', '>=', $request->dari);
        }
        if ($request->filled('sampai')) {
            $proyeksLangsung->whereDate('updated_at', '<=', $request->sampai);
        }

        $dealItems = $penawarans->get()->map(function ($p) {
            return [
                'id' => 'p-' . $p->id,
                'sumber' => 'penawaran',
                'customer_id' => $p->customer_id,
                'customer' => $p->customer,
                'marketing' => $p->marketing,
                'produk' => $p->produk,
                'layanan' => $p->layanan,
                'judul' => $p->judul,
                'deskripsi' => $p->deskripsi,
                'harga' => (float) $p->harga,
                'tanggal_deal' => $p->tanggal_deal,
                'status_proyek' => $p->proyek?->status_proyek ?: 'Selesai',
                'proyek' => $p->proyek,
            ];
        });

        $proyekItems = $proyeksLangsung->get()->map(function ($pr) {
            return [
                'id' => 'pr-' . $pr->id,
                'sumber' => 'proyek',
                'customer_id' => $pr->customer_id,
                'customer' => $pr->customer,
                'marketing' => $pr->chatSession?->marketing,
                'produk' => null,
                'layanan' => $pr->layanan,
                'judul' => $pr->nama_proyek,
                'deskripsi' => $pr->deskripsi_kebutuhan,
                'harga' => $pr->harga_kontrak,
                'tanggal_deal' => $pr->tanggal_selesai ?: $pr->updated_at,
                'status_proyek' => $pr->status_proyek,
                'proyek' => $pr,
            ];
        });

        $allMerged = $dealItems->concat($proyekItems);

        // Sorting
        $sort = $request->input('sort', 'terbaru');
        if ($sort === 'terlama') {
            $allMerged = $allMerged->sortBy('tanggal_deal')->values();
        } elseif ($sort === 'harga_tertinggi') {
            $allMerged = $allMerged->sortByDesc('harga')->values();
        } elseif ($sort === 'harga_terendah') {
            $allMerged = $allMerged->sortBy('harga')->values();
        } else {
            $allMerged = $allMerged->sortByDesc('tanggal_deal')->values();
        }

        // Ringkasan Summary
        $totalNilai = $allMerged->whereNotNull('harga')->sum('harga');
        $distinctCustomers = $allMerged->pluck('customer_id')->unique()->count();
        $summary = [
            'total_transaksi' => $allMerged->count(),
            'total_nilai' => $totalNilai,
            'total_customer' => $distinctCustomers,
        ];

        // Top Customers (berdasarkan frekuensi transaksi deal & proyek tuntas)
        $groupedCustomers = $allMerged->groupBy('customer_id')->map(function ($group) {
            $first = $group->first();
            return [
                'customer_id' => $first['customer_id'],
                'name' => $first['customer']?->name ?? 'User',
                'email' => $first['customer']?->email ?? '-',
                'phone' => $first['customer']?->phone ?? '-',
                'jumlah_transaksi' => $group->count(),
                'total_harga' => $group->whereNotNull('harga')->sum('harga'),
                'terakhir_deal' => $group->max('tanggal_deal'),
            ];
        })->sortByDesc('jumlah_transaksi')->values()->take(10);

        // Pagination
        $page = (int) $request->input('page', 1);
        $perPage = 10;
        $total = $allMerged->count();
        $items = $allMerged->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => [
                'data' => $items,
                'current_page' => $page,
                'last_page' => (int) ceil($total / $perPage),
                'total' => $total,
            ],
            'summary' => $summary,
            'top_customers' => $groupedCustomers,
        ]);
    }
}
