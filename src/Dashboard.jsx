import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PasswordUploadForm from './components/PasswordUploadForm';
import './Dashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function Dashboard() {
    const [passwords, setPasswords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notificationStatus, setNotificationStatus] = useState('');
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Load cache immediately
    useEffect(() => {
        const stored = localStorage.getItem('savedPasswordInventory');
        if (stored) {
            try { setPasswords(JSON.parse(stored)); } catch (e) {}
        }
    }, []);

    // Stable fetch function — NO passwords dependency
    const fetchPasswords = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE_URL}/report/all`, { timeout: 90000 });
            setPasswords(data);
            localStorage.setItem('savedPasswordInventory', JSON.stringify(data));
            setNotificationStatus('✅ Updated from server.');
        } catch (error) {
            console.error(error);
            setPasswords(prev => {
                setNotificationStatus(
                    prev.length > 0
                        ? '⚠️ API failed. Showing cached data.'
                        : '🔴 Connection error and no cache.'
                );
                return prev;
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch + interval + online listener
    useEffect(() => {
        fetchPasswords();
        const id = setInterval(fetchPasswords, 300000);
        const onOnline = () => { setIsOnline(true); fetchPasswords(); };
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            clearInterval(id);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, [fetchPasswords]);

    const triggerNotification = async () => {
        if (!isOnline) { setNotificationStatus('❌ Offline.'); return; }
        try {
            await axios.post(`${API_BASE_URL}/notify/telegram`, {}, { timeout: 20000 });
            setNotificationStatus('✅ Telegram sent.');
        } catch {
            setNotificationStatus('❌ Telegram failed.');
        }
    };

    const handleManualAdd = () => fetchPasswords();

    if (loading && passwords.length === 0) {
        return <div className="loading-screen">🌐 Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>🌐 Universal Dashboard</h1>
            <div className={`status-bar ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? '✅ Online' : '❌ Offline'}
            </div>
            <button onClick={triggerNotification} className="notify-button">🔔 Telegram</button>
            <PasswordUploadForm onManualAdd={handleManualAdd} />
            <h2>🔑 Inventory ({passwords.length})</h2>
            {passwords.length > 0 ? (
                <div className="table-wrapper">
                    <table>
                        <thead><tr><th>Service</th><th>Username</th><th>Password</th><th>Source</th></tr></thead>
                        <tbody>
                            {passwords.map((pw, i) => (
                                <tr key={i}>
                                    <td>{pw.serviceName}</td>
                                    <td>{pw.username}</td>
                                    <td className="password-cell">{pw.password}</td>
                                    <td>{pw.source}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <p className="no-data">No data. Enter manually or wait for scrape.</p>}
        </div>
    );
}

export default Dashboard;
