<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Salinan beku kesepakatan. `snapshot` menyimpan seluruh isi yang disepakati
 * (kebutuhan, rancangan, deliverable, harga) dalam JSON, dan `hash` adalah
 * SHA-256 dari JSON itu sehingga perubahan diam-diam bisa dideteksi.
 * Satu negosiasi hanya boleh punya satu kesepakatan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kesepakatans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negosiasi_id')->unique()->constrained('negosiasis')->cascadeOnDelete();
            $table->foreignId('tawaran_harga_id')->unique()->constrained('tawaran_hargas')->restrictOnDelete();
            $table->decimal('harga_final', 15, 2);
            $table->json('snapshot');
            $table->char('hash', 64);
            $table->foreignId('dikunci_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('disepakati_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kesepakatans');
    }
};
