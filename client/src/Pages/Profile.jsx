import React from 'react';
import Header from '../components/Header';
import './profile.css';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Profile = () => {
    const navigate = useNavigate();

    const logout = () => {
        localStorage.removeItem('token');

        toast.success('Successfully Logged Out', { autoClose: 3000 });

        setTimeout(() => {
            navigate('/userlogin');
        }, 4000); 
    };

    return (
        <div>
            <Header />
            <ToastContainer />

            <div className="profile_dashboard_container">
                <Link to="/editprofile" className="link_wrapper" >
                    <div className="profile_card_dashboard">
                        <h2>My Profile</h2>
                    </div>
                </Link>

                <Link to="/changepassword" className="link_wrapper">
                    <div className="profile_card_dashboard">
                        <h2>Change My Password</h2>
                    </div>
                </Link>

                <div className="link_wrapper">
                    <div className="profile_card_dashboard" onClick={logout} style={{ cursor: 'pointer' }}>
                        <h2>Logout</h2>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Profile;
