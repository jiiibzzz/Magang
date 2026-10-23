<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pertanyaan_kebutuhans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negosiasi_id')->constrained('negosiasis')->cascadeOnDelete();
            $table->unsignedTinyInteger('putaran');
            $table->unsignedTinyInteger('urutan');
            $table->text('isi_pertanyaan');
            $table->timestamps();

            $table->unique(['negosiasi_id', 'putaran', 'urutan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pertanyaan_kebutuhans');
    }
};
