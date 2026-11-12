"""
Membangun resources/templates/project_charter.docx dari template Project Charter (SKPL)
dengan menyisipkan placeholder ${...} untuk PhpWord TemplateProcessor.

Pemakaian:
    python build_project_charter_template.py "<path>/Project Charter.docx"

Jalankan ulang bila template Word aslinya diubah.
"""
import os
import re
import sys
import zipfile

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project_charter.docx')

RUN = '<w:r><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:cstheme="minorHAnsi"/>{b}</w:rPr><w:t xml:space="preserve">{t}</w:t></w:r>'

with zipfile.ZipFile(SRC) as z:
    files = {n: z.read(n) for n in z.namelist()}

doc = files['word/document.xml'].decode('utf-8')
rows = list(re.finditer(r'<w:tr[ >].*?</w:tr>', doc, flags=re.S))
assert len(rows) == 60, f'struktur template berubah ({len(rows)} baris)'
R = [m.group(0) for m in rows]


def cells(row):
    return re.findall(r'<w:tc>.*?</w:tc>', row, flags=re.S)


def set_cell(row, idx, text, bold=False):
    """Ganti seluruh isi teks sel ke-idx dengan satu run berisi `text`."""
    tcs = cells(row)
    tc = tcs[idx]
    paras = re.findall(r'<w:p[ >].*?</w:p>', tc, flags=re.S)
    first = paras[0]
    head = re.match(r'(<w:p[ >][^>]*>)(<w:pPr>.*?</w:pPr>)?', first, flags=re.S)
    newp = head.group(1) + (head.group(2) or '') + RUN.format(b='<w:b/><w:bCs/>' if bold else '', t=text) + '</w:p>'
    start = tc.index(paras[0])
    end = tc.index(paras[-1]) + len(paras[-1])
    new_tc = tc[:start] + newp + tc[end:]
    return row.replace(tc, new_tc, 1)


# ── Tabel 1: informasi umum ──────────────────────────────────────────────
umum = ['nama_proyek', 'sponsor', 'manajer', 'email', 'telepon', 'unit', 'proses',
        'mulai', 'selesai', 'penghematan', 'estimasi_biaya', 'green_belt', 'black_belt']
for i, key in enumerate(umum, start=2):
    R[i] = set_cell(R[i], 1, '${' + key + '}')

# Kotak "IMPORTANT REMINDER" → informasi kesepakatan
R[2] = set_cell(R[2], 2, '${info_kesepakatan}')

for i, key in zip(range(16, 21), ['masalah', 'tujuan', 'business_case', 'sasaran', 'deliverables']):
    R[i] = set_cell(R[i], 1, '${' + key + '}')
R[22] = set_cell(R[22], 1, '${dalam_lingkup}')
R[23] = set_cell(R[23], 1, '${luar_lingkup}')

# Milestone: sisakan satu baris untuk di-clone
ms = set_cell(R[25], 1, '${ms_nama}')
ms = set_cell(ms, 2, '${ms_mulai}')
ms = set_cell(ms, 3, '${ms_selesai}')
R[25] = ms
for i in range(26, 33):
    R[i] = ''

for i, key in zip(range(34, 37), ['tim', 'sumber_daya', 'kebutuhan_khusus']):
    R[i] = set_cell(R[i], 1, '${' + key + '}')

# ── Tabel 2: biaya ───────────────────────────────────────────────────────
b = R[38]
for idx, key in enumerate(['b_tipe', 'b_nama', 'b_tarif', 'b_qty', 'b_durasi', 'b_jumlah']):
    b = set_cell(b, idx, '${' + key + '}')
total = R[38]
total = set_cell(total, 0, 'TOTAL', bold=True)
total = set_cell(total, 1, '${total_label}', bold=True)
for idx in (2, 3, 4):
    total = set_cell(total, idx, '')
total = set_cell(total, 5, '${total_biaya}', bold=True)
R[38] = b + total
R[39] = R[40] = ''

for i, key in zip(range(42, 46), ['pemilik_proses', 'stakeholder', 'customer_akhir', 'manfaat']):
    R[i] = set_cell(R[i], 1, '${' + key + '}')
for n, i in enumerate(range(47, 54), start=1):
    R[i] = set_cell(R[i], 1, '${manfaat_dasar_' + str(n) + '}')
    R[i] = set_cell(R[i], 2, '${manfaat_estimasi_' + str(n) + '}')

for i, key in zip(range(55, 58), ['risiko', 'batasan', 'asumsi']):
    R[i] = set_cell(R[i], 1, '${' + key + '}')

R[59] = set_cell(R[59], 1, '${disiapkan_oleh}')
R[59] = set_cell(R[59], 2, 'DATE:', bold=True)
R[59] = set_cell(R[59], 3, '${tanggal_dokumen}')

# Rangkai ulang dokumen
out, pos = [], 0
for m, new in zip(rows, R):
    out.append(doc[pos:m.start()])
    out.append(new)
    pos = m.end()
out.append(doc[pos:])
doc = ''.join(out)

# Judul & perbaikan salah ketik label
for lama, baru in {
    'CONTRUCTION PROJECT CHARTER TEMPLATE': 'PROJECT CHARTER',
    'ORGAZATIONAL UNIT': 'ORGANIZATIONAL UNIT',
    'BUSSINES CASE': 'BUSINESS CASE',
    'GOALS / MATRICS': 'GOALS / METRICS',
    'NARATIVE SCHEDULE': 'NARRATIVE SCHEDULE',
    'ASSUMPPTIONS': 'ASSUMPTIONS',
    '>QYT<': '>QTY<',
    '>Durasi<': '>DURATION<',
    'RISKS, CONSTRAINTS, AND CONSTRAINTS': 'RISKS, CONSTRAINTS, AND ASSUMPTIONS',
}.items():
    doc = doc.replace(lama, baru)

files['word/document.xml'] = doc.encode('utf-8')
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for n, data in files.items():
        z.writestr(n, data)

sisa = re.findall(r'\$\{[a-z_0-9]+\}', doc)
print(f'OK -> {OUT} ({len(sisa)} placeholder)')
