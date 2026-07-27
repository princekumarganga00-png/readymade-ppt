const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(__dirname));

// Database Connection
mongoose.connect('mongodb+srv://princekumarganga00_db_user:XLrP1mDvRl8wx2iZ@cluster0.czgcm2j.mongodb.net/?appName=Cluster0')
.then(() => console.log('Readymade PPT Database Connected Successfully!'))
  .catch(err => console.log('Database Connection Error: ', err));

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  mobile: { type: String, unique: true },
  password: { type: String, required: true },
  email: String,
  district: String,
  state: String,
  deviceId: { type: String, unique: true },
  planName: { type: String, default: '7 Days Free Trial' },
  planExpiry: Date
});
const User = mongoose.model('User', UserSchema);

// Settings Schema
const SettingSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  qrCodeUrl: String,
  promoBannerUrl: String,
  plans: Array
});
const Setting = mongoose.model('Setting', SettingSchema);

// 1. Register API (7 Days Trial)
app.post('/api/user/register', async (req, res) => {
  const { name, mobile, password, email, district, state, deviceId } = req.body;
  try {
    if (!mobile || !password || !deviceId) {
      return res.status(400).json({ success: false, message: "मोबाइल नंबर और पासवर्ड आवश्यक हैं!" });
    }

    let existingDeviceUser = await User.findOne({ deviceId });
    if (existingDeviceUser) {
      return res.status(403).json({ success: false, message: "इस डिवाइस पर पहले ही खाता बनाया जा चुका है!" });
    }

    let existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "यह मोबाइल नंबर पहले से रजिस्टर्ड है! लॉगिन करें।" });
    }

    let expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // Exactly 7 Days

    let user = new User({
      name, mobile, password, email, district, state, deviceId,
      planName: '7 Days Free Trial',
      planExpiry: expiry
    });
    await user.save();

    res.json({ success: true, message: "Registration Successful", user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Login API (With Expiry Validation)
app.post('/api/user/login', async (req, res) => {
  const { mobile, password, deviceId } = req.body;
  try {
    let user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "मोबाइल नंबर रजिस्टर्ड नहीं है!" });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: "गलत पासवर्ड!" });
    }

    if (user.deviceId && user.deviceId !== deviceId) {
      return res.status(403).json({ success: false, message: "यह खाता किसी अन्य डिवाइस पर रजिस्टर्ड है!" });
    }

    if (new Date() > new Date(user.planExpiry)) {
      return res.status(403).json({ success: false, message: "आपका 7 दिन का ट्रायल समाप्त हो चुका है! कृपया प्लान खरीदें।" });
    }

    res.json({ success: true, message: "Login Successful", user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Check Status API (For auto session check)
app.get('/api/user/check-status', async (req, res) => {
  const { mobile } = req.query;
  try {
    let user = await User.findOne({ mobile });
    if (!user || new Date() > new Date(user.planExpiry)) {
      return res.status(403).json({ success: false, message: "ट्रायल समाप्त हो चुका है!" });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Reset Password API
app.post('/api/user/reset-password', async (req, res) => {
  const { mobile, newPassword } = req.body;
  try {
    let user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "मोबाइल नंबर नहीं मिला!" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Settings APIs
app.get('/api/settings', async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'app_settings' });
    if (!setting) {
      setting = new Setting({
        key: 'app_settings',
        qrCodeUrl: '/qr.jpg',
        plans: [{ name: '1 Month Plan', price: '₹199', days: 30 }]
      });
      await setting.save();
    }
    res.json({ success: true, setting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/settings', async (req, res) => {
  const { qrCodeUrl, promoBannerUrl, plans } = req.body;
  try {
    let setting = await Setting.findOneAndUpdate(
      { key: 'app_settings' },
      { qrCodeUrl, promoBannerUrl, plans },
      { upsert: true, new: true }
    );
    res.json({ success: true, setting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().sort({ _id: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/user/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));