<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rancangan proyek berversi: setiap revisi (misalnya setelah permintaan
 * perubahan dari customer) disimpan sebagai baris baru dengan versi + 1,
 * jadi riwayatnya tidak hilang.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rancangan_proyeks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negosiasi_id')->constrained('negosiasis')->cascadeOnDelete();
            $table->unsignedTinyInteger('versi');
            $table->text('ruang_lingkup');
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->decimal('estimasi_biaya', 15, 2);
            $table->text('catatan_rapat')->nullable();
            $table->timestamps();

            $table->unique(['negosiasi_id', 'versi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rancangan_proyeks');
    }
};
