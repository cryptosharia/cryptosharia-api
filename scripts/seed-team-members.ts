import { NestFactory } from '@nestjs/core';
import { AppModule } from '#src/app.module';
import { DrizzleService } from '#src/modules/drizzle/drizzle.service';
import { teamMembers } from '#src/modules/drizzle/drizzle.schema';

const INITIAL_TEAM_MEMBERS = [
  {
    slug: 'devin',
    name: 'Ust. Devin Halim Wijaya',
    credentials: 'B.B.A., M.Sc.',
    role: 'Board of Commissioners',
    imageUrl: '/team/board-devin-halim-wijaya.webp',
    description:
      'Mendukung penguatan perspektif syariah CryptoSharia melalui kajian fikih muamalah, fatwa aset kripto, dan screening aset digital.',
    focus: 'Fikih Muamalah & Screening Syariah',
    contribution:
      'Pemateri MasterClass CryptoSharia 2026 pada sesi Fikih Muamalah & Fatwa Crypto serta Screening Koin & Bedah Kasus.',
    joined: null,
    expertise: [
      { title: 'Fikih Muamalah', description: 'Prinsip transaksi dalam Islam' },
      { title: 'Fatwa Crypto', description: 'Kajian hukum aset digital' },
      { title: 'Screening Syariah', description: 'Penilaian aset dari aspek syariah' },
      { title: 'Aset Digital', description: 'Kajian produk dan transaksi crypto' },
    ],
    orderIndex: 0,
    isActive: true,
  },
  {
    slug: 'laksamana',
    name: 'Ust. Tengku Muhammad Laksamana Lelawangsa',
    credentials: 'S.Kom., Lc.',
    role: 'Board of Commissioners',
    imageUrl: '/team/board-muhammad-laksamana-lelawangsa.webp',
    description:
      'Pendakwah dan edukator syariah yang membahas penerapan hukum Islam pada transaksi keuangan modern, termasuk forex, futures, dan aset kripto.',
    focus: 'Fikih Muamalah & Hukum Transaksi Modern',
    contribution:
      'Pemateri webinar CryptoSharia mengenai hukum Forex, Futures, dan Crypto dalam Islam.',
    joined: null,
    expertise: [
      { title: 'Fikih Muamalah', description: 'Hukum transaksi dalam Islam' },
      { title: 'Forex & Futures', description: 'Kajian dari perspektif syariah' },
      { title: 'Aset Kripto', description: 'Hukum aset digital dalam Islam' },
      { title: 'Dakwah & Edukasi', description: 'Penyampaian literasi hukum Islam' },
    ],
    orderIndex: 1,
    isActive: true,
  },
  {
    slug: 'ali',
    name: 'Ust. Ali Hasan Bawazier',
    credentials: null,
    role: 'Board of Commissioners',
    imageUrl: '/team/board-ali-hasan-bawazier.webp',
    description:
      'Berperan dalam pembinaan nilai dan edukasi syariah di lingkungan CryptoSharia serta komunitas CryptoSharia Forum.',
    focus: 'Pembinaan & Edukasi Syariah',
    contribution:
      'Terlibat dalam Crypto Syariah Series 2025 sebagai Pembina CryptoSharia Forum.',
    joined: null,
    expertise: [
      { title: 'Pembinaan Syariah', description: 'Pembinaan nilai dan prinsip syariah' },
      { title: 'Edukasi Islam', description: 'Literasi dan pembinaan komunitas' },
    ],
    orderIndex: 2,
    isActive: true,
  },
  {
    slug: 'dea',
    name: 'Dea Saka Kurnia Putra',
    credentials: null,
    role: 'Board of Commissioners',
    imageUrl: '/team/board-dea-saka-kurnia-putra.webp',
    description:
      'Founder Asosiasi Aset Kripto Syariah Indonesia (AKSI) yang aktif membahas blockchain, Web3, smart contract, dan penerapan teknologi terdesentralisasi.',
    focus: 'Blockchain & Web3',
    contribution:
      'Pembicara talkshow Blockchain Frontier pada NUSHAFEST 2025.',
    joined: null,
    expertise: [
      { title: 'Blockchain', description: 'Teknologi dan implementasi blockchain' },
      { title: 'Web3', description: 'Ekosistem internet terdesentralisasi' },
      { title: 'Smart Contract', description: 'Aplikasi berbasis blockchain' },
      { title: 'Infrastruktur Digital', description: 'Implementasi teknologi blockchain' },
    ],
    orderIndex: 3,
    isActive: true,
  },
  {
    slug: 'sholahuddin',
    name: 'Sholahuddin Al Ayyubi',
    credentials: null,
    role: 'Chief Executive Officer',
    imageUrl: '/team/ceo-sholahuddin-al-ayyubi.webp',
    description:
      'Memimpin arah perusahaan, pengembangan kemitraan, dan pengambilan keputusan strategis CryptoSharia.',
    focus: 'Strategi Perusahaan & Partnership',
    contribution:
      'Pemateri MasterClass CryptoSharia 2026 untuk topik Peta Industri Crypto & Web3.',
    joined: null,
    expertise: [
      { title: 'Strategi', description: 'Arah dan prioritas perusahaan' },
      { title: 'Leadership', description: 'Kepemimpinan organisasi' },
      { title: 'Partnership', description: 'Pengembangan kemitraan strategis' },
      { title: 'Crypto & Web3', description: 'Pemetaan industri aset digital' },
    ],
    orderIndex: 4,
    isActive: true,
  },
  {
    slug: 'ghalib',
    name: 'Ghalib Ammar Ahsan',
    credentials: null,
    role: 'Chief Operating Officer',
    imageUrl: '/team/coo-ghalib-ammar-ahsan.webp',
    description:
      'Mengawal operasional dan koordinasi program agar strategi CryptoSharia dapat dieksekusi secara terstruktur.',
    focus: 'Operasional & Koordinasi Program',
    contribution:
      'Ketua Pelaksana Nusantara Sharia Finance Festival (NUSHAFEST) 2025.',
    joined: null,
    expertise: [
      { title: 'Operasional', description: 'Pelaksanaan aktivitas organisasi' },
      { title: 'Koordinasi Program', description: 'Sinkronisasi pelaksanaan kegiatan' },
      { title: 'Pelaksanaan Event', description: 'Koordinasi program dan kegiatan' },
    ],
    orderIndex: 5,
    isActive: true,
  },
  {
    slug: 'haidar',
    name: 'Habibullah Haidar Al Atsary',
    credentials: null,
    role: 'Chief Financial Officer',
    imageUrl: '/team/cfo-habibullah-haidar-al-atsary.webp',
    description:
      'Mengelola fungsi keuangan CryptoSharia, mulai dari arus kas dan anggaran hingga pelaporan dan evaluasi kinerja finansial.',
    focus: 'Finance & Financial Control',
    contribution: null,
    joined: null,
    expertise: [
      { title: 'Cashflow', description: 'Pengelolaan arus kas' },
      { title: 'Budgeting', description: 'Perencanaan dan kontrol anggaran' },
      { title: 'Laporan Keuangan', description: 'Penyusunan laporan finansial' },
      { title: 'Evaluasi Profit', description: 'Evaluasi performa finansial' },
    ],
    orderIndex: 6,
    isActive: true,
  },
  {
    slug: 'fikri',
    name: 'Muhammad Fikri Alfarizi',
    credentials: null,
    role: 'Chief Syariah Business Officer',
    imageUrl: '/team/csbo-muhammad-fikri-alfarizi.webp',
    description:
      'Memimpin fungsi bisnis syariah CryptoSharia, meliputi analisis, screening aset, dan standardisasi kepatuhan syariah.',
    focus: 'Analisis & Kepatuhan Syariah',
    contribution:
      'Menjalankan fungsi analisis syariah di PT Kripto Syariah Indonesia.',
    joined: '25 Mei 2025',
    expertise: [
      { title: 'Analisis Syariah', description: 'Analisis aktivitas dan produk' },
      { title: 'Screening Koin', description: 'Penilaian kepatuhan aset' },
      { title: 'Fikih Muamalah', description: 'Landasan transaksi syariah' },
      { title: 'Sharia Compliance', description: 'Standardisasi kepatuhan syariah' },
    ],
    orderIndex: 7,
    isActive: true,
  },
  {
    slug: 'bintang',
    name: 'Bintang Fajar Ramadhan',
    credentials: null,
    role: 'Chief Analytics Officer',
    imageUrl: '/team/cao-bintang-fajar-ramadhan.webp',
    description:
      'Memimpin fungsi analytics dengan fokus pada riset pasar dan proyek, analisis teknikal dan fundamental, manajemen risiko, serta portofolio.',
    focus: 'Market & Crypto Analytics',
    contribution:
      'Terlibat sebagai pengisi materi analisis dalam roadmap edukasi CryptoSharia.',
    joined: null,
    expertise: [
      { title: 'Technical Analysis', description: 'Analisis teknikal dan market structure' },
      { title: 'Fundamental', description: 'Riset fundamental dan narasi' },
      { title: 'Risk Management', description: 'Pengelolaan risiko investasi' },
      { title: 'Portfolio Management', description: 'Pengelolaan portofolio' },
    ],
    orderIndex: 8,
    isActive: true,
  },
  {
    slug: 'rifatul',
    name: "Rif'atul Widaad Khotibin Tamhid",
    credentials: null,
    role: 'Chief Marketing Officer',
    imageUrl: '/team/cmo-rifatul-widaad-khotibin-tamhid.webp',
    description:
      'Memimpin marketing dan media melalui pengembangan konten, branding, strategi kanal, dan pertumbuhan platform digital CryptoSharia.',
    focus: 'Branding, Media & Marketing',
    contribution: null,
    joined: null,
    expertise: [
      { title: 'Creative Content', description: 'Pengembangan konten digital' },
      { title: 'Branding', description: 'Pengembangan identitas brand' },
      { title: 'Strategi Media', description: 'Strategi distribusi dan kanal' },
      { title: 'Platform Digital', description: 'Pengembangan kanal digital' },
    ],
    orderIndex: 9,
    isActive: true,
  },
  {
    slug: 'axellyo',
    name: 'Mokhamad Axellyo Ghani Adam',
    credentials: null,
    role: 'Chief Communication Officer',
    imageUrl: '/team/cco-mokhamad-axellyo-ghani-adam.webp',
    description:
      'Memimpin komunikasi dan engagement komunitas, termasuk pengelolaan interaksi anggota serta pelaksanaan aktivitas komunitas CryptoSharia.',
    focus: 'Communication & Community Engagement',
    contribution:
      'Terlibat sebagai PIC kegiatan komunitas dan pengelolaan engagement grup CryptoSharia.',
    joined: null,
    expertise: [
      { title: 'Komunikasi', description: 'Komunikasi dengan komunitas' },
      { title: 'Community Engagement', description: 'Aktivasi dan interaksi anggota' },
      { title: 'Aktivitas Komunitas', description: 'Pelaksanaan kegiatan komunitas' },
    ],
    orderIndex: 10,
    isActive: true,
  },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const drizzleService = app.get(DrizzleService);
    console.log('Seeding initial team members...');
    for (const member of INITIAL_TEAM_MEMBERS) {
      await drizzleService.db
        .insert(teamMembers)
        .values(member)
        .onConflictDoNothing({ target: teamMembers.slug });
      console.log(`- Seeded: ${member.name}`);
    }
    console.log('Seeding team members completed successfully!');
  } finally {
    await app.close();
  }
}

main().catch(console.error);
