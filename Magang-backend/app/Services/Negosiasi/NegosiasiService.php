<?php

namespace App\Services\Negosiasi;

use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Proyek;
use App\Models\RiwayatNegosiasi;
use App\Models\SesiNegosiasi;
use App\Models\User;

/**
 * Utilitas bersama modul negosiasi: membuka sesi, mengirim notifikasi lewat
 * ChatMessage (sesuai sequence diagram) dan mencatat riwayat sesi.
 */
class NegosiasiService
{
    /**
     * Membuka sesi negosiasi untuk proyek yang pengajuannya diterima marketing.
     */
    public function bukaSesi(Proyek $proyek, User $marketing): SesiNegosiasi
    {
        $chat = $proyek->chatSession;

        if (!$chat) {
            $chat = ChatSession::create([
                'customer_id' => $proyek->customer_id,
                'layanan_id' => $proyek->layanan_id,
                'marketing_id' => $marketing->id,
                'status' => 'Ditindaklanjuti',
            ]);
            $proyek->update(['chat_session_id' => $chat->id]);
        } elseif (!$chat->marketing_id) {
            $chat->update(['marketing_id' => $marketing->id]);
        }

        $sesi = SesiNegosiasi::create([
            'proyek_id' => $proyek->id,
            'customer_id' => $proyek->customer_id,
            'marketing_id' => $marketing->id,
            'chat_session_id' => $chat->id,
            'status' => SesiNegosiasi::STATUS_AKTIF,
            'tahap' => SesiNegosiasi::TAHAP_KEBUTUHAN,
            'putaran_kebutuhan' => 1,
            'menunggu_respons_dari' => 'marketing',
        ]);

        $this->catat($sesi, $marketing, 'sesi_dibuka', 'Sesi negosiasi dibuka untuk proyek "' . $proyek->nama_proyek . '".');
        $this->kirim($sesi, 'customer', 'Pengajuan proyek "' . $proyek->nama_proyek . '" diterima. Sesi negosiasi telah dibuka, tim marketing akan menyusun pertanyaan kebutuhan.');

        return $sesi;
    }

    /**
     * Mengirim notifikasi ke salah satu pihak melalui chat sesi.
     * Pengirim diset ke pihak lawan agar pesan terhitung "belum dibaca" bagi penerima.
     */
    public function kirim(SesiNegosiasi $sesi, string $penerima, string $pesan, bool $sistem = true): ?ChatMessage
    {
        if (!$sesi->chat_session_id) {
            return null;
        }

        $senderId = $penerima === 'customer' ? $sesi->marketing_id : $sesi->customer_id;

        return ChatMessage::create([
            'chat_session_id' => $sesi->chat_session_id,
            'sender_id' => $senderId,
            'message' => ($sistem ? '[Sistem] [Negosiasi] ' : '') . $pesan,
            'is_read' => false,
        ]);
    }

    public function catat(SesiNegosiasi $sesi, ?User $user, string $aksi, ?string $keterangan = null): void
    {
        RiwayatNegosiasi::create([
            'sesi_negosiasi_id' => $sesi->id,
            'user_id' => $user?->id,
            'aksi' => $aksi,
            'keterangan' => $keterangan,
        ]);
    }

    /**
     * Menambahkan entri timeline proyek agar progres negosiasi terlihat di halaman Proyek.
     */
    public function timelineProyek(Proyek $proyek, string $judul, string $deskripsi, array $extra = []): void
    {
        $timeline = $proyek->timeline ?? [];
        $timeline[] = [
            'judul' => $judul,
            'deskripsi' => $deskripsi,
            'tanggal' => date('Y-m-d'),
            'selesai' => true,
        ];

        $proyek->update(array_merge(['timeline' => $timeline], $extra));
    }

    public static function rupiah($nilai): string
    {
        return 'Rp. ' . number_format((float) $nilai, 0, ',', '.');
    }
}
