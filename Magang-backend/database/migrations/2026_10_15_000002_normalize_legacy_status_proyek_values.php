<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // planning (legacy) → pengajuan (tahap awal alur baru)
        DB::table('proyeks')->where('status_proyek', 'planning')->update([
            'status_proyek' => 'pengajuan',
            'progress' => 0,
        ]);

        // on progress / testing (legacy) → Proses Pengerjaan
        DB::table('proyeks')->whereIn('status_proyek', ['on progress', 'testing'])->update([
            'status_proyek' => 'Proses Pengerjaan',
        ]);

        // selesai (lowercase legacy) → Selesai
        DB::table('proyeks')->where('status_proyek', 'selesai')->update([
            'status_proyek' => 'Selesai',
        ]);

        // Status lead yang bocor ke proyek akibat sync 2-arah lama → pengajuan
        DB::table('proyeks')->whereIn('status_proyek', ['Ketertarikan', 'Ditindaklanjuti', 'Penawaran', 'Deal'])->update([
            'status_proyek' => 'pengajuan',
            'progress' => 0,
        ]);
    }

    public function down(): void
    {
        // Irreversible data migration
    }
};
