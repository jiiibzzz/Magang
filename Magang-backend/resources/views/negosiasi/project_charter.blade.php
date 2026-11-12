{{-- Tiruan tata letak template Project Charter SKPL (resources/templates/project_charter.docx) untuk versi PDF. --}}
@php
    $v = $nilai;
    $t = fn ($k) => nl2br(e($v[$k] ?? '-'));
    $abu = ['#BFBFBF', '#D9D9D9'];
    $label = fn ($i) => 'background:' . $abu[$i % 2] . ';font-weight:bold;width:27%;';
    $umum = [
        'PROJECT NAME' => 'nama_proyek', 'PROJECT SPONSOR' => 'sponsor', 'PROJECT MANAGER' => 'manajer',
        'EMAIL ADDRESS' => 'email', 'PHONE NUMBER' => 'telepon', 'ORGANIZATIONAL UNIT' => 'unit',
        'PROCESS IMPACTED' => 'proses', 'EXPECTED START DATE' => 'mulai', 'EXPECTED COMPLETION DATE' => 'selesai',
        'EXPECTED SAVINGS' => 'penghematan', 'ESTIMATED COSTS' => 'estimasi_biaya',
        'GREEN BELTS ASSIGNED' => 'green_belt', 'BLACK BELTS ASSIGNED' => 'black_belt',
    ];
@endphp
<style>
    .pc { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .pc td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
    .pc .judul { text-align: center; font-size: 14px; font-weight: bold; border: none; padding-bottom: 6px; }
    .pc .bar { background: #000; color: #fff; font-weight: bold; }
    .pc .kepala { background: #000; color: #fff; font-weight: bold; }
    .b { font-weight: bold; }
</style>

<table class="pc">
    <tr><td colspan="4" class="judul">PROJECT CHARTER</td></tr>
    <tr><td colspan="4" class="bar">GENERAL PROJECT INFORMATION</td></tr>
    @foreach ($umum as $lbl => $key)
        <tr>
            <td style="{{ $label($loop->index) }}">{{ $lbl }}</td>
            <td style="width:40%;">{!! $t($key) !!}</td>
            @if ($loop->first)
                <td colspan="2" rowspan="{{ count($umum) }}" style="background:#BFBFBF;width:33%;">{!! $t('info_kesepakatan') !!}</td>
            @endif
        </tr>
    @endforeach

    <tr><td colspan="4" class="bar">DESCRIBE THE PROBLEM OR ISSUE, GOALS, OBJECTIVES, AND DELIVERABLES OF THIS PROJECT</td></tr>
    @foreach (['PROBLEM OR ISSUE' => 'masalah', 'PURPOSE OF PROJECT' => 'tujuan', 'BUSINESS CASE' => 'business_case', 'GOALS / METRICS' => 'sasaran', 'EXPECTED DELIVERABLES' => 'deliverables'] as $lbl => $key)
        <tr><td style="{{ $label($loop->index) }}">{{ $lbl }}</td><td colspan="3">{!! $t($key) !!}</td></tr>
    @endforeach

    <tr><td colspan="4" class="bar">DEFINE THE PROJECT SCOPE AND SCHEDULE</td></tr>
    <tr><td style="{{ $label(0) }}">WITHIN SCOPE</td><td colspan="3">{!! $t('dalam_lingkup') !!}</td></tr>
    <tr><td style="{{ $label(1) }}">OUTSIDE OF SCOPE</td><td colspan="3">{!! $t('luar_lingkup') !!}</td></tr>
    <tr>
        <td style="{{ $label(0) }}" rowspan="{{ count($milestones) + 1 }}">NARRATIVE SCHEDULE</td>
        <td style="background:#BFBFBF;" class="b">KEY MILESTONE</td>
        <td style="background:#BFBFBF;width:16%;" class="b">START</td>
        <td style="background:#BFBFBF;width:17%;" class="b">COMPLETED</td>
    </tr>
    @foreach ($milestones as $m)
        <tr><td>{{ $m['nama'] }}</td><td>{{ $m['mulai'] }}</td><td>{{ $m['selesai'] }}</td></tr>
    @endforeach

    <tr><td colspan="4" class="bar">DEFINE THE PROJECT RESOURCE AND COSTS</td></tr>
    @foreach (['PROJECT TEAM' => 'tim', 'SUPPORT RESOURCES' => 'sumber_daya', 'SPECIAL NEEDS' => 'kebutuhan_khusus'] as $lbl => $key)
        <tr><td style="{{ $label($loop->index) }}">{{ $lbl }}</td><td colspan="3">{!! $t($key) !!}</td></tr>
    @endforeach
</table>

<table class="pc">
    <tr>
        <td class="kepala">COST TYPE</td><td class="kepala">VENDOR / LABOR NAME</td><td class="kepala">RATE</td>
        <td class="kepala">QTY</td><td class="kepala">DURATION</td><td class="kepala">AMOUNT</td>
    </tr>
    @foreach ($biaya as $b)
        <tr>
            <td style="{{ $label($loop->index) }}width:14%;">{{ $b['tipe'] }}</td>
            <td>{{ $b['nama'] }}</td>
            <td>{{ $b['tarif'] }}</td>
            <td>{{ $b['qty'] }}</td>
            <td style="background:#D9D9D9;">{{ $b['durasi'] }}</td>
            <td style="background:#D9D9D9;">{{ $b['jumlah'] }}</td>
        </tr>
    @endforeach
    <tr>
        <td style="background:#BFBFBF;" class="b">TOTAL</td>
        <td colspan="3" class="b">{{ $v['total_label'] }}</td>
        <td style="background:#D9D9D9;"></td>
        <td style="background:#D9D9D9;" class="b">{{ $v['total_biaya'] }}</td>
    </tr>
</table>

{{-- Judul seksi dibungkus bersama barisnya agar tidak terpisah di akhir halaman. --}}
<div style="page-break-inside: avoid;">
<table class="pc" style="margin-bottom:0;">
    <tr><td colspan="2" class="bar">DEFINE THE PROJECT BENEFITS AND CUSTOMERS</td></tr>
    @foreach (['PROCESS OWNER' => 'pemilik_proses', 'KEY STAKEHOLDERS' => 'stakeholder', 'FINAL CUSTOMER' => 'customer_akhir', 'EXPECTED BENEFITS' => 'manfaat'] as $lbl => $key)
        <tr><td style="{{ $label($loop->index) }}">{{ $lbl }}</td><td>{!! $t($key) !!}</td></tr>
    @endforeach
</table>
</div>
<table class="pc" style="border-top:none;">
    <tr><td class="kepala">TYPE OF BENEFIT</td><td class="kepala">DESCRIBE BASIS OF ESTIMATE</td><td class="kepala" style="width:22%;">EST BENEFIT</td></tr>
    @foreach (\App\Services\Negosiasi\ProjectCharterData::JENIS_MANFAAT as $i => $jenis)
        <tr>
            <td style="{{ $label($i) }}">{{ $jenis }}</td>
            <td>{!! $t('manfaat_dasar_' . ($i + 1)) !!}</td>
            <td>{!! $t('manfaat_estimasi_' . ($i + 1)) !!}</td>
        </tr>
    @endforeach

    <tr><td colspan="3" class="bar">DESCRIBE PROJECT RISKS, CONSTRAINTS, AND ASSUMPTIONS</td></tr>
    @foreach (['RISKS' => 'risiko', 'CONSTRAINTS' => 'batasan', 'ASSUMPTIONS' => 'asumsi'] as $lbl => $key)
        <tr><td style="{{ $label($loop->index) }}">{{ $lbl }}</td><td colspan="2">{!! $t($key) !!}</td></tr>
    @endforeach
    <tr><td colspan="3" class="bar">&#160;</td></tr>
    <tr>
        <td style="background:#D9D9D9;">Prepared By: <span class="b">{{ $v['disiapkan_oleh'] }}</span></td>
        <td colspan="2" style="background:#D9D9D9;"><span class="b">DATE:</span> {{ $v['tanggal_dokumen'] }}</td>
    </tr>
</table>
