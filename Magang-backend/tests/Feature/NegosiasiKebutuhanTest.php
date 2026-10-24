<?php

namespace Tests\Feature;

use App\Models\ChatSession;
use App\Models\Negosiasi;
use App\Models\Notifikasi;
use App\Models\Penawaran;
use App\Models\Proyek;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Menguji tahap pengumpulan kebutuhan Sistem Negosiasi.
 *
 * Jalankan dengan:  php artisan test --filter=NegosiasiKebutuhanTest
 * Test memakai SQLite di memori (lihat phpunit.xml), jadi database MySQL
 * di Laragon tidak tersentuh.
 */
class NegosiasiKebutuhanTest extends TestCase
{
    use RefreshDatabase;

    private User $marketing;
    private User $customer;
    private User $customerLain;
    private ChatSession $chat;
    private Penawaran $penawaran;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->marketing = User::factory()->create()->assignRole('marketing');
        $this->customer = User::factory()->create()->assignRole('customer');
        $this->customerLain = User::factory()->create()->assignRole('customer');

        $this->chat = ChatSession::create([
            'customer_id' => $this->customer->id,
            'marketing_id' => $this->marketing->id,
            'status' => 'Penawaran',
        ]);

        $this->penawaran = Penawaran::create([
            'marketing_id' => $this->marketing->id,
            'customer_id' => $this->customer->id,
            'chat_session_id' => $this->chat->id,
            'judul' => 'Website company profile',
            'deskripsi' => 'Website 5 halaman',
            'harga' => 10000000,
            'status' => 'pending',
        ]);
    }

    // ------------------------------------------------------------------
    // Titik masuk: customer menerima penawaran awal
    // ------------------------------------------------------------------

    public function test_customer_lain_tidak_bisa_menerima_penawaran_orang_lain(): void
    {
        Sanctum::actingAs($this->customerLain);

        $this->putJson("/api/penawaran/{$this->penawaran->id}/status", ['status' => 'diterima'])
            ->assertStatus(403);

        $this->assertSame('pending', $this->penawaran->fresh()->status);
        $this->assertSame(0, Negosiasi::count());
    }

    public function test_menerima_penawaran_membuat_negosiasi_bukan_proyek(): void
    {
        Sanctum::actingAs($this->customer);

        $this->putJson("/api/penawaran/{$this->penawaran->id}/status", ['status' => 'diterima'])
            ->assertOk();

        $penawaran = $this->penawaran->fresh();
        $this->assertSame('diterima', $penawaran->status);
        $this->assertNull($penawaran->tanggal_deal, 'tanggal_deal baru diisi saat kesepakatan dikunci');

        $negosiasi = Negosiasi::sole();
        $this->assertSame(Negosiasi::STATUS_AKTIF, $negosiasi->status);
        $this->assertSame(Negosiasi::TAHAP_MENYUSUN_PERTANYAAN, $negosiasi->tahap);
        $this->assertSame($this->chat->id, $negosiasi->chat_session_id);

        $this->assertSame(0, Proyek::count(), 'Proyek tidak boleh dibuat sebelum kesepakatan dikunci');
        $this->assertSame('Negosiasi', $this->chat->fresh()->status);
        $this->assertTrue(Notifikasi::where('user_id', $this->marketing->id)->exists());
    }

    public function test_penawaran_tidak_bisa_ditanggapi_dua_kali(): void
    {
        Sanctum::actingAs($this->customer);

        $this->putJson("/api/penawaran/{$this->penawaran->id}/status", ['status' => 'diterima'])->assertOk();
        $this->putJson("/api/penawaran/{$this->penawaran->id}/status", ['status' => 'diterima'])->assertStatus(409);

        $this->assertSame(1, Negosiasi::count());
    }

    public function test_penawaran_yang_sudah_dinegosiasikan_tidak_bisa_dihapus(): void
    {
        $this->terimaPenawaran();
        Sanctum::actingAs($this->marketing);

        $this->deleteJson("/api/penawaran/{$this->penawaran->id}")->assertStatus(409);

        $this->assertNotNull($this->penawaran->fresh());
    }

    // ------------------------------------------------------------------
    // Pertanyaan dan jawaban kebutuhan
    // ------------------------------------------------------------------

    public function test_alur_lengkap_dua_putaran_sampai_kebutuhan_lengkap(): void
    {
        $negosiasi = $this->terimaPenawaran();

        // Putaran 1: marketing bertanya
        Sanctum::actingAs($this->marketing);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/pertanyaan", [
            'pertanyaan' => ['Berapa halaman yang dibutuhkan?', 'Apakah perlu fitur blog?'],
        ])->assertCreated()->assertJsonPath('tahap', Negosiasi::TAHAP_MENUNGGU_JAWABAN);

        // Customer menjawab semua pertanyaan putaran 1
        Sanctum::actingAs($this->customer);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/jawaban", [
            'jawaban' => $this->jawabSemua($negosiasi, 1),
        ])->assertOk()->assertJsonPath('tahap', Negosiasi::TAHAP_PENINJAUAN_JAWABAN);

        // Jawaban belum lengkap: marketing bertanya lagi -> putaran 2
        Sanctum::actingAs($this->marketing);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/pertanyaan", [
            'pertanyaan' => ['Siapa yang menyiapkan konten blog?'],
        ])->assertCreated()->assertJsonPath('putaran_pertanyaan', 2);

        Sanctum::actingAs($this->customer);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/jawaban", [
            'jawaban' => $this->jawabSemua($negosiasi, 2),
        ])->assertOk();

        // Kebutuhan lengkap -> lanjut ke rancangan proyek
        Sanctum::actingAs($this->marketing);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/kebutuhan-lengkap")
            ->assertOk()
            ->assertJsonPath('tahap', Negosiasi::TAHAP_RANCANGAN_PROYEK);

        $this->assertSame(3, $negosiasi->pertanyaanKebutuhans()->has('jawaban')->count());
    }

    public function test_jawaban_harus_mencakup_semua_pertanyaan_putaran_ini(): void
    {
        $negosiasi = $this->terimaPenawaran();
        $this->kirimPertanyaan($negosiasi, ['Pertanyaan A', 'Pertanyaan B']);

        $satuSaja = array_slice($this->jawabSemua($negosiasi, 1), 0, 1);

        Sanctum::actingAs($this->customer);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/jawaban", ['jawaban' => $satuSaja])
            ->assertStatus(422);

        $this->assertSame(Negosiasi::TAHAP_MENUNGGU_JAWABAN, $negosiasi->fresh()->tahap);
    }

    public function test_customer_tidak_bisa_mengirim_pertanyaan(): void
    {
        $negosiasi = $this->terimaPenawaran();
        Sanctum::actingAs($this->customer);

        $this->postJson("/api/negosiasi/{$negosiasi->id}/pertanyaan", ['pertanyaan' => ['x']])
            ->assertStatus(403);
    }

    public function test_marketing_tidak_bisa_menandai_lengkap_sebelum_ada_jawaban(): void
    {
        $negosiasi = $this->terimaPenawaran();
        $this->kirimPertanyaan($negosiasi, ['Pertanyaan A']);

        Sanctum::actingAs($this->marketing);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/kebutuhan-lengkap")->assertStatus(409);
    }

    public function test_jawaban_lewat_batas_waktu_membuat_negosiasi_kedaluwarsa(): void
    {
        $negosiasi = $this->terimaPenawaran();
        $this->kirimPertanyaan($negosiasi, ['Pertanyaan A']);

        $this->travel(config('negosiasi.batas_respons_hari') + 1)->days();

        Sanctum::actingAs($this->customer);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/jawaban", [
            'jawaban' => $this->jawabSemua($negosiasi, 1),
        ])->assertStatus(409);

        $this->assertSame(Negosiasi::STATUS_KEDALUWARSA, $negosiasi->fresh()->status);
    }

    // ------------------------------------------------------------------
    // Hak akses dan pembatalan
    // ------------------------------------------------------------------

    public function test_customer_lain_tidak_bisa_melihat_negosiasi(): void
    {
        $negosiasi = $this->terimaPenawaran();
        Sanctum::actingAs($this->customerLain);

        $this->getJson("/api/negosiasi/{$negosiasi->id}")->assertStatus(403);
        $this->getJson('/api/negosiasi')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_hanya_customer_yang_bisa_membatalkan(): void
    {
        $negosiasi = $this->terimaPenawaran();

        Sanctum::actingAs($this->marketing);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/batalkan", ['alasan' => 'x'])->assertStatus(403);

        Sanctum::actingAs($this->customer);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/batalkan", ['alasan' => 'Anggaran belum ada'])
            ->assertOk()
            ->assertJsonPath('status', Negosiasi::STATUS_GAGAL);
    }

    // ------------------------------------------------------------------
    // Bantuan
    // ------------------------------------------------------------------

    private function terimaPenawaran(): Negosiasi
    {
        Sanctum::actingAs($this->customer);
        $this->putJson("/api/penawaran/{$this->penawaran->id}/status", ['status' => 'diterima'])->assertOk();

        return Negosiasi::sole();
    }

    private function kirimPertanyaan(Negosiasi $negosiasi, array $pertanyaan): void
    {
        Sanctum::actingAs($this->marketing);
        $this->postJson("/api/negosiasi/{$negosiasi->id}/pertanyaan", ['pertanyaan' => $pertanyaan])
            ->assertCreated();
    }

    private function jawabSemua(Negosiasi $negosiasi, int $putaran): array
    {
        return $negosiasi->pertanyaanKebutuhans()
            ->where('putaran', $putaran)
            ->get()
            ->map(fn ($p) => ['pertanyaan_id' => $p->id, 'isi_jawaban' => 'Jawaban untuk: ' . $p->isi_pertanyaan])
            ->all();
    }
}
