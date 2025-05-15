import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import './contactsaved.css';
import axios from 'axios';

const ContactSaved = () => {
    const [data, setdata] = useState([]);

    useEffect(() => {
        const fetch_data = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('http://localhost:5000/api/savedcontact', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                setdata(response.data.events);

            } catch (err) {
                console.log('Error fetching saved contacts:', err);
            }
        };

        fetch_data();
    }, []);

    const formatDateTime = (date, time) => {
        const formattedDate = new Date(date).toLocaleDateString();
        const formattedTime = new Date(`1970-01-01T${time}`).toLocaleTimeString();
        return `${formattedDate} at ${formattedTime}`;
    };

    return (
        <div>
            <Header />
            <div className="main_contact_container">
                <div className="contact_heading">
                    <h1>Previous wishes that are already Wished</h1>
                </div>

                <div className="cards_container">
                    {data.length === 0 ? (
                        <p>No Data Found</p>
                    ) : (
                        data.map((event, index) => (
                            <div key={index} className="contact_card">
                                <div className="dateandtime_div">
                                    <div className="contact_date">{formatDateTime(event.date, event.time)}</div>
                                </div>
                                <div className="event_name">
                                    <h1>{event.type}</h1>
                                </div>
                                <div className="para">
                                    <p>
                                        You sent your best wishes for the "{event.type}" of Mr./Ms. {event.name},
                                        using the contact number {event.mobile} and email address {event.email}.
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactSaved;
