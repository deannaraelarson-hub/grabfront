import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PasswordUploadForm from './components/PasswordUploadForm'; // Assume this component exists
import './Dashboard.css'; // Good practice: use CSS

// IMPORTANT: This URL must point to your deployed Render Backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api'; 

function Dashboard() {
    const [passwords, setPasswords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notificationStatus, setNotificationStatus] = useState('');
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // --- OFFLINE FALLBACK LOGIC ---
    useEffect(() => {
        // 1. Check initial status
        setIsOnline(navigator.onLine);

        // 2. Attempt to load data from local storage IMMEDIATELY (Offline first)
        const storedPasswords = localStorage.getItem('savedPasswordInventory');
        if (storedPasswords) {
            try {
                const parsedData = JSON.parse(storedPasswords);
                setPasswords(parsedData);
                console.log("Data loaded successfully from LocalStorage (Offline mode active).");
            } catch (e) {
                console.error("Error parsing local storage data:", e);
            }
        }
    }, []);

    // --- FETCHING & REFRESHING LOGIC ---
    const fetchPasswords = useCallback(async () => {
        console.log("Attempting to fetch data from API...");
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/report/all`);
            const serverData = response.data;

            // Update state with fresh server data
            setPasswords(serverData);

            // **SAVE SUCCESSFUL DATA TO LOCAL STORAGE**
            localStorage.setItem('savedPasswordInventory', JSON.stringify(serverData));

            setNotificationStatus('✅ Data successfully updated from server.');

        } catch (error) {
            console.error("Error fetching data from server:", error);
            // If API fetch fails, we rely on the initial/cached data already in state.
            if (passwords.length > 0) {
                setNotificationStatus('⚠️ API Failure: Displaying cached data from last session (Offline view active).');
            } else {
                setNotificationStatus('🔴 CRITICAL: Connection Error AND No cached data found.');
            }
        } finally {
            setLoading(false);
        }
    }, [passwords]); // Depend on passwords to confirm if we have initial data

    // --- SET UP AUTO-REFRESH & WINDOW LISTENERS ---
    useEffect(() => {
        // Auto-refresh timer
        const intervalId = setInterval(fetchPasswords, 300000); 

        // Listen for network changes (Goes online/offline)
        const handleOnline = () => {
            setIsOnline(true);
            console.log("--- ONLINE DETECTED ---");
            // Re-fetch immediately when connection is restored
            fetchPasswords(); 
        };
        const handleOffline = () => {
            setIsOnline(false);
            console.log("--- OFFLINE DETECTED ---");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [fetchPasswords]);

    // --- Notification Trigger ---
    const triggerNotification = async () => {
        // This action is synchronous and relies on the network being available.
        if (!isOnline) {
            setNotificationStatus("❌ Cannot trigger Telegram: Device is currently offline.");
            return;
        }
        try {
            const response = await axios.post(`${API_BASE_URL}/notify/telegram`);
            setNotificationStatus('✅ Notification sent successfully to Telegram.');
        } catch (error) {
            setNotificationStatus('❌ Failed to send Telegram notification. Server might be down or credentials invalid.');
        }
    };

    const handleManualAdd = (newPassword) => {
        // When manual data is added, immediately try to refresh the list
        fetchPasswords(); 
    }

    if (loading && passwords.length === 0) {
        return <div className="loading-screen">🌐 Loading Passwords...</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>🌐 Universal Password Dashboard</h1>

            <div className={`status-bar ${isOnline ? 'online' : 'offline'}`}>
                Status: {isOnline ? '✅ Online & Syncing' : '❌ OFFLINE - Viewing Cached Data'}
            </div>

            <button onClick={triggerNotification} className="notify-button">
                🔔 Trigger Telegram Report
            </button>

            <PasswordUploadForm onManualAdd={handleManualAdd} />

            <h2>🔑 Password Inventory ({passwords.length} Total)</h2>

            {passwords.length > 0 ? (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Username</th>
                                <th>Password</th>
                                <th>Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {passwords.map((pw, index) => (
                                <tr key={index}>
                                    <td>{pw.serviceName}</td>
                                    <td>{pw.username}</td>
                                    <td className="password-cell">{pw.password}</td>
                                    <td>{pw.source}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="no-data">No passwords found. Start scanning or enter data manually.</p>
            )}
        </div>
    );
}

export default Dashboard;