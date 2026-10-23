<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penerima disimpan sebagai user_id (bukan kolom "marketing"/"customer"),
 * karena kedua peran itu sudah ada di tabel users CRM.
 * dibaca_at = null berarti belum dibaca.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifikasis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negosiasi_id')->constrained('negosiasis')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('judul', 150);
            $table->text('pesan');
            $table->timestamp('dibaca_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'dibaca_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifikasis');
    }
};
