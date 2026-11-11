@php
    $rp = fn ($v) => 'Rp. ' . number_format((float) $v, 0, ',', '.');
    $tgl = fn ($v) => $v ? \Illuminate\Support\Carbon::parse($v)->locale('id')->translatedFormat('d F Y') : '-';
    $r = $s['rancangan'] ?? [];
@endphp
<div>
@if ($jenis === 'kontrak')
    <h1 style="text-align: center;">SURAT PERJANJIAN KERJA SAMA</h1>
    <p style="text-align: center;">Nomor: {{ $s['nomor'] }}</p>

    <p>Pada tanggal {{ $tgl($s['tanggal']) }}, yang bertanda tangan di bawah ini:</p>
    <table style="width: 100%;" cellpadding="4">
        <tr><td style="width: 30%;"><strong>Pihak Pertama</strong></td><td>{{ $s['perusahaan']['nama'] }}, diwakili oleh {{ $s['marketing']['nama'] }} ({{ $s['marketing']['email'] }})</td></tr>
        <tr><td><strong>Alamat</strong></td><td>{{ $s['perusahaan']['alamat'] }}</td></tr>
        <tr><td><strong>Pihak Kedua</strong></td><td>{{ $s['customer']['nama'] }} ({{ $s['customer']['email'] }})</td></tr>
    </table>
    <p>Kedua belah pihak sepakat untuk mengadakan kerja sama pengerjaan proyek dengan ketentuan sebagai berikut.</p>

    <h2>Pasal 1 - Objek Perjanjian</h2>
    <p>Pihak Pertama mengerjakan proyek <strong>{{ $s['proyek']['nama'] }}</strong> untuk Pihak Kedua dengan tujuan: {{ $r['tujuan'] ?? '-' }}</p>

    <h2>Pasal 2 - Ruang Lingkup</h2>
    <p>{{ $r['ruang_lingkup'] ?? '-' }}</p>

    <h2>Pasal 3 - Jangka Waktu</h2>
    <p>Pekerjaan dimulai pada {{ $tgl($r['tanggal_mulai'] ?? null) }} dan diselesaikan paling lambat {{ $tgl($r['tanggal_selesai'] ?? null) }}, dengan hasil pekerjaan (deliverable) sebagai berikut:</p>
    <ul>
        @foreach (($r['deliverables'] ?? []) as $d)
            <li>{{ $d['nama'] }} (target: {{ $tgl($d['target_tanggal'] ?? null) }})</li>
        @endforeach
    </ul>

    <h2>Pasal 4 - Nilai Kontrak</h2>
    <p>Nilai kontrak yang disepakati kedua belah pihak adalah <strong>{{ $rp($s['harga_final']) }}</strong>, sesuai penawaran versi {{ $s['penawaran']['versi'] }} yang diajukan oleh pihak {{ $s['penawaran']['pihak'] }}.</p>

    <h2>Pasal 5 - Perubahan Kebutuhan</h2>
    <p>Perubahan kebutuhan setelah perjanjian ini ditandatangani dibahas kembali oleh kedua belah pihak dan dapat memengaruhi jangka waktu serta nilai kontrak.</p>

    <h2>Pasal 6 - Penutup</h2>
    <p>Perjanjian ini dibuat berdasarkan hasil negosiasi yang tercatat pada sistem dan berlaku sejak tanggal ditandatangani oleh kedua belah pihak.</p>

    <table style="width: 100%; margin-top: 40px;" cellpadding="4">
        <tr>
            <td style="width: 50%; text-align: center;">Pihak Pertama</td>
            <td style="width: 50%; text-align: center;">Pihak Kedua</td>
        </tr>
        <tr><td style="height: 70px;"> </td><td> </td></tr>
        <tr>
            <td style="text-align: center;">{{ $s['marketing']['nama'] }}</td>
            <td style="text-align: center;">{{ $s['customer']['nama'] }}</td>
        </tr>
    </table>
@else
    <h1 style="text-align: center;">PROJECT CHARTER</h1>
    <p style="text-align: center;">{{ $s['proyek']['nama'] }} - {{ $s['nomor'] }}</p>

    <h2>1. Informasi Proyek</h2>
    <table style="width: 100%;" cellpadding="4">
        <tr><td style="width: 30%;"><strong>Nama Proyek</strong></td><td>{{ $s['proyek']['nama'] }}</td></tr>
        <tr><td><strong>Layanan</strong></td><td>{{ $s['proyek']['layanan'] ?? '-' }}</td></tr>
        <tr><td><strong>Customer</strong></td><td>{{ $s['customer']['nama'] }}</td></tr>
        <tr><td><strong>Marketing / PIC</strong></td><td>{{ $s['marketing']['nama'] }}</td></tr>
        <tr><td><strong>Periode</strong></td><td>{{ $tgl($r['tanggal_mulai'] ?? null) }} s.d. {{ $tgl($r['tanggal_selesai'] ?? null) }}</td></tr>
        <tr><td><strong>Anggaran Disepakati</strong></td><td>{{ $rp($s['harga_final']) }}</td></tr>
    </table>

    <h2>2. Tujuan</h2>
    <p>{{ $r['tujuan'] ?? '-' }}</p>

    <h2>3. Ruang Lingkup</h2>
    <p>{{ $r['ruang_lingkup'] ?? '-' }}</p>

    <h2>4. Deliverable</h2>
    <table style="width: 100%;" cellpadding="4" border="1">
        <tr><td><strong>No</strong></td><td><strong>Deliverable</strong></td><td><strong>Target</strong></td></tr>
        @foreach (($r['deliverables'] ?? []) as $i => $d)
            <tr><td>{{ $i + 1 }}</td><td>{{ $d['nama'] }}</td><td>{{ $tgl($d['target_tanggal'] ?? null) }}</td></tr>
        @endforeach
    </table>

    <h2>5. Rincian Biaya</h2>
    <table style="width: 100%;" cellpadding="4" border="1">
        <tr><td><strong>Item</strong></td><td><strong>Jumlah</strong></td><td><strong>Harga Satuan</strong></td><td><strong>Subtotal</strong></td></tr>
        @foreach (($r['rincian_biaya'] ?? []) as $b)
            <tr><td>{{ $b['item'] }}</td><td>{{ $b['jumlah'] }}</td><td>{{ $rp($b['harga_satuan']) }}</td><td>{{ $rp($b['jumlah'] * $b['harga_satuan']) }}</td></tr>
        @endforeach
        <tr><td><strong>Total Rancangan</strong></td><td> </td><td> </td><td><strong>{{ $rp($r['total_biaya'] ?? 0) }}</strong></td></tr>
        <tr><td><strong>Harga Final (Kesepakatan)</strong></td><td> </td><td> </td><td><strong>{{ $rp($s['harga_final']) }}</strong></td></tr>
    </table>

    <h2>6. Risiko</h2>
    <p>{{ $r['risiko'] ?: '-' }}</p>

    <h2>7. Ringkasan Kebutuhan</h2>
    @forelse (($s['kebutuhan'] ?? []) as $k)
        <p><strong>{{ $k['pertanyaan'] }}</strong><br/>{{ $k['jawaban'] ?: '-' }}</p>
    @empty
        <p>-</p>
    @endforelse

    <h2>8. Persetujuan</h2>
    <p>Project charter ini disusun otomatis dari kesepakatan negosiasi tanggal {{ $tgl($s['tanggal']) }}.</p>
@endif
</div>
