<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Setiap tawaran dan tawaran balik selama negosiasi harga.
 * Nama tabel sengaja bukan "penawarans" karena nama itu sudah dipakai CRM
 * untuk penawaran awal + brosur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tawaran_hargas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negosiasi_id')->constrained('negosiasis')->cascadeOnDelete();
            $table->foreignId('rancangan_proyek_id')->constrained('rancangan_proyeks')->cascadeOnDelete();
            $table->unsignedSmallInteger('versi');
            $table->string('jenis', 20);   // awal | revisi | balik
            $table->string('pengaju', 20); // marketing | customer
            $table->decimal('harga', 15, 2);
            $table->text('catatan')->nullable();
            $table->string('status', 20)->default('menunggu'); // menunggu | diterima | ditolak | kedaluwarsa
            $table->timestamps();

            $table->unique(['negosiasi_id', 'versi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tawaran_hargas');
    }
};
