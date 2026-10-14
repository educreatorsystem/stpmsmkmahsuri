# Sistem STPM SMK Mahsuri - Google Sheet versi 3

Pakej ini menghubungkan laman GitHub Pages kepada Apps Script untuk simpan dan baca semula gred/sasaran tanpa kod akses.

1. Pasang `Code.gs` dalam projek Apps Script sedia ada. Jalankan `initializeSTPM` dan deploy **New version**.
2. Muat naik `index.html`, `app.js`, `google-sheet-sync.js`, `styles.css`, `students.csv` dan `lencana-mahsuri.jpeg` ke folder penerbitan GitHub Pages yang sama.
3. Ikuti `PANDUAN-APPSCRIPT.md` untuk tetapan dan pengesahan simpanan sebenar.

Google Sheet: https://docs.google.com/spreadsheets/d/1GvN54iV0Paq2Fkn2X-MKI3Bm-YsJpzsdsxpwbheM-_Y/edit

Laman: https://educreatorsystem.github.io/stpmsmkmahsuri/

URL Apps Script telah dipasang dalam `google-sheet-sync.js`. Nama dan kelas murid masih dimuatkan daripada sumber CSV asal. Rekod gred/sasaran yang berjaya dihantar disimpan dalam `STPM_Gred` dan `STPM_Sasaran`. `localStorage` menyimpan sandaran dan giliran penghantaran semasa sambungan terganggu.

Kod Apps Script dan laman mesti dikemas kini bersama. Pakej ini belum diterbitkan secara langsung.
