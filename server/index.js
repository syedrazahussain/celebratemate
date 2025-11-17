// server.js (updated to use SendGrid)
const express = require('express');
const { Pool } = require('pg');
const cron = require('node-cron');
const twilio = require('twilio');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');
const jwtGenerator = require('./utils/jwtGenerator');
const authorization = require('./middleware/authorization');

const { sendSimpleEmail } = require('./sendEmail'); // new SendGrid module

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(cors({
  origin: [
    "https://celebratemate-client.onrender.com",
    "http://localhost:3000"
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
}));

app.options('*', cors()); // 👈 handles preflight OPTIONS

const pool = new Pool({
  connectionString: process.env.PG_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

/* ----------------- ROUTES (unchanged except minor improvements) ----------------- */

app.get('/api/dashboard', authorization, async (req, res) => {
  try {
    const user = await pool.query('select name from users where id=$1', [req.user]);
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json("server error");
  }
});

// register, login, is_verify, event CRUD, profile, etc.
// (I keep your original route implementations as-is; include them here — truncated for brevity in this snippet)

// ... keep all your existing route handlers here unchanged ...
// For brevity, paste your original route handlers (userregister, loginuser, is_verify, event routes, fetch_event, etc.)
// (In your actual server.js file keep everything you already had, only change the cron email part below)

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

// (Include the rest of your routes exactly as before: loginuser, is_verify, event CRUD, myprofile, changepassword, etc.)
// For brevity I'm not repeating all here — make sure your server file retains your original route handlers.

// ----------------- CRON & NOTIFICATIONS (REPLACED EMAIL LOGIC) -----------------

const TIMEZONE = 'Asia/Kolkata';

cron.schedule('* * * * *', async () => {
  const now = moment().tz(TIMEZONE);
  const date = now.format('YYYY-MM-DD');
  const time = now.format('HH:mm');

  console.log(`Cron job is running at ${now.format('YYYY-MM-DD HH:mm:ss')} in timezone: ${TIMEZONE}`);

  try {
    // Select events that match the current minute and have not been sent yet (sent_at is null)
    const result = await pool.query(
      `
      SELECT e.*, u.name AS sender_name, u.email AS sender_email 
      FROM event e 
      JOIN users u ON e.user_id = u.id 
      WHERE date = $1 
      AND time >= $2 AND time < $3
      AND (e.sent_at IS NULL)
      `,
      [date, time + ':00', moment(time, 'HH:mm').add(1, 'minutes').format('HH:mm') + ':00']
    );

    if (result.rows.length === 0) {
      console.log('No events found for this time range.');
      return;
    }

    for (let event of result.rows) {
      const { id, mobile, email, message, sender_name, sender_email, type } = event;

      // 1) Send SMS (Twilio) - unchanged
      try {
        if (mobile) {
          await twilioClient.messages.create({
            to: mobile,
            from: process.env.TWILIO_PHONE,
            body: `${message}\n\n- ${sender_name}`
          });
          console.log(`SMS sent to ${mobile}`);
        }
      } catch (err) {
        console.error(`Error sending SMS to ${mobile}: ${err.message}`);
        if (err.code === 21608) {
          console.warn(`The number ${mobile} is unverified. SMS not sent.`);
        }
      }

      // 2) Send Email (SendGrid)
      try {
        console.log("Sending email via SendGrid:", process.env.SENDGRID_SENDER_EMAIL, "->", email);

        const html = `
          <div style="font-family: 'Segoe UI', sans-serif; background-color: #fafafa; padding: 30px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #FF6347; font-weight: 600;">💫 A Special Wish for You 💫</h2>
            </div>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 10px;">
              <p style="font-size: 16px; color: #333;">Hey there,</p>
              <p style="font-size: 16px; color: #555; line-height: 1.6;">${message}</p>
              <br />
              <p style="font-size: 16px; color: #555;">With warm wishes,</p>
              <p style="font-size: 16px; font-weight: bold; color: #333;">${sender_name}</p>
              <p style="font-size: 14px; color: #777;">Reach me at <a href="mailto:${sender_email}" style="color: #FF6347;">${sender_email}</a></p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <p style="font-size: 12px; color: #999;">Sent with 💖 by your thoughtful friend, ${sender_name}.</p>
            </div>
          </div>
        `;

        const sendResult = await sendSimpleEmail({
          to: email,
          from: `"${sender_name}" <${process.env.SENDGRID_SENDER_EMAIL}>`,
          subject: `A Thoughtful Wish Just for You - ${type || 'Greetings'}`,
          html
        });

        if (sendResult && sendResult.ok) {
          console.log(`Email sent to ${email} (status ${sendResult.status})`);
        } else {
          console.error(`SendGrid failed for ${email}:`, sendResult.error || sendResult);
          // decide whether to mark as sent or not - here we do NOT mark as sent if email failed
          continue; // skip marking as sent_at
        }
      } catch (err) {
        console.error(`Error sending Email to ${email}:`, err);
        continue; // skip marking as sent
      }

      // 3) Mark event as sent (sent_at) once at least one channel succeeded
      try {
        await pool.query('UPDATE event SET sent_at = NOW() WHERE id = $1', [id]);
        console.log(`Marked event ${id} as sent.`);
      } catch (err) {
        console.error(`Failed to update sent_at for event ${id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error fetching events for notification:', error.message);
  }
});

app.get('/api/heartbeat', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});
