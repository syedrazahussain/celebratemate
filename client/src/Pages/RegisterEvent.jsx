import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import './registerevent.css';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Navigate, useNavigate } from 'react-router-dom';

const RegisterEvent = () => {
    const [name, setname] = useState('');
    const [type, settype] = useState('');
    const [date, setdate] = useState('');
    const [time, settime] = useState('');
    const [mobile, setmobile] = useState('');
    const [email, setemail] = useState('');
    const [message, setmessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    async function generateWishMessage(clientName, eventType) {
        setLoading(true);
        try {
            const response = await axios({
                url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBTqw_pmYRVyEy_zSOL_M9RhRiezl7o8_w`,
                method: 'post',
                data: {
                    contents: [{
                        parts: [{
                            text: `Generate a unique, professional, and concise ${eventType} wish for a valued client named ${clientName}, incorporating relevant emojis to convey warmth, celebration, and best wishes — all within 30 words.`
                        }]
                    }]
                }
            });

            const generatedMessage = response.data.candidates[0].content.parts[0].text;
            setmessage(generatedMessage);
        } catch (error) {
            console.error('Error generating wish:', error);
            toast.error('Failed to generate wish. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (name && type) {
            generateWishMessage(name, type);
        }
    }, [name, type]);

    const handlesubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');

        if (!token) {
            toast.error('Authorization token is missing. Please login again.', { autoClose: 3000 });
            return;
        }

        const data = {
            name,
            type,
            date,
            time,
            mobile,
            email,
            message,
        };

        try {
            const response = await axios.post('https://celebratemate-backend.onrender.com/api/event', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            toast.success('Your Wish Remainder is sent successfully', { autoClose: 3000 });
            setTimeout(() => {
                navigate('/');
            }, 4000);
            
            
            setname('');
            settype('');
            setdate('');
            settime('');
            setmobile('');
            setemail('');
            setmessage('');

        } catch (err) {
            console.error('Error sending event:', err);
            toast.error('Something went wrong, check your internet or login status.', { autoClose: 3000 });
        }
    };

    return (
        <div>
            <Header />
            <ToastContainer />

            <div className="main_container">
                <div className="form_container">
                    <form onSubmit={handlesubmit}>
                        <h2>Send a Wish to Your Friend</h2>

                        <div className="input_register_form_fields">
                            <input
                                type="text"
                                value={name}
                                name="name"
                                onChange={(e) => setname(e.target.value)}
                                placeholder="Person Name"
                                id="name"
                            />
                        </div>

                        <div className="input_register_form_fields">
                            <select
                                id="type"
                                value={type}
                                onChange={(e) => settype(e.target.value)}
                                name="type"
                            >
                                <option>Select Event Type</option>
                                <option value="Birthday">Birthday</option>
                                <option value="Anniversary">Anniversary</option>
                            </select>
                        </div>

                        <div className="input_register_form_fields">
                            <input
                                type="date"
                                value={date}
                                name="date"
                                onChange={(e) => setdate(e.target.value)}
                                id='date'
                            />
                            <input
                                type="time"
                                value={time}
                                name="time"
                                onChange={(e) => settime(e.target.value)}
                                id='time'
                            />
                        </div>

                        <div className="input_register_form_fields">
                            <input
                                type="text"
                                id="mobile"
                                placeholder="Person Mobile no"
                                value={mobile}
                                name="mobile"
                                onChange={(e) => setmobile(e.target.value)}
                            />
                        </div>

                        <div className="input_register_form_fields">
                            <input
                                type="text"
                                id="email"
                                placeholder="Person Email Id"
                                value={email}
                                name="email"
                                onChange={(e) => setemail(e.target.value)}
                            />
                        </div>

                        <div className="input_register_form_fields">
                            <textarea
                                id="message"
                                placeholder="Generated Wish"
                                value={message}
                                name="message"
                                onChange={(e) => setmessage(e.target.value)}
                                disabled={loading}
                            ></textarea>
                        </div>

                        <div className="sub_btn">
                            <button type="submit" disabled={loading}>
                                {loading ? 'Generating...' : 'Submit'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterEvent;
