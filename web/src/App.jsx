import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LocationDetail from './pages/LocationDetail';
import ItemDetail from './pages/ItemDetail';
import Search from './pages/Search';
import Wardrobe from './pages/Wardrobe';
import Laundry from './pages/Laundry';
import Outfits from './pages/Outfits';
import Settings from './pages/Settings';
import QRPrint from './pages/QRPrint';
import LentItems from './pages/LentItems';
import LostItems from './pages/LostItems';

function App() {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/location/:id" element={<LocationDetail />} />
                    <Route path="/item/:id" element={<ItemDetail />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/wardrobe" element={<Wardrobe />} />
                    <Route path="/laundry" element={<Laundry />} />
                    <Route path="/outfits" element={<Outfits />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/qr-print" element={<QRPrint />} />
                    <Route path="/lent" element={<LentItems />} />
                    <Route path="/lost" element={<LostItems />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
