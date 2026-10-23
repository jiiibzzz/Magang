<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Satu sesi negosiasi per penawaran awal.
 * Nilai `status` dan `tahap` disimpan sebagai string (bukan ENUM) dan dijaga
 * oleh konstanta di model Negosiasi. Alasannya: mengubah ENUM di MySQL butuh
 * migration baru setiap kali ada nilai baru (lihat migration 2026_08_20 milik CRM).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('negosiasis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('penawaran_id')->unique()->constrained('penawarans')->restrictOnDelete();
            $table->foreignId('chat_session_id')->nullable()->constrained('chat_sessions')->nullOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('marketing_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20)->default('aktif');
            $table->string('tahap', 40)->default('menyusun_pertanyaan');
            $table->unsignedTinyInteger('putaran_pertanyaan')->default(1);
            $table->timestamp('batas_respons')->nullable();
            $table->text('alasan_penutupan')->nullable();
            $table->timestamp('ditutup_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'batas_respons']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('negosiasis');
    }
};
