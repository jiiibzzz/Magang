<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modul Negosiasi Proyek (SKPL: Use Case, Activity & Sequence Diagram Negosiasi).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sesi_negosiasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyek_id')->unique()->constrained('proyeks')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('marketing_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('chat_session_id')->nullable()->constrained('chat_sessions')->nullOnDelete();
            $table->string('status')->default('aktif');   // aktif, berhasil, gagal, ditutup
            $table->string('tahap')->default('kebutuhan'); // kebutuhan, rancangan, penawaran, kesepakatan
            $table->unsignedInteger('putaran_kebutuhan')->default(1);
            $table->string('menunggu_respons_dari')->nullable(); // customer, marketing
            $table->dateTime('batas_waktu_respons')->nullable();
            $table->unsignedTinyInteger('jumlah_follow_up')->default(0);
            $table->text('alasan_selesai')->nullable();
            $table->dateTime('selesai_pada')->nullable();
            $table->timestamps();

            $table->index(['status', 'menunggu_respons_dari', 'batas_waktu_respons'], 'sesi_follow_up_idx');
        });

        Schema::create('pertanyaan_kebutuhan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_negosiasi_id')->constrained('sesi_negosiasi')->cascadeOnDelete();
            $table->unsignedInteger('putaran');
            $table->unsignedInteger('urutan');
            $table->text('pertanyaan');
            $table->timestamps();
        });

        Schema::create('jawaban_kebutuhan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pertanyaan_kebutuhan_id')->unique()->constrained('pertanyaan_kebutuhan')->cascadeOnDelete();
            $table->text('isi')->nullable();
            $table->string('status')->default('draf'); // draf, terkirim
            $table->timestamps();
        });

        Schema::create('rancangan_proyek', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_negosiasi_id')->constrained('sesi_negosiasi')->cascadeOnDelete();
            $table->unsignedInteger('versi');
            $table->text('tujuan');
            $table->text('ruang_lingkup');
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->decimal('total_biaya', 15, 2);
            $table->text('risiko')->nullable();
            $table->timestamps();
        });

        Schema::create('rancangan_deliverables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rancangan_proyek_id')->constrained('rancangan_proyek')->cascadeOnDelete();
            $table->string('nama');
            $table->date('target_tanggal')->nullable();
            $table->timestamps();
        });

        Schema::create('rancangan_rincian_biaya', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rancangan_proyek_id')->constrained('rancangan_proyek')->cascadeOnDelete();
            $table->string('item');
            $table->unsignedInteger('jumlah')->default(1);
            $table->decimal('harga_satuan', 15, 2);
            $table->timestamps();
        });

        Schema::create('versi_penawaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_negosiasi_id')->constrained('sesi_negosiasi')->cascadeOnDelete();
            $table->foreignId('rancangan_proyek_id')->nullable()->constrained('rancangan_proyek')->nullOnDelete();
            $table->unsignedInteger('versi');
            $table->string('pihak'); // marketing, customer
            $table->decimal('harga', 15, 2);
            $table->text('catatan')->nullable();
            $table->string('status')->default('menunggu'); // menunggu, diterima, ditolak
            $table->timestamps();
        });

        Schema::create('permintaan_perubahan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_negosiasi_id')->constrained('sesi_negosiasi')->cascadeOnDelete();
            $table->foreignId('versi_penawaran_id')->nullable()->constrained('versi_penawaran')->nullOnDelete();
            $table->text('isi_perubahan');
            $table->timestamps();
        });

        Schema::create('kesepakatan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_negosiasi_id')->unique()->constrained('sesi_negosiasi')->cascadeOnDelete();
            $table->foreignId('versi_penawaran_id')->constrained('versi_penawaran')->cascadeOnDelete();
            $table->decimal('harga_final', 15, 2);
            $table->json('snapshot');
            $table->timestamps();
        });

        Schema::create('dokumen_kesepakatan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kesepakatan_id')->constrained('kesepakatan')->cascadeOnDelete();
            $table->string('jenis');  // kontrak, project_charter
            $table->string('format'); // docx, pdf
            $table->string('file_path')->nullable();
            $table->timestamps();

            $table->unique(['kesepakatan_id', 'jenis', 'format']);
        });

        Schema::create('follow_up_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_negosiasi_id')->constrained('sesi_negosiasi')->cascadeOnDelete();
            $table->unsignedTinyInteger('follow_up_ke');
            $table->foreignId('chat_message_id')->nullable()->constrained('chat_messages')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('riwayat_negosiasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sesi_negosiasi_id')->constrained('sesi_negosiasi')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('aksi');
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riwayat_negosiasi');
        Schema::dropIfExists('follow_up_logs');
        Schema::dropIfExists('dokumen_kesepakatan');
        Schema::dropIfExists('kesepakatan');
        Schema::dropIfExists('permintaan_perubahan');
        Schema::dropIfExists('versi_penawaran');
        Schema::dropIfExists('rancangan_rincian_biaya');
        Schema::dropIfExists('rancangan_deliverables');
        Schema::dropIfExists('rancangan_proyek');
        Schema::dropIfExists('jawaban_kebutuhan');
        Schema::dropIfExists('pertanyaan_kebutuhan');
        Schema::dropIfExists('sesi_negosiasi');
    }
};
