import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Lazy loaded pages
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const UserList = lazy(() => import('./pages/users/UserList'))
const RoleList = lazy(() => import('./pages/roles/RoleList'))
const PermissionList = lazy(() => import('./pages/permissions/PermissionList'))
const Profile = lazy(() => import('./pages/profile/Profile'))

const PublicLayout = lazy(() => import('./components/PublicLayout'))
const Home = lazy(() => import('./pages/public/Home'))
const About = lazy(() => import('./pages/public/About'))
const Blog = lazy(() => import('./pages/public/Blog'))
const BlogDetail = lazy(() => import('./pages/public/BlogDetail'))
const Contact = lazy(() => import('./pages/public/Contact'))
const Services = lazy(() => import('./pages/public/Services'))
const Products = lazy(() => import('./pages/public/Products'))
const ProductDetail = lazy(() => import('./pages/public/ProductDetail'))

const KategoriArtikel = lazy(() => import('./pages/admin/KategoriArtikel'))
const KategoriLayanan = lazy(() => import('./pages/admin/KategoriLayanan'))
const Layanan = lazy(() => import('./pages/admin/Layanan'))
const Artikel = lazy(() => import('./pages/admin/Artikel'))
const Testimoni = lazy(() => import('./pages/admin/Testimoni'))
const AnggotaTim = lazy(() => import('./pages/admin/AnggotaTim'))
const Faq = lazy(() => import('./pages/admin/Faq'))
const PesanKontak = lazy(() => import('./pages/admin/PesanKontak'))
const Newsletter = lazy(() => import('./pages/admin/Newsletter'))
const PengaturanSitus = lazy(() => import('./pages/admin/PengaturanSitus'))
const Produk = lazy(() => import('./pages/admin/Produk'))
const ChatCenter = lazy(() => import('./pages/admin/ChatCenter'))
const Penawaran = lazy(() => import('./pages/admin/Penawaran'))
const Proyek = lazy(() => import('./pages/admin/Proyek'))
const Negosiasi = lazy(() => import('./pages/admin/Negosiasi'))
const NegosiasiDetail = lazy(() => import('./pages/admin/NegosiasiDetail'))
const ClientLogo = lazy(() => import('./pages/admin/ClientLogo'))
const Keunggulan = lazy(() => import('./pages/admin/Keunggulan'))
const RiwayatTransaksi = lazy(() => import('./pages/admin/RiwayatTransaksi'))
const RfmAnalysis = lazy(() => import('./pages/admin/RfmAnalysis'))
const PromoCampaign = lazy(() => import('./pages/admin/PromoCampaign'))
const BroadcastMaintenance = lazy(() => import('./pages/admin/BroadcastMaintenance'))

const FallbackLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-base-100">
    <span className="loading loading-spinner loading-lg text-primary"></span>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<FallbackLoader />}>
          <Routes>
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="tentang" element={<About />} />
              <Route path="blog" element={<Blog />} />
              <Route path="blog/:slug" element={<BlogDetail />} />
              <Route path="layanan" element={<Services />} />
              <Route path="layanan/:categorySlug" element={<Services />} />
              <Route path="produk" element={<Products />} />
              <Route path="produk/:slug" element={<ProductDetail />} />
              <Route path="kontak" element={<Contact />} />
            </Route>

            <Route path="/login" element={<Login />} />

            <Route path="/admin" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UserList />} />
              <Route path="roles" element={<RoleList />} />
              <Route path="permissions" element={<PermissionList />} />
              <Route path="profile" element={<Profile />} />
              
              <Route path="kategori-artikel" element={<KategoriArtikel />} />
              <Route path="kategori-layanan" element={<KategoriLayanan />} />
              <Route path="layanan" element={<Layanan />} />
              <Route path="artikel" element={<Artikel />} />
              <Route path="testimoni" element={<Testimoni />} />
              <Route path="anggota-tim" element={<AnggotaTim />} />
              <Route path="faq" element={<Faq />} />
              <Route path="pesan-kontak" element={<PesanKontak />} />
              <Route path="pelanggan-newsletter" element={<Newsletter />} />
              <Route path="pengaturan-situs" element={<PengaturanSitus />} />
              <Route path="produk" element={<Produk />} />
              <Route path="chat" element={<ChatCenter />} />
              <Route path="penawaran" element={<Penawaran />} />
              <Route path="negosiasi" element={<Negosiasi />} />
              <Route path="negosiasi/:id" element={<NegosiasiDetail />} />
              <Route path="proyek" element={<Proyek />} />
              <Route path="riwayat-transaksi" element={<RiwayatTransaksi />} />
              <Route path="rfm" element={<RfmAnalysis />} />
              <Route path="promo-campaign" element={<PromoCampaign />} />
              <Route path="broadcast-maintenance" element={<BroadcastMaintenance />} />
              <Route path="client-logos" element={<ClientLogo />} />
              <Route path="keunggulans" element={<Keunggulan />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App