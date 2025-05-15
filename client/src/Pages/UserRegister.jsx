import React, { useEffect, useState } from 'react'
import './userregister.css'
import { Link, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



const UserRegister = () => {
  const navigate = useNavigate()
  const [data, setdata] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  })
  const { name, email, phone, password } = data;


  const onChange = (e) => {

    setdata({ ...data, [e.target.name]: e.target.value })

  }
  
  useEffect(() => {
      const token = localStorage.getItem("token");
      if (token) {
  
        navigate("/");
        return;
      }
    }, [])
  

  const onSubmitForm = async (e) => {
  e.preventDefault();
  try {
    const body = { name, email, phone, password };
    const response = await fetch('https://celebratemate-backend.onrender.com/api/userregister', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const parseRes = await response.json();

    if (response.ok) {
      localStorage.setItem('token', parseRes.token);
      toast.success('Registration Successfully Completed', { autoClose: 2000 });

      setTimeout(() => {
        navigate('/userlogin');
      }, 2000);
    } else {
      toast.error(parseRes, { autoClose: 3000 });
    }

  } catch (err) {
    console.error(err.message);
    toast.error('Error while registration', { autoClose: 3000 });
  }
};


  return (
    <div>
      <ToastContainer />
      <div className="background_banner">
        <div className="register_form">
          <form onSubmit={onSubmitForm}>
            <h1>User Registration</h1>
            <div className="input_field">
              <input type="text" placeholder='Name' name='name' value={name} onChange={e => onChange(e)} />
            </div>

            <div className="input_field">
              <input type="text" placeholder='Email' name='email' value={email} onChange={e => onChange(e)} />
            </div>

            <div className="input_field">
              <input type="text" placeholder='Phone' name='phone' value={phone} onChange={e => onChange(e)} />
            </div>

            <div className="input_field">
              <input type="text" placeholder='Password' name='password' value={password} onChange={e => onChange(e)} />
            </div>



            <p>
              Already have an account? <Link to="/userlogin">Login</Link>
            </p>


            <div className="submit_btn">
              <button>Submit</button>
            </div>
          </form>
        </div>

      </div>

    </div>
  )
}

export default UserRegister
