import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import './registerevent.css';
import axios from 'axios';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const EditEventForm = () => {
    const [event, setEvent] = useState(null);
    const { id } = useParams();

    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/event/${id}`);
                console.log("Response Data:", res.data);
    
                if (res.data) {
                    setEvent(res.data);
    
                    setName(res.data.name || '');
                    setType(res.data.type || '');
    
                    
                    const dateObj = new Date(res.data.date);
                    const localDate = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
                        .toISOString()
                        .split('T')[0];
    
                    setDate(localDate);
    
                    setTime(res.data.time || '');
                    setMobile(res.data.mobile || '');
                    setEmail(res.data.email || '');
                    setMessage(res.data.message || '');
                } else {
                    toast.warn("Event data not found.", { autoClose: 3000 });
                }
    
            } catch (error) {
                console.error('Error while fetching the event:', error);
                toast.error("Error fetching event data.", { autoClose: 3000 });
            }
        };
    
        fetchData();
    }, [id]);
    

    const handleSubmit = async (e) => {
        e.preventDefault();

        const updatedData = {
            name,
            type,
            date,
            time,
            mobile,
            email,
            message,
        };

        try {
            await axios.put(`http://localhost:5000/api/event/${id}`, updatedData);
            toast.success("Event updated successfully!", { autoClose: 3000 });
            setTimeout(() => {
                navigate('/manageevent')
            }, 4000);
            
        } catch (err) {
            console.error('Error updating the event:', err);
            toast.error("Error updating the event.", { autoClose: 3000 });
        }
    };

    if (!event) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <Header />
            <ToastContainer />

            <div className="main_container">
                <div className="form_container">
                    <form onSubmit={handleSubmit}>
                        <h2>Edit the Wish</h2>

                        <div className="input_register_form_fields">
                            <input 
                                type="text" 
                                value={name} 
                                name="name" 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="Person Name" 
                                id="name" 
                            />
                        </div>

                        <div className="input_register_form_fields">
                            <select 
                                id="type" 
                                value={type} 
                                onChange={(e) => setType(e.target.value)} 
                                name="type"
                            >
                                <option value="">Select Event Type</option>
                                <option value="Birthday">Birthday</option>
                                <option value="Anniversary">Anniversary</option>
                            </select>
                        </div>

                        <div className="input_register_form_fields">
                            <input 
                                type="date" 
                                value={date} 
                                name="date" 
                                onChange={(e) => setDate(e.target.value)} 
                                id='date'
                            />
                            <input 
                                type="time" 
                                value={time} 
                                name="time" 
                                onChange={(e) => setTime(e.target.value)} 
                                id='time'
                            />
                        </div>

                        <div className="input_register_form_fields">
                            <input 
                                type="text" 
                                id="mobile" 
                                placeholder="Person Mobile No" 
                                value={mobile}  
                                name="mobile" 
                                onChange={(e) => setMobile(e.target.value)}
                            />
                        </div>

                        <div className="input_register_form_fields">
                            <input 
                                type="text" 
                                id="email" 
                                placeholder="Person Email Id" 
                                value={email} 
                                name="email" 
                                onChange={(e) => setEmail(e.target.value)} 
                            />
                        </div>

                        <div className="input_register_form_fields">
                            <textarea 
                                id="message" 
                                placeholder="Message" 
                                value={message} 
                                name="message" 
                                onChange={(e) => setMessage(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="sub_btn">
                            <button type="submit">Submit</button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditEventForm;
