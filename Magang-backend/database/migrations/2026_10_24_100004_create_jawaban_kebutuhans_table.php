<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Satu pertanyaan hanya punya satu jawaban (unique pada pertanyaan_kebutuhan_id).
 * Waktu menjawab = created_at.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jawaban_kebutuhans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pertanyaan_kebutuhan_id')->unique()->constrained('pertanyaan_kebutuhans')->cascadeOnDelete();
            $table->text('isi_jawaban');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jawaban_kebutuhans');
    }
};
