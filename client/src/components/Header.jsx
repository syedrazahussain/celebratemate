import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const [name, setName] = useState('');
    const navigate = useNavigate();

    async function getName() {
        try {
            const token = localStorage.getItem("token");
            
            if (!token) {
                console.warn("Token not found, redirecting to login");
                navigate("/userlogin");
                return;
            }
            

            const response = await fetch('https://celebratemate-backend.onrender.com/api/dashboard', {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem("token")}`
                }
              });
              

            if (response.status === 403) {
                console.warn("Token invalid or expired, redirecting to login");
                localStorage.removeItem("token");
                navigate("/userlogin");
                return;
            }

            const parseRes = await response.json();
            setName(parseRes.name);

        } catch (err) {
            console.error("Error fetching user name:", err.message);
            navigate("/userlogin");
        }
    }

    const logout = () => {
        localStorage.removeItem("token");
        navigate('/userlogin');
    };

    useEffect(() => {
        getName();
    }, []);

    return (
        <div className="dashboard_header">
            <div className="dashboard_heading">
                <h1>CelebrateMate Dashboard</h1>
            </div>

            <div className="display_name_logout_div">
                <h1>{name ? `Welcome, ${name}` : "Loading..."}</h1>
                <button onClick={logout}>Logout</button>
            </div>
        </div>
    );
};

export default Header;
