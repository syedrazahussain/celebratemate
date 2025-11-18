// server.js (merged, SendGrid fallback to Nodemailer)
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

let sendSimpleEmail = null;
try {
  // optional SendGrid wrapper — if present in your project it will be used
  sendSimpleEmail = require('./sendEmail').sendSimpleEmail;
} catch (err) {
  // file missing -> we'll fallback to nodemailer below
  console.log('SendGrid module not found, will fallback to SMTP if configured.');
}

const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// CORS configuration: only allow your frontend origins
const ALLOWED_ORIGINS = [
  "https://celebratemate-client.onrender.com",
  "http://localhost:3000"
];

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: origin not allowed'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
}));
// app.options('*', cors()); // handle preflight OPTIONS

const pool = new Pool({
  connectionString: process.env.PG_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Twilio client (only works if TWILIO env vars present)
let twilioClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
  try {
    twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
  } catch (err) {
    console.error('Failed to initialize Twilio client:', err.message);
  }
} else {
  console.log('Twilio not configured (TWILIO_SID or TWILIO_AUTH missing). SMS will be skipped.');
}

// Nodemailer transporter (fallback)
let transporter = null;
if (!sendSimpleEmail) {
  if (process.env.EMAIL && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    console.log('No EMAIL/EMAIL_PASS configured; nodemailer unavailable.');
  }
}

// ----------------- ROUTES -----------------

app.get('/api/dashboard', authorization, async (req, res) => {
  try {
    const user = await pool.query('SELECT name FROM users WHERE id = $1', [req.user]);
    if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(user.rows[0]);
  } catch (err) {
    console.error('GET /api/dashboard error:', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/userregister', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (user.rows.length !== 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const bcryptPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, phone, bcryptPassword]
    );

    const token = jwtGenerator(newUser.rows[0].id);

    res.status(201).json({ token });

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
      return res.status(401).json({ error: "Email or password is incorrect" });
    }

    const validPassword = await bcrypt.compare(password, existinguser.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: "Password or email is incorrect" });
    }

    const token = jwtGenerator(existinguser.rows[0].id);
    return res.json({ token });

  } catch (err) {
    console.error('POST /api/loginuser error:', err.message);
    if (!res.headersSent) {
      res.status(500).send("Error while logging in user");
    }
  }
});

app.get('/api/is_verify', authorization, async (req, res) => {
  try {
    res.json(true);
  } catch (err) {
    console.error('GET /api/is_verify error:', err.message);
    res.status(500).send("Error while verifying user");
  }
});

app.post('/api/event', authorization, async (req, res) => {
  const { name, type, date, time, mobile, email, message } = req.body;
  const user_id = req.user;

  if (!name || !date || !time) {
    return res.status(400).json({ error: 'name, date and time are required' });
  }

  try {
    const newEvent = await pool.query(
      `INSERT INTO event (name, type, date, time, mobile, email, message, user_id, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL) RETURNING *`,
      [name, type, date, time, mobile, email, message, user_id]
    );

    res.status(201).json(newEvent.rows[0]);
  } catch (err) {
    console.error('POST /api/event error:', err.message);
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
    console.error('GET /api/fetch_event error:', err.message);
    res.status(500).send("Error while fetching user-specific events");
  }
});

app.get('/api/savedcontact', authorization, async (req, res) => {
  try {
    const userId = req.user;

    const query = `
      SELECT * FROM event 
      WHERE user_id = $1 
      AND ( (date + time) < NOW()::timestamp )
      ORDER BY date DESC, time DESC
    `;

    const events = await pool.query(query, [userId]);
    res.json({ events: events.rows });

  } catch (err) {
    console.error("GET /api/savedcontact error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/api/event/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM event WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "event not found" });
    }
    res.json(result.rows[0]);

  } catch (err) {
    console.error('GET /api/event/:id error:', err.message);
    res.status(500).send("Server Error");
  }
});

app.put('/api/event/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, date, time, mobile, email, message } = req.body;
  try {
    const updateResult = await pool.query(
      `UPDATE event
       SET name = $1, type = $2, date = $3, time = $4, mobile = $5, email = $6, message = $7
       WHERE id = $8
       RETURNING *`,
      [name, type, date, time, mobile, email, message, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'event not found' });
    }

    res.status(200).json({ success: true, message: 'Event updated successfully', event: updateResult.rows[0] });

  } catch (err) {
    console.error('PUT /api/event/:id error:', err.message);
    res.status(500).send('server error');
  }
});

app.delete('/api/event/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("DELETE FROM event WHERE id = $1 RETURNING *", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'event not found' });
    }

    res.json({ message: 'event deleted successfully', deletedEvent: result.rows[0] });
  } catch (err) {
    console.error('DELETE /api/event/:id error:', err.message);
    res.status(500).json({ error: "server error" });
  }
});

app.get('/api/myprofile', authorization, async (req, res) => {
  const userId = req.user;

  try {
    const result = await pool.query('SELECT name, email, phone FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });

  } catch (err) {
    console.error("GET /api/myprofile error:", err.message);
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
    console.error("PUT /api/myprofile error:", err.message);
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
    console.error('PUT /api/changepassword error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------- CRON & NOTIFICATIONS -----------------
const TIMEZONE = 'Asia/Kolkata';

// helper to send email via SendGrid (if available) or Nodemailer
async function sendEmail({ to, from, subject, html, replyTo }) {
  if (sendSimpleEmail && process.env.SENDGRID_API_KEY) {
    try {
      // sendSimpleEmail expected to return something like { ok: true, status: 202 } or throw
      return await sendSimpleEmail({ to, from, subject, html });
    } catch (err) {
      console.error('SendGrid sendSimpleEmail failed:', err.message);
      throw err;
    }
  }

  if (!transporter) {
    const err = new Error('No email transporter available (neither SendGrid nor SMTP configured).');
    err.code = 'NO_EMAIL_TRANSPORT';
    throw err;
  }

  const mailOptions = {
    from,
    to,
    subject,
    html,
  };
  if (replyTo) mailOptions.replyTo = replyTo;

  return transporter.sendMail(mailOptions);
}

cron.schedule('* * * * *', async () => {
  const now = moment().tz(TIMEZONE);
  const date = now.format('YYYY-MM-DD');
  const time = now.format('HH:mm');

  console.log(`Cron job running at ${now.format('YYYY-MM-DD HH:mm:ss')} (${TIMEZONE})`);

  try {
    // Select events scheduled for the current minute that haven't been sent yet
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
      // nothing to send
      return;
    }

    for (let ev of result.rows) {
      const { id, mobile, email, message, sender_name, sender_email, type } = ev;
      let sentAny = false;

      // send SMS if configured & mobile exists
      if (mobile && twilioClient && process.env.TWILIO_PHONE) {
        try {
          await twilioClient.messages.create({
            to: mobile,
            from: process.env.TWILIO_PHONE,
            body: `${message}\n\n- ${sender_name}`
          });
          console.log(`SMS sent to ${mobile} for event ${id}`);
          sentAny = true;
        } catch (err) {
          console.error(`Error sending SMS to ${mobile} for event ${id}:`, err && err.message ? err.message : err);
          if (err && err.code === 21608) {
            console.warn(`Twilio: number ${mobile} is unverified.`);
          }
        }
      } else if (mobile && !twilioClient) {
        console.warn('Twilio client not configured; skipping SMS for', mobile);
      }

      // send email
      if (email) {
        const fromAddress = process.env.SENDGRID_SENDER_EMAIL || process.env.EMAIL || process.env.FROM_ADDRESS || (sender_email || process.env.EMAIL);
        const subject = `A Thoughtful Wish Just for You - ${type || 'Greetings'}`;
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

        try {
          await sendEmail({
            to: email,
            from: `"${sender_name}" <${fromAddress}>`,
            replyTo: sender_email,
            subject,
            html
          });
          console.log(`Email sent to ${email} for event ${id}`);
          sentAny = true;
        } catch (err) {
          console.error(`Error sending Email to ${email} for event ${id}:`, err && err.message ? err.message : err);
        }
      }

      // mark as sent if any channel succeeded
      if (sentAny) {
        try {
          await pool.query('UPDATE event SET sent_at = NOW() WHERE id = $1', [id]);
          console.log(`Marked event ${id} as sent.`);
        } catch (err) {
          console.error(`Failed to update sent_at for event ${id}:`, err.message);
        }
      } else {
        console.log(`No channels succeeded for event ${id}; not marking sent_at so it can retry next minute.`);
      }
    }
  } catch (error) {
    console.error('Error in cron job fetching events:', error && error.message ? error.message : error);
  }
});

app.get('/api/heartbeat', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});
