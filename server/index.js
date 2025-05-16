const express = require('express');
const { Pool } = require('pg');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');
const jwtGenerator = require('./utils/jwtGenerator');
const { JsonWebTokenError } = require('jsonwebtoken');
const authorization = require('./middleware/authorization');


const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});


const pool = new Pool({
  connectionString: process.env.PG_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});


const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});



app.get('/api/dashboard', authorization, async (req, res) => {
  try {
    const user = await pool.query('select name from users where id=$1', [req.user])
    res.json(user.rows[0])

  } catch (err) {
    console.error(err.message);
    res.status(500).json("server error")

  }
})

app.post('/api/userregister', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (user.rows.length !== 0) {
      return res.status(401).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, phone, bcryptPassword]
    );

    const token = jwtGenerator(newUser.rows[0].id);

    res.json({ token });

  } catch (err) {
    console.error("Error while registering user:", err.message);
    res.status(500).json({ error: "Error while registering user", details: err.message });
  }
});

app.post('/api/loginuser', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existinguser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (existinguser.rows.length === 0) {
      return res.status(401).json("Email or password is incorrect");
    }

    const validPassword = await bcrypt.compare(password, existinguser.rows[0].password);

    if (!validPassword) {
      return res.status(401).json("Password or email is incorrect");
    }

    const token = jwtGenerator(existinguser.rows[0].id);

    res.json({ token });

  } catch (err) {
    console.error(err.message);
    if (!res.headersSent) {
      res.status(500).send("Error while logging in user");
    }
  }
});

app.get('/api/is_verify', authorization, async (req, res) => {
  try {
    res.json(true);

  } catch (err) {
    console.error(err.message)
    res.status(500).send("Error while verifying user")
  }
})


app.post('/api/event', authorization, async (req, res) => {
  const { name, type, date, time, mobile, email, message } = req.body;
  const user_id = req.user;

  try {
    const newEvent = await pool.query(
      'INSERT INTO event (name, type, date, time, mobile, email, message, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, type, date, time, mobile, email, message, user_id]
    );

    res.status(201).json(newEvent.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database error while registering event");
  }
});



app.get('/api/fetch_event', authorization, async (req, res) => {
  const user_id = req.user;

  try {
    const result = await pool.query(
      `
      SELECT id, name, type,
             TO_CHAR(date, 'YYYY-MM-DD') AS date,
             TO_CHAR(time, 'HH24:MI') AS time,
             mobile, email, message
      FROM event
      WHERE user_id = $1
      ORDER BY date DESC, time
      `,
      [user_id]
    );

    res.status(200).json({ events: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error while fetching user-specific events");
  }
});



app.get('/api/savedcontact', authorization, async (req, res) => {
  try {
    const userId = req.user;

    const query = `
          SELECT * FROM event 
          WHERE user_id = $1 
          AND (date + time < NOW()::timestamp)
          ORDER BY date DESC, time DESC
      `;

    const events = await pool.query(query, [userId]);
    res.json({ events: events.rows });

  } catch (err) {
    console.error("Error while fetching completed events:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});



app.get('/api/event/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM event where id =$1', [id])
    if (result.rows.length === 0) {
      res.status(404).json({ message: "event not found" })
    }
    res.json(result.rows[0]);

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error")

  }
})

app.put('/api/event/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, date, time, mobile, email, message } = req.body;
  try {

    await pool.query('update event set name = $1,type =$2,date = $3,time =$4,mobile=$5,email =$6,message=$7 where id = $8', [name, type, date, time, mobile, email, message, id])
    res.status(200).json({ success: true, message: 'Event updated successfully' })

  } catch (err) {
    console.error(err.message);
    res.status(500).send('server error')

  }
})

app.delete('/api/event/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("delete from event where id = $1  RETURNING*", [id]);

    if (res.rowCount === 0) {
      return res.status(404).json({ error: 'event not found' })
    }

    res.json({ message: 'event deleted successfully ', deletedEvent: result.rows[0] })
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "server error" })

  }
})

app.get('/api/myprofile', authorization, async (req, res) => {
  const userId = req.user;

  try {
    const result = await pool.query('SELECT name, email, phone FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });

  } catch (err) {
    console.error("Database Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});
app.put('/api/myprofile', authorization, async (req, res) => {
  const userId = req.user;
  const { name, email, phone } = req.body;

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING name, email, phone',
      [name, email, phone, userId]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Database Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.put('/api/changepassword', authorization, async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);


    await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});





const TIMEZONE = 'Asia/Kolkata';

cron.schedule('* * * * *', async () => {
  const now = moment().tz(TIMEZONE);
  const date = now.format('YYYY-MM-DD');
  const time = now.format('HH:mm');

  console.log(`Cron job is running at ${now.format('YYYY-MM-DD HH:mm:ss')} in timezone: ${TIMEZONE}`);

  try {
    const result = await pool.query(
      `
      SELECT e.*, u.name AS sender_name, u.email AS sender_email 
      FROM event e 
      JOIN users u ON e.user_id = u.id 
      WHERE date = $1 
      AND time >= $2 AND time < $3
      `,
      [date, time + ':00', moment(time, 'HH:mm').add(1, 'minutes').format('HH:mm') + ':00']
    );

    if (result.rows.length === 0) {
      console.log('No events found for this time range.');
      return;
    }

    for (let event of result.rows) {
      const { mobile, email, message, sender_name, sender_email, type } = event;

     try {
        await twilioClient.messages.create({
          to: mobile,
          from: process.env.TWILIO_PHONE,
          body: `${message}\n\n- ${sender_name}`
        });
        console.log(`SMS sent to ${mobile}`);
      } catch (err) {
        console.error(`Error sending SMS to ${mobile}: ${err.message}`);

        // Specific handling for unverified numbers (Twilio error code 21608)
        if (err.code === 21608) {
          console.warn(`The number ${mobile} is unverified. SMS not sent.`);
        }
      }

      try {
        await transporter.sendMail({
          from: `"${sender_name}" <${process.env.EMAIL}>`,
          replyTo: sender_email,
          to: email,
          subject: `A Thoughtful Wish Just for You - ${type}`,
          html: `
            <div style="font-family: 'Segoe UI', sans-serif; background-color: #fafafa; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #FF6347; font-weight: 600;">💫 A Special Wish for You 💫</h2>
              </div>

              <div style="background-color: #ffffff; padding: 20px; border-radius: 10px;">
                <p style="font-size: 16px; color: #333;">Hey there,</p>
                <p style="font-size: 16px; color: #555; line-height: 1.6;">
                  "${message}"
                </p>

                <br />

                <p style="font-size: 16px; color: #555;">With warm wishes,</p>
                <p style="font-size: 16px; font-weight: bold; color: #333;">${sender_name}</p>
                <p style="font-size: 14px; color: #777;">
                  Reach me at <a href="mailto:${sender_email}" style="color: #FF6347;">${sender_email}</a>
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <p style="font-size: 12px; color: #999;">
                  Sent with 💖 by your thoughtful friend, ${sender_name}.
                </p>
              </div>
            </div>
          `
        });
        console.log(`Email sent to ${email}`);
      } catch (err) {
        console.error(`Error sending Email to ${email}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('Error fetching events for notification:', error.message);
  }
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});
