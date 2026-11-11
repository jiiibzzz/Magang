<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnggotaTim;
use App\Models\Artikel;
use App\Models\Faq;
use App\Models\KategoriArtikel;
use App\Models\PelangganNewsletter;
use App\Models\PengaturanSitus;
use App\Models\PesanKontak;
use App\Models\Testimoni;
use App\Models\KategoriLayanan;
use Illuminate\Http\Request;

class PublicContentController extends Controller
{
    public function layanan()
    {
        // Get all categories along with their items
        $layanan = KategoriLayanan::with('layanan')->get();
        return response()->json($layanan);
    }
    public function artikel(Request $request)
    {
        $query = Artikel::with(['kategori', 'penulis'])->where('status', 'published');

        if ($request->has('kategori')) {
            $query->where('id_kategori_artikel', $request->kategori);
        }

        return response()->json($query->latest('dipublikasikan_pada')->paginate(10));
    }

    public function detailArtikel($slug)
    {
        $artikel = Artikel::with(['kategori', 'penulis'])
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        return response()->json($artikel);
    }

    public function kategoriArtikel()
    {
        $kategori = KategoriArtikel::orderBy('nama_kategori')->get();

        return response()->json($kategori);
    }

    public function testimoni()
    {
        $testimoni = Testimoni::with('user')
            ->where('status', 'approved')
            ->latest('dibuat_pada')
            ->get();

        return response()->json($testimoni);
    }

    public function anggotaTim()
    {
        $tim = AnggotaTim::orderBy('urutan')->get();

        return response()->json($tim);
    }

    public function faq()
    {
        $faq = Faq::orderBy('urutan')->get();

        return response()->json($faq);
    }

    public function pengaturan()
    {
        $settings = PengaturanSitus::pluck('nilai', 'kunci');
        $keunggulans = \App\Models\Keunggulan::orderBy('urutan')->get();
        $layananUnggulan = \App\Models\Layanan::with('kategoriLayanan')
            ->where('badge', 'UNGGULAN')
            ->whereHas('kategoriLayanan', function($q) {
                $q->whereIn('name', ['Consulting', 'Coaching', 'Management', 'Assistance']);
            })
            ->orderBy('num')
            ->get();

        return response()->json([
            'settings' => $settings,
            'keunggulans' => $keunggulans,
            'layanan_unggulan' => $layananUnggulan
        ]);
    }

    public function kontak(Request $request)
    {
        $request->validate([
            'nama' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'no_hp' => 'nullable|string|max:255',
            'subjek' => 'required|string|max:255',
            'pesan' => 'required|string',
        ]);

        $pesan = PesanKontak::create([
            'id_user' => auth('sanctum')->id(),
            'nama' => $request->nama,
            'email' => $request->email,
            'no_hp' => $request->no_hp,
            'subjek' => $request->subjek,
            'pesan' => $request->pesan,
            'status' => 'new',
            'dikirim_pada' => now(),
        ]);

        return response()->json($pesan, 201);
    }

    public function newsletter(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255|unique:pelanggan_newsletter,email',
        ]);

        $sub = PelangganNewsletter::create([
            'id_user' => auth('sanctum')->id(),
            'email' => $request->email,
            'status' => 'active',
            'berlangganan_pada' => now(),
        ]);

        return response()->json($sub, 201);
    }

    public function clients()
    {
        // Klien yang sudah pernah melakukan transaksi/konsultasi (diambil dari database client_logos)
        $clients = \App\Models\ClientLogo::orderBy('urutan')->get();

        return response()->json($clients);
    }

    public function onlineMarketings()
    {
        // last_seen ditulis dengan now() (timezone aplikasi, Asia/Jakarta) oleh ProfileController::ping,
        // jadi pembandingnya juga harus memakai timezone aplikasi.
        $marketings = \App\Models\User::role('marketing')
            ->where('last_seen', '>=', now()->subMinutes(3))
            ->get(['id', 'name', 'avatar', 'email']);

        return response()->json($marketings);
    }
}
