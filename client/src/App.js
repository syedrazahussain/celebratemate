
import React, { useEffect, useState } from 'react';
import { Route,Routes } from 'react-router-dom';
import Home from './Pages/Home';
import UserRegister from './Pages/UserRegister';
import UserLogin from './Pages/UserLogin';
import RegisterEvent from './Pages/RegisterEvent';
import ManageEvent from './Pages/ManageEvent';
import ContactSaved from './Pages/ContactSaved';
import EditEventForm from './Pages/EditEventForm';
import Profile from './Pages/Profile';
import ChangePassword from './Pages/ChangePassword';
import Editprofile from './Pages/Editprofile';








const App = () => {
useEffect(() => {
    const intervalId = setInterval(() => {
      fetch('https://celebratemate-backend.onrender.com/api/heartbeat')
        .then(response => {
          if (!response.ok) {
            console.error('Heartbeat ping failed');
          }
        })
        .catch(err => {
          console.error('Error sending heartbeat ping:', err);
        });
    }, 300000); // every 5 minutes

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);


  return (
    <div>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/userregister' element={<UserRegister />} />
        <Route path='/userlogin' element={<UserLogin />} />
        <Route path='/registerevent' element={<RegisterEvent />} />
        <Route path='/manageevent' element={<ManageEvent />} />
        <Route path='/contactsaved' element={<ContactSaved />} />
        <Route path='/edit/:id' element={<EditEventForm />} />
        <Route path='/profiledashboard' element={<Profile />} />
        <Route path='/changepassword' element={<ChangePassword />} />
        <Route path='/editprofile' element={<Editprofile />} />
        
        
        
        
        
      </Routes>

      
    </div>
  );
};

export default App;
