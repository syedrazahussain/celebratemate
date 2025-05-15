import React, { useState } from 'react';
import Header from '../components/Header';
import './changepassword.css';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ChangePassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(''); 
  const [successMessage, setSuccessMessage] = useState(''); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token'); 

      const response = await axios.put(
        'https://celebratemate-backend.onrender.com/api/changepassword',
        { email, newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setError(''); 
      setSuccessMessage('Password changed successfully'); 
      toast.success('Password changed successfully', { autoClose: 3000 });
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Failed to change password'); 
      setSuccessMessage(''); 
      toast.error('Failed to change password', { autoClose: 3000 });
    }
  };

  return (
    <div>
      <Header />
      <ToastContainer />
      <div className="change_password_main_container">
        <div className="password_form_container">
          <div className="password_heading">
            <h1>Change Password</h1>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="input_form_password">
              <label>Enter Your Email Id:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input_form_password">
              <label>Set New and Unique Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="input_form_password">
              <label>Confirm Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            
            {error && <div className="error_message">{error}</div>}

            
            {successMessage && <div className="success_message">{successMessage}</div>}

            <div className="change_btn">
              <button type="submit">Change Password</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
