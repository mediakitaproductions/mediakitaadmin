# Media Kita Admin — Starter Kit

Aplikasi administrasi responsif untuk CV. MEDIA KITA: quotation, invoice, klien, katalog jasa/peralatan, pencatatan pembayaran, laporan CSV, dan pratinjau cetak/Simpan sebagai PDF.

## Isi paket
- `index.html` — frontend tema hitam-oranye, responsif untuk HP/tablet/desktop.
- `Code.gs` — backend Google Apps Script untuk Google Sheets.
- `QUO - FORMAT.xlsx` dan `INV - FORMAT(20261026-082643).xlsx` — template referensi asli (disimpan terpisah, tidak diubah).

## A. Buat database Google Sheets
1. Buat spreadsheet baru bernama `MEDIA KITA ADMIN DATABASE`.
2. Salin ID spreadsheet dari URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.
3. Buka **Extensions > Apps Script**.
4. Ganti isi `Code.gs` dengan file `Code.gs` dalam paket.
5. Ganti `PASTE_YOUR_GOOGLE_SHEETS_SPREADSHEET_ID_HERE` dengan ID spreadsheet.
6. Simpan, pilih fungsi `setupDatabase`, lalu klik **Run** dan izinkan akses.
7. Di sheet `USERS`, tambahkan akun staf pada baris berikutnya, misalnya:
   - Email: `admin@contoh.com`
   - Name: `Admin`
   - Role: `Admin`
   - Active: `TRUE`
   Gunakan alamat Google yang benar. Hanya staf yang ada di daftar aktif yang boleh mengakses.

## B. Deploy backend
1. Di Apps Script, klik **Deploy > New deployment > Web app**.
2. Pilih identitas eksekusi dan akses yang sesuai dengan akun Google organisasi Anda.
3. Utamakan konfigurasi yang membuat Apps Script dapat membaca identitas Google pengguna. `Code.gs` memverifikasi `Session.getActiveUser().getEmail()` terhadap sheet `USERS`. Jika email kosong atau tidak teridentifikasi, akses akan ditolak.
4. Klik Deploy dan salin URL Web App berakhiran `/exec`.

**Penting:** ketersediaan email aktif bergantung pada jenis akun dan kebijakan deployment Google. Uji dengan satu akun staf terlebih dahulu. Jangan menonaktifkan pemeriksaan allowlist hanya agar aplikasi bisa berjalan.

## C. Publikasikan frontend ke GitHub Pages
1. Buat repo GitHub baru, misalnya `media-kita-admin`.
2. Unggah `index.html` ke root repo.
3. Buka **Settings > Pages**, pilih branch `main` dan folder `/ (root)`, lalu Save.
4. Buka URL GitHub Pages.
5. URL deployment Apps Script dan email pemilik `mediakitaproductions@gmail.com` sudah diisi sebagai nilai awal di `index.html`. Periksa kembali sebelum menghubungkan; staf dapat mengganti email sesuai akun yang terdaftar di sheet `USERS`. Setelah koneksi berhasil, pengaturan koneksi disimpan di browser perangkat itu.

## Fitur saat ini
- Dashboard ringkas.
- CRUD klien dan katalog item.
- Quotation dan invoice dengan item berulang, qty, satuan, frekuensi, harga satuan.
- Subtotal, diskon, pajak per dokumen, grand total, DP/terbayar, sisa tagihan.
- Nomor otomatis `QUO/YYYY/0001` dan `INV/YYYY/0001`.
- Invoice dapat menerima pencatatan pembayaran bertahap.
- Pratinjau dokumen dan cetak / **Save as PDF**.
- Ekspor ringkasan dokumen ke CSV.
- Identitas dan rekening perusahaan dapat diatur.

## Catatan template Excel
Template asli sudah diperiksa untuk memahami struktur dan labelnya. Frontend saat ini menghasilkan dokumen PDF dengan struktur sejenis (identitas perusahaan, klien, detail proyek, rincian item, subtotal/pajak/grand total, rekening, dan tanda tangan). Ini belum menyalin layout Excel secara piksel-per-piksel. Tahap berikutnya yang disarankan adalah menyelaraskan posisi/kolom dan syarat dokumen berdasarkan tampilan cetak kedua file Excel.

## Batasan dan keamanan
- GitHub Pages adalah hosting statis; ia tidak menyimpan data dengan aman sendiri.
- Jangan menaruh API secret, password, token privat, atau service-account key di `index.html` atau repo publik.
- Akses Google Sheets harus melalui backend yang memvalidasi identitas pengguna.
- Sebelum digunakan untuk dokumen resmi, uji deployment, penomoran bersamaan, perhitungan pajak, pembayaran parsial, dan cetak PDF. Untuk operasi multi-staf yang ramai, nomor dokumen sebaiknya dibuat memakai `LockService` agar tidak bentrok.
- Browser tertentu dapat membatasi permintaan lintas domain ke Apps Script. Jika frontend gagal membaca respons karena CORS/redirect, gunakan frontend yang di-host melalui Apps Script HTML Service atau backend perantara terautentikasi, jangan membuka database secara publik.
