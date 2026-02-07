import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LocationDetail from './pages/LocationDetail';
import ItemDetail from './pages/ItemDetail';
import Search from './pages/Search';

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
                </Routes>
            </main>
        </div>
    );
}

export default App;
