<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RfmController extends Controller
{
    public function index(Request $request)
    {
        // Sumber A: penawaran yang diterima (ada harga & tanggal deal)
        $fromPenawarans = DB::table('penawarans')
            ->join('users', 'users.id', '=', 'penawarans.customer_id')
            ->where('penawarans.status', 'diterima')
            ->whereNotNull('penawarans.tanggal_deal')
            ->select(
                'penawarans.customer_id',
                'users.name',
                'users.email',
                'users.phone',
                DB::raw('MAX(penawarans.tanggal_deal) as last_deal'),
                DB::raw('COUNT(*) as frequency'),
                DB::raw('COALESCE(SUM(penawarans.harga), 0) as monetary')
            )
            ->groupBy('penawarans.customer_id', 'users.name', 'users.email', 'users.phone')
            ->get()
            ->keyBy('customer_id');

        // Sumber B: proyek langsung "Sesuai Kontrak" (Selesai/Arsip tanpa penawaran)
        // Diselaraskan dengan definisi transaksi di RiwayatTransaksiController
        $fromProyeks = DB::table('proyeks')
            ->join('users', 'users.id', '=', 'proyeks.customer_id')
            ->whereNull('proyeks.penawaran_id')
            ->whereIn('proyeks.status_proyek', ['Selesai', 'selesai', 'Arsip'])
            ->select(
                'proyeks.customer_id',
                'users.name',
                'users.email',
                'users.phone',
                DB::raw("MAX(COALESCE(proyeks.tanggal_selesai, proyeks.updated_at)) as last_deal"),
                DB::raw('COUNT(*) as frequency'),
                DB::raw('COALESCE(SUM(proyeks.harga_kontrak), 0) as monetary')
            )
            ->groupBy('proyeks.customer_id', 'users.name', 'users.email', 'users.phone')
            ->get()
            ->keyBy('customer_id');

        // Gabungkan per customer: recency dari transaksi terakhir, frequency dijumlah, monetary dari penawaran
        $customerIds = $fromPenawarans->keys()->union($fromProyeks->keys())->values();
        $customers = $customerIds->map(function ($id) use ($fromPenawarans, $fromProyeks) {
            $pen = $fromPenawarans->get($id);
            $pro = $fromProyeks->get($id);
            $src = $pen ?: $pro;

            $lastDeal = collect([$pen?->last_deal, $pro?->last_deal])->filter()->max();

            return (object) [
                'customer_id' => $id,
                'name' => $src->name,
                'email' => $src->email,
                'phone' => $src->phone,
                'recency' => (int) abs(\Carbon\Carbon::parse($lastDeal)->diffInDays(now())),
                'frequency' => (int) (($pen->frequency ?? 0) + ($pro->frequency ?? 0)),
                'monetary' => (float) (($pen->monetary ?? 0) + ($pro->monetary ?? 0)),
            ];
        })->values();

        $allSegments = [
            'Champions',
            'Loyal Customers',
            'Promising',
            'New',
            'Abandoned Checkouts',
            'Warm Leads Cold Leads',
            'Need Attention',
            'based on past purchases',
            "Shouldn't Lose",
            'Sleepers',
            'Lost',
        ];

        if ($customers->isEmpty()) {
            $emptySummary = array_map(function ($seg) {
                return ['segment' => $seg, 'count' => 0];
            }, $allSegments);

            return response()->json([
                'customers' => [],
                'segments_summary' => $emptySummary,
            ]);
        }

        $recencies = $customers->pluck('recency')->sort()->values()->toArray();
        $frequencies = $customers->pluck('frequency')->sort()->values()->toArray();
        $monetaries = $customers->pluck('monetary')->sort()->values()->toArray();

        $rQ = $this->getQuintileBoundaries($recencies);
        $fQ = $this->getQuintileBoundaries($frequencies);
        $mQ = $this->getQuintileBoundaries($monetaries);

        $segmentCounts = [];
        $result = $customers->map(function ($c) use ($rQ, $fQ, $mQ, &$segmentCounts) {
            $r = $this->scoreRecency($c->recency, $rQ);
            $f = $this->scoreNormal($c->frequency, $fQ);
            $m = $this->scoreNormal($c->monetary, $mQ);
            $segment = $this->getSegment($r, $f, $m);

            if (!isset($segmentCounts[$segment])) {
                $segmentCounts[$segment] = 0;
            }
            $segmentCounts[$segment]++;

            return [
                'customer_id' => $c->customer_id,
                'name' => $c->name,
                'email' => $c->email,
                'phone' => $c->phone,
                'recency_days' => (int) $c->recency,
                'frequency' => (int) $c->frequency,
                'monetary' => (float) $c->monetary,
                'r_score' => $r,
                'f_score' => $f,
                'm_score' => $m,
                'segment' => $segment,
            ];
        })->sortByDesc('monetary')->values();

        $allSegments = [
            'Champions',
            'Loyal Customers',
            'Promising',
            'New',
            'Abandoned Checkouts',
            'Warm Leads Cold Leads',
            'Need Attention',
            'based on past purchases',
            "Shouldn't Lose",
            'Sleepers',
            'Lost',
        ];
        $segmentsSummary = [];
        foreach ($allSegments as $seg) {
            $segmentsSummary[] = [
                'segment' => $seg,
                'count' => $segmentCounts[$seg] ?? 0,
            ];
        }

        return response()->json([
            'customers' => $result,
            'segments_summary' => $segmentsSummary,
        ]);
    }

    private function getQuintileBoundaries(array $sorted): array
    {
        $count = count($sorted);
        if ($count < 5) {
            $mid = $sorted[(int) floor($count / 2)] ?? 0;
            return [$mid, $mid, $mid, $mid];
        }

        return [
            $sorted[(int) floor($count * 0.2)],
            $sorted[(int) floor($count * 0.4)],
            $sorted[(int) floor($count * 0.6)],
            $sorted[(int) floor($count * 0.8)],
        ];
    }

    private function scoreRecency($value, array $quintiles): int
    {
        if ($value <= $quintiles[0]) return 5;
        if ($value <= $quintiles[1]) return 4;
        if ($value <= $quintiles[2]) return 3;
        if ($value <= $quintiles[3]) return 2;
        return 1;
    }

    private function scoreNormal($value, array $quintiles): int
    {
        if ($value <= $quintiles[0]) return 1;
        if ($value <= $quintiles[1]) return 2;
        if ($value <= $quintiles[2]) return 3;
        if ($value <= $quintiles[3]) return 4;
        return 5;
    }

    private function getSegment(int $r, int $f, int $m): string
    {
        // 1. Champions: Paling baru, paling sering, spending tertinggi
        if ($r >= 4 && $f >= 4 && $m >= 4) {
            return 'Champions';
        }

        // 2. Loyal Customers: Sering transaksi, nilai bagus, rutin kembali
        if ($r >= 3 && $f >= 4 && $m >= 3) {
            return 'Loyal Customers';
        }

        // 9. Shouldn't Lose: Dulu transaksi besar/sering tapi lama tidak kembali
        if ($r <= 2 && ($f >= 3 || $m >= 4)) {
            return "Shouldn't Lose";
        }

        // 8. based on past purchases: Transaksi bernilai tinggi berdasarkan histori pembelian
        if ($m >= 4 || ($r >= 3 && $f >= 2 && $m >= 3)) {
            return 'based on past purchases';
        }

        // 4. New: Pelanggan baru transaksi pertama kali bernilai
        if ($r >= 4 && $f <= 1 && $m >= 2) {
            return 'New';
        }

        // 3. Promising: Pelanggan baru dengan frekuensi beberapa kali
        if ($r >= 4 && $f >= 2) {
            return 'Promising';
        }

        // 5. Abandoned Checkouts: Baru berinteraksi tapi belum deal / nominal nol/minim
        if ($r >= 3 && $f <= 1 && $m <= 1) {
            return 'Abandoned Checkouts';
        }

        // 7. Need Attention: R, F, M di tingkat menengah
        if ($r == 3 && $f >= 2 && $m >= 2) {
            return 'Need Attention';
        }

        // 6. Warm Leads Cold Leads: Mulai mendingin / interaksi menurun
        if ($r == 3) {
            return 'Warm Leads Cold Leads';
        }

        // 10. Sleepers: Lama tidak aktif, frekuensi dan nilai rendah
        if ($r == 2) {
            return 'Sleepers';
        }

        // 11. Lost: Paling lama tidak aktif, nilai terendah
        return 'Lost';
    }
}
