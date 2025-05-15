import React, { useState, useEffect } from 'react'
import Header from '../components/Header'
import './manageevent.css'
import axios from 'axios'
import { Navigate, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ManageEvent = () => {
    const [data, setdata] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchdata = async () => {
            try {
                const token = localStorage.getItem('token');
    
                const response = await axios.get('http://localhost:5000/api/fetch_event', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
    
                setdata(response.data.events);
    
            } catch (err) {
                console.log(err);
                toast.error('Error fetching events. Please try again.', { autoClose: 3000 });
            }
        };
        fetchdata();
    }, []);
    

    const capitalizeFirstLetter = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const handleedit=(id)=>{
        navigate(`/edit/${id}`);
    }


    const handleDelete =async(id)=>{
        try {
            await axios.delete(`http://localhost:5000/api/event/${id}`);
            toast.success('Event deleted successfully!', { autoClose: 3000 });

            
            setdata(data.filter(event => event.id !== id));
            
        } catch (err) {

            console.error('error deleting wish',err)
            toast.error('Failed to delete event. Try again.', { autoClose: 3000 });

            
        }
    }

    return (
        <div>
            <Header />
            <ToastContainer />
            <div className="main_manage_event_container">
                <div className="fetch_details">
                    <div className="manage_heading">Manage Wish</div>
                    {data.length === 0 ? (
                        <p>No Event Wish Found</p>
                    ) : (
                        data.map((event, index) => (
                            <div key={index} className="vertical_cards">
                                <div className="left_content_of_vertical_card">
                                    <div className="name">{capitalizeFirstLetter(event.name)}</div>

                                    <div className="contact">{event.mobile}</div>
                                </div>
                                <div className="middle_content_of_vertical_card">
                                    <div className="type"><h1>{event.type}</h1></div>
                                </div>
                                <div className="right_content_of_vertical_card">
                                    <div className="date">{event.date.split('T')[0]}</div>

                                    <div className="time">{event.time}</div>
                                </div>
                                <div className="options">
                                    <div className="edit"><button onClick={()=> handleedit(event.id)}>Edit</button></div>
                                    <div className="delete"> <button onClick={() => handleDelete(event.id)}>Delete</button></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default ManageEvent
