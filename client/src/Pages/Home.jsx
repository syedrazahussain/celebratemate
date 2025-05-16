import React from 'react'
import './home.css'
import Header from '../components/Header'
import { Link } from 'react-router-dom'

const Home = () => {
    return (

        <div>
            <Header />


            <div className="main_content">
                <div className="four_div">
                    <Link to="/registerevent" className='Link_div'>
                        <div className="box">
                            <p>Schedule a Wish</p>
                        </div>
                    </Link>

                    <Link to="/manageevent" className='Link_div'>
                        <div className="box">
                            <p>Manage Wish</p>
                        </div>
                    </Link>

                    <Link to="/contactsaved" className='Link_div'>
                        <div className="box">
                            <p>Past Events & Contacts</p>
                        </div>
                    </Link>
                    
                    <Link to="/profiledashboard" className='Link_div'>
                        <div className="box">
                            <p>Manage Profile</p>
                        </div>
                    </Link>



                </div>
            </div>

        </div>

    )
}

export default Home
