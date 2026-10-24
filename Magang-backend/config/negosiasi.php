<?php

return [
    /*
    | Berapa hari customer diberi waktu untuk merespons (menjawab pertanyaan
    | atau menanggapi tawaran harga) sebelum negosiasi dianggap kedaluwarsa.
    | Bisa diubah lewat .env: NEGOSIASI_BATAS_RESPONS_HARI=5
    */
    'batas_respons_hari' => (int) env('NEGOSIASI_BATAS_RESPONS_HARI', 3),
];
