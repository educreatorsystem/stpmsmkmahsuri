# Simpan dan baca data STPM melalui Google Sheet

Google Sheet: https://docs.google.com/spreadsheets/d/1GvN54iV0Paq2Fkn2X-MKI3Bm-YsJpzsdsxpwbheM-_Y/edit

Laman: https://educreatorsystem.github.io/stpmsmkmahsuri/

Web App: https://script.google.com/macros/s/AKfycbzXnprWNvCp7LEl2-DmyVM4i3uzaKaqkce7YXHMM4S7-oQW6nqK1KyUH0RUpsRPcvnx/exec

Kod ini tidak meminta kod akses, kata laluan atau token simpanan. Pengguna laman boleh membaca dan mengubah rekod melalui Web App. Pemilik Apps Script masih perlu memberi kebenaran akses Google Sheet sekali semasa pemasangan. Sheet itu sendiri tidak perlu dijadikan public.

## 1. Pasang Code.gs

1. Buka projek Apps Script yang menghasilkan URL Web App di atas. Gunakan projek dan deployment sedia ada untuk mengekalkan URL.
2. Gantikan kandungan `Code.gs` dengan `Code.gs` dalam pakej ini. Pastikan tiada fungsi `doGet`, `doPost` atau `stpmRequest` pendua dalam fail lain.
3. Simpan. Pilih fungsi `initializeSTPM` dan tekan **Run**. Berikan kebenaran Google apabila diminta. Akaun pemilik deployment mesti mempunyai akses edit kepada Google Sheet sasaran.
4. Buka **Deploy > Manage deployments**, pilih deployment Web App sedia ada dan tekan ikon pensel.
5. Pilih **Version: New version**, **Execute as: Me**, dan **Who has access: Anyone**, kemudian tekan **Deploy**. Tetapan ini mengikuti [panduan Web Apps Google](https://developers.google.com/apps-script/guides/web). Jika akaun sekolah tidak menyediakan pilihan Anyone, pentadbir Google Workspace perlu membenarkan tetapan tersebut sebelum penggunaan tanpa log masuk boleh berfungsi.
6. Pastikan URL deployment masih sama. Jika URL berubah, kemas kini baris `STPM_APPS_SCRIPT_URL` dalam `google-sheet-sync.js`.

Jangan tekan Run pada `doGet` untuk menguji laman; gunakan URL `/exec` selepas deploy. Menyimpan kod sahaja tidak mengemas kini versi deployment.

## 2. Kemas kini laman GitHub Pages

Apps Script sahaja tidak mencukupi kerana laman lama hanya menyimpan gred dalam pelayar.

1. Dalam pelayar/peranti yang mempunyai rekod lama, tekan **Eksport Data** sebagai sandaran sebelum menggantikan fail laman.
2. Dalam repositori `educreatorsystem/stpmsmkmahsuri`, gantikan fail laman dengan `index.html`, `app.js`, `google-sheet-sync.js`, `styles.css`, `students.csv` dan `lencana-mahsuri.jpeg` daripada pakej ini. Semua enam fail mesti berada dalam folder yang sama. `Code.gs` dipasang dalam Apps Script; ia tidak dijalankan oleh GitHub Pages.
3. Tunggu penerbitan GitHub Pages selesai, kemudian muat semula laman.
4. Buka laman dalam pelayar dan profil yang digunakan untuk memasukkan gred lama. Rekod tempatan yang belum ada dalam Sheet dihantar secara automatik. Rekod Sheet sedia ada dikekalkan semasa pemindahan automatik ini.
5. Untuk memasukkan sandaran dari pelayar/peranti lain, gunakan **Import Data**. Rekod dalam fail import akan mengemas kini sel sepadan dalam Sheet; rekod lain dikekalkan.

Tiada medan kod akses. Sambungan dibuat secara automatik.

## 3. Sahkan simpanan dan bacaan sebenar

1. Buka URL Web App `/exec`. Respons mesti menunjukkan `"ok":true`, `"version":3`, `"accessRequired":false` dan `"initialized":true`. Respons ini juga menyenaraikan jumlah baris setiap tab. Status berjaya hanya mengesahkan akses kepada Sheet, bukan bahawa satu gred sudah tersimpan.
2. Buka laman GitHub Pages, pilih seorang murid dan masukkan gred sebenar.
3. Tunggu status **Disimpan dalam Google Sheet.**. Status **Disimpan dalam peranti** sahaja belum mengesahkan simpanan Sheet.
4. Buka tab `STPM_Gred` dalam Google Sheet. Semak nama murid, pentaksiran, subjek, gred dan masa kemas kini sepadan.
5. Buka laman dalam pelayar/peranti kedua. Gred yang sama mesti dipaparkan selepas data dimuatkan. Ini mengesahkan bacaan semula data Sheet, bukan hanya sandaran pelayar pertama.

Laman membaca rekod semasa mula dibuka dan setiap 30 saat ketika halaman aktif. **Muat Semula Data** membaca rekod gred/sasaran terkini; **Muat Semula Murid** memuatkan senarai nama dan kelas.

Jika sambungan gagal, perubahan menunggu disimpan dalam peranti. Sistem cuba menyambung semula secara berkala, apabila Internet kembali dan apabila halaman diaktifkan semula. **Sambung Semula** juga mencuba sambungan baharu. Jangan padam data laman dalam pelayar ketika masih ada perubahan belum dihantar.

## Struktur Sheet

| Tab | Kandungan |
| --- | --- |
| `STPM_Gred` | Gred sebenar S1, S2, S3, UL1, UL2 dan KK |
| `STPM_Sasaran` | Gred sasaran mengikut murid, subjek dan pentaksiran |
| `STPM_Operasi` | ID dan masa operasi simpan yang berjaya |

Kolum gred/sasaran: `MURID_ID`, `KELAS`, `NAMA_MURID`, `PENTAKSIRAN`, `SUBJEK`, `GRED`, `NILAI_GRED`, `DIKEMAS_KINI`.

Tab asal `Sheet1` dikekalkan. Jangan tukar nama tab atau tajuk kolum. Gred kosong disimpan sebagai rekod kosong supaya gred yang telah dikosongkan tidak muncul semula daripada sandaran lama.

Setiap simpanan mengemas kini sel gred yang berubah sahaja. Perubahan guru untuk murid/subjek berlainan dikekalkan. Jika dua guru mengubah sel sama, perubahan terakhir yang diterima digunakan. Gred sebenar turut mengisi sasaran sel yang sama, mengikut tingkah laku sistem asal.

Senarai murid masih dibaca daripada sumber CSV Google Sheet asal, dengan `students.csv` sebagai salinan jika sumber itu gagal. Analisis GP dan PNGK dikira dalam laman berdasarkan rekod gred/sasaran yang dibaca semula.

## Laluan yang disediakan

- `GET /exec`: status akses dan jumlah rekod, tanpa menulis data.
- `GET /exec?action=load`: rekod gred dan sasaran dalam JSON. Bacaan ini menyediakan tab jika belum wujud.
- `GET /exec?action=bridge&channel=...&origin=...`: sambungan iframe untuk laman GitHub Pages.
- `stpmRequest({ action: 'load' })`: bacaan melalui `google.script.run`.
- `stpmRequest({ action: 'save', operationId: '...', changes: [...] })`: simpan perubahan dan pulangkan rekod terkini.
- `POST /exec`: permintaan JSON dengan format sama, untuk klien yang boleh membaca respons HTTP.

Laman menggunakan iframe dan `google.script.run`, mengikut [mekanisme komunikasi HTML Service Google](https://developers.google.com/apps-script/guides/html/communication), untuk mendapat pengesahan simpanan. Ia tidak bergantung pada `fetch` dengan `mode: 'no-cors'` kerana respons itu tidak boleh dibaca untuk mengesahkan simpanan.

Contoh satu perubahan yang dihantar oleh laman:

```json
{
  "action": "save",
  "operationId": "stpm_20261014_contoh123456",
  "changes": [
    {
      "kind": "grade",
      "studentId": "P2A::NAMA MURID",
      "assessmentId": "sem1",
      "subjectId": "pa",
      "value": "A"
    }
  ]
}
```

`operationId` dijana secara automatik dan bukan kod akses. Ia mengelakkan penghantaran semula operasi sama menimpa perubahan guru lain jika pengesahan respons hilang. Maksimum 200 perubahan setiap permintaan; laman membahagikan import besar kepada beberapa permintaan.

## Status pengesahan pakej

Kod diuji secara tempatan dengan simulasi perkhidmatan Sheet dan sambungan. Pakej ini belum dipasang atau diterbitkan dalam akaun Google/GitHub. Simpanan langsung perlu disahkan melalui langkah di bahagian 3 selepas pemasangan.
