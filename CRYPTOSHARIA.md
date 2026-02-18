# CryptoSharia

## Tentang CryptoSharia

**PT Kripto Syariah Indonesia** adalah perusahaan pionir dalam bidang kripto yang sesuai syariah di Indonesia. CryptoSharia hadir untuk menjembatani dunia cryptocurrency dengan prinsip-prinsip keuangan Islam (syariah), sebuah ceruk pasar yang spesifik dan masih sangat minim pemainnya di Indonesia.

### Misi

Membantu umat Muslim Indonesia dalam menavigasi dunia kripto dengan cara yang halal: melalui edukasi, screening token, media, dan komunitas.

### Konteks Pasar

- Indonesia adalah salah satu negara dengan populasi Muslim terbesar di dunia (~230 juta+ Muslim)
- Indonesia merupakan salah satu pasar kripto yang tumbuh paling cepat di Asia Tenggara, dan kripto sudah legal di Indonesia
- Banyak Muslim Indonesia yang benar-benar peduli apakah investasi mereka halal atau haram
- Namun, masih ada gap besar: kebanyakan komunitas kripto di Indonesia tidak memiliki perspektif syariah, sementara komunitas keuangan Islam tradisional belum serius menyentuh kripto
- **Skeptisisme yang masih tinggi**: Tidak hanya di Indonesia, tapi di seluruh dunia (terutama di kalangan umat Islam) masih banyak yang memandang Web3, blockchain, dan kripto dengan skeptis. Anggapan umum: haram, judi/spekulasi, tidak ada utilitas nyata, dan sebagainya. Salah satu goal utama CryptoSharia adalah menyadarkan dan mengedukasi masyarakat, khususnya Muslim Indonesia, bahwa teknologi ini bisa dimanfaatkan dengan cara yang sesuai syariah.

CryptoSharia mengisi gap tersebut. **"Kripto, tapi Syariah."**

### Status Saat Ini

- **Entitas Hukum**: PT Kripto Syariah Indonesia (PT yang terdaftar)
- **Tahap**: Masih early-stage: seluruh platform dan ekosistem masih dalam proses pengembangan awal, belum ada yang live
- **Founder**: Lulusan LIPIA (Lembaga Ilmu Pengetahuan Islam dan Arab), kelahiran 2001 - memiliki background pendidikan Islam formal yang memperkuat kredibilitas aspek syariah
- **Tim**: Tim internal kecil yang berkontribusi secara suka rela (belum ada hierarki organisasi formal), juga didukung oleh ustadz-ustadz yang kredibel di bidang muamalah kontemporer
- **Model Komunitas**: Sederhana: **tim internal** (staff/kontributor) vs. **anggota** (pengguna komunitas)

---

## Ekosistem Digital

CryptoSharia bukan sekadar satu website atau satu aplikasi. CryptoSharia adalah **ekosistem digital modular** yang terdiri dari beberapa platform yang saling terhubung, semuanya didukung oleh satu API terpusat (`cryptosharia-api`).

### Platform-Platform

- **CryptoSharia Profile** (`www.cryptosharia.id`)
  Website resmi perusahaan. Berisi company profile, visi & misi, informasi tim, serta blog aktivitas perusahaan. Juga berfungsi sebagai overview dan pintu masuk ke seluruh ekosistem CryptoSharia.

- **CryptoSharia Accounts** (`accounts.cryptosharia.id`)
  Pusat autentikasi dan manajemen identitas terpusat untuk **seluruh** ekosistem (baik member biasa maupun tim internal). Semua proses signin/signup terjadi di sini (SSO), sehingga platform lain cukup redirect ke Accounts untuk autentikasi.

- **CryptoSharia Admin** (`admin.cryptosharia.id`)
  Dashboard internal khusus staff untuk mengelola seluruh ekosistem CryptoSharia: manajemen konten (posts, token screenings), manajemen users, dan operasional lainnya.

- **CryptoSharia Media** (`media.cryptosharia.id`)
  Hub konten utama — berita, artikel edukasi, riset, analisis pasar, dan screening token syariah. Ini adalah platform yang paling visible ke publik dan menjadi wajah utama untuk menarik dan mengedukasi audiens.

- **CryptoSharia Community** (`community.cryptosharia.id`)
  Pusat informasi dan portal masuk komunitas CryptoSharia. Platform ini berfungsi sebagai landing page yang berisi penjelasan, testimoni, dan daftar paket membership (gratis & premium). Jika pengguna sudah login dan memiliki paket yang sesuai, platform ini secara dinamis akan menampilkan tombol akses langsung ke grup WhatsApp atau Discord resmi (Tentunya dengan verifikasi akun). Komunikasi antar anggota tetap terjadi di platform pihak ketiga tersebut.

- **CryptoSharia Academy** (`academy.cryptosharia.id`)
  Platform pembelajaran dan edukasi: kursus online, materi pembelajaran berbasis video, alur pembelajaran, sertifikasi, dan konten edukasi terstruktur seputar kripto syariah. Bukan sekadar kumpulan artikel, melainkan sistem pembelajaran yang terorganisir.

- **CryptoSharia Store** (`store.cryptosharia.id`)
  Pusat transaksi seluruh ekosistem — langganan community premium, langganan Academy, pembelian modul Academy, produk digital (ebook, dll), dan merchandise. Semua yang berhubungan dengan pembayaran di ekosistem CryptoSharia terpusat di sini.

- **CryptoSharia UI** (`ui.cryptosharia.id`)
  Design system dan component library standar untuk seluruh ekosistem CryptoSharia (sejenis Material Design atau Fluent Design, tapi milik CryptoSharia sendiri). Berisi kumpulan reusable components, theme, dan panduan visual yang digunakan semua platform agar konsisten.

### Prinsip Arsitektur

1. **API First**: `cryptosharia-api` adalah "otak" dan satu-satunya sumber kebenaran. Semua platform adalah konsumer dari API ini.
2. **Satu Akun untuk Semua** — Pengguna mendaftar sekali (via CryptoSharia Accounts) dan bisa mengakses semua platform (Media, Community, Academy, Store, dll).
3. **BFF Pattern** — Semua platform adalah aplikasi SvelteKit yang berkomunikasi dengan API secara server-to-server (Backend-for-Frontend). Tidak ada request langsung dari browser ke API.
4. **Modular & Scalable** — Setiap komponen dirancang dengan asumsi akan dikonsumsi oleh beberapa layanan berbeda.

### Model Identitas

- Satu tabel `users` untuk semua orang — setiap user memiliki role
- `role = "member"` → Pengguna biasa (bisa menggunakan Community, Academy, Store, Media, dll)
- `role = "admin"` / `role = "super_admin"` / role lainnya → Staff/Admin (fitur pengguna + akses dashboard admin)
- Admin juga bisa menggunakan semua fitur pengguna (berlangganan, beli, dll)

---

## Proposisi Nilai

### Token Screening

Fitur pembeda utama CryptoSharia. Menjawab pertanyaan fundamental: **"Apakah token ini halal?"** Screening dilakukan oleh tim internal CryptoSharia sendiri, dengan mempertimbangkan sumber-sumber eksternal yang relevan. Belum ada pihak lain di Indonesia yang menjawab ini secara sistematis.

### Edukasi

Sebagai pionir, CryptoSharia perlu mengedukasi pasar bahwa ruang ini ada. Academy bukan hanya monetisasi: ini adalah fondasi otoritas brand.

### Media

Berita, riset, dan analisis melalui lensa syariah memberikan kredibilitas yang tidak bisa ditiru oleh situs kripto generik.

### Komunitas

Setelah komunitas Muslim kripto terkumpul di bawah satu brand, network effect menjadi sangat sulit untuk direplikasi oleh kompetitor.

---

## Flywheel

```
Token Screening → "Apakah ini halal?"
       ↓
  Media/Edukasi → "Ini alasannya, dan cara investasi yang benar"
       ↓
    Komunitas → "Bergabung dengan yang berpikiran sama"
       ↓
     Store → "Akses komunitas premium, modul kursus, merchandise, dll"
       ↓
     Kepercayaan & Otoritas → Lebih banyak orang bertanya "Apakah ini halal?"
       ↓
    STATUS PIONIR SEMAKIN KUAT
```

---

## Tech Stack

- **Framework**: SvelteKit (fullstack, untuk Backend API maupun seluruh platform frontend)
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS
- **ORM**: Drizzle ORM
- **Validasi & API Spec**: Zod
- **Database**: PostgreSQL
- **Autentikasi**: JWT dengan cookie lintas subdomain (`domain=.cryptosharia.id`)
