import React, { useState } from 'react';
import axios from 'axios';

const PasswordUploadForm = ({ onManualAdd }) => {
    const [formData, setFormData] = useState({ serviceName: '', username: '', password: '', source: '' });
    const [feedback, setFeedback] = useState('');
    const API_BASE_URL = 'http://localhost:3000/api'; // Should be your Render URL in production

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${API_BASE_URL}/report/add`, formData);
            setFeedback(`✅ ${response.data.message}`);
            onManualAdd(formData); // Pass data up to Dashboard to update state
            // Optionally clear form here
        } catch (error) {
            setFeedback(`❌ Error submitting: ${error.message}`);
        }
    };

    return (
        <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
            <h3>🔑 Manual / Import Data Entry</h3>
            <form onSubmit={handleSubmit}>
                <input type="text" name="serviceName" placeholder="Service Name" onChange={handleChange} required />
                <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
                <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
                <input type="text" name="source" placeholder="Source" onChange={handleChange} required />
                <button type="submit">Add Password</button>
            </form>
            {feedback && <p style={{ marginTop: '10px', fontWeight: 'bold' }}>{feedback}</p>}
        </div>
    );
};

export default PasswordUploadForm;