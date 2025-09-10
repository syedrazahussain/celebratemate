import React, { useEffect, useState } from 'react'
import './userregister.css'
import { Link, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';




const UserRegister = () => {
  const [data, setdata] = useState({
    email: '',
    password: ''
  })

  const { email, password } = data
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {

      navigate("/");
      return;
    }
  }, [])

  const onChange = (e) => {
    setdata({ ...data, [e.target.name]: e.target.value })
  }

  const onSubmitForm = async (e) => {
    e.preventDefault();

    try {

      const body = { email, password }

      const response = await fetch('https://celebratemate-backend.onrender.com/api/loginuser', {
        method: 'post',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify(body)

      })
    const parseRes = await response.json();

if (response.ok && parseRes.token) {
  localStorage.setItem("token", parseRes.token);
  toast.success("Login Successfully", { autoClose: 2000 });
  setTimeout(() => navigate("/"), 3000);
} else {
  toast.error(parseRes.error || "Invalid credentials", { autoClose: 3000 });
}



    } catch (err) {
      console.error(err.message)
      toast.error('Error while Login', { autoClose: 3000 });

    }
  }



  return (
    <div>
      <ToastContainer />
      <div className="background_banner">
        <div className="register_form">
          <form onSubmit={onSubmitForm}>
            <h1>User Login</h1>


            <div className="input_field">
              <input type="text" placeholder='Email' name='email' value={email} onChange={e => onChange(e)} />
            </div>



            <div className="input_field">
              <input type="text" placeholder='Password' name='password' value={password} onChange={e => onChange(e)} />
            </div>



            <p>
              Don't have a account? <Link to="/userregister">Register</Link>
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
