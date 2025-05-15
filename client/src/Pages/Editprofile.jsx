import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import "./editprofile.css";
import { MdEditNote, MdClose } from "react-icons/md";
import axios from "axios";

const Editprofile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const [originalData, setOriginalData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const API_URL = "https://celebratemate-backend.onrender.com/api/myprofile";

  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await axios.get(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const user = response.data.user;

        setUserData(user);
        setOriginalData(user);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load profile data");
        setLoading(false);
      }
    };

    fetchUserData();
  }, [API_URL]);

  const handleEditClick = () => {
    if (isEditing) {
      setUserData(originalData); 
      setFeedback("");
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData({ ...userData, [name]: value });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(
        API_URL,
        userData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOriginalData(response.data.user);
      setFeedback("Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setFeedback("Failed to update profile");
    }
  };

  const isDataUnchanged =
    userData.name === originalData.name &&
    userData.email === originalData.email &&
    userData.phone === originalData.phone;

  return (
    <div>
      <Header />
      <div className="editprofile_container">
        <div className="edit_form_container">
          <div className="password_heading">
            <div className="prof_head">

            <h1>My Profile</h1>
            </div>
            <div className="icon">
              
            {isEditing ? (
              <MdClose className="edit_icon" onClick={handleEditClick} />
            ) : (
              <MdEditNote className="edit_icon" onClick={handleEditClick} />
            )}
            </div>
          </div>

          {loading ? (
            <div className="loading_message">Loading...</div>
          ) : error ? (
            <div className="error_message">{error}</div>
          ) : (
            <>
              <div className="input_edit">
                <label>Name:</label>
                <input
                  type="text"
                  name="name"
                  value={userData.name}
                  readOnly={!isEditing}
                  onChange={handleChange}
                />
              </div>

              <div className="input_edit">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={userData.email}
                  readOnly={!isEditing}
                  onChange={handleChange}
                />
              </div>

              <div className="input_edit">
                <label>Phone:</label>
                <input
                  type="text"
                  name="phone"
                  value={userData.phone}
                  readOnly={!isEditing}
                  onChange={handleChange}
                />
              </div>

              {isEditing && (
                <div className="change_btn">
                  <button onClick={handleSubmit} disabled={isDataUnchanged}>
                    Submit
                  </button>
                </div>
              )}

              {feedback && <div className="feedback_message">{feedback}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editprofile;
