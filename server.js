const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(__dirname));

// Database Connection
mongoose.connect('mongodb+srv://princekumarganga00_db_user:Prince_2008@cluster0.czgcm2j.mongodb.net/?appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Readymade PPT Database Connected Successfully!'))
  .catch(err => console.log('Database Connection Error: ', err));

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  mobile: { type: String, unique: true },
  email: String,
  district: String,
  state: String,
  deviceId: { type: String, unique: true },
  planName: { type: String, default: '60 Days Free Trial' },
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

// Secure Login API with Device Lock
app.post('/api/user/login', async (req, res) => {
  const { name, mobile, email, district, state, deviceId } = req.body;
  try {
    if (!mobile || !deviceId) {
      return res.status(400).json({ success: false, message: "Mobile number and Device ID are required!" });
    }

    let existingDeviceUser = await User.findOne({ deviceId });
    if (existingDeviceUser && existingDeviceUser.mobile !== mobile) {
      return res.status(403).json({ 
        success: false, 
        message: "सुरक्षा प्रतिबंध: इस डिवाइस पर पहले ही दूसरा नंबर रजिस्टर किया जा चुका है! आप एक ही डिवाइस पर बार-बार नंबर बदलकर नया ट्रायल नहीं ले सकते।" 
      });
    }

    let user = await User.findOne({ mobile });

    if (!user) {
      let expiry = new Date();
      expiry.setDate(expiry.getDate() + 60);

      user = new User({
        name, mobile, email, district, state, deviceId,
        planName: '60 Days Free Trial',
        planExpiry: expiry
      });
      await user.save();
    } else {
      if (user.deviceId && user.deviceId !== deviceId) {
        return res.status(403).json({ 
          success: false, 
          message: "सुरक्षा कारणवश यह मोबाइल नंबर किसी अन्य डिवाइस पर रजिस्टर्ड है! एक नंबर से दूसरा डिवाइस नहीं चल सकता।" 
        });
      }
    }

    if (new Date() > new Date(user.planExpiry)) {
      return res.status(403).json({ 
        success: false, 
        expired: true,
        message: "आपका प्लान/ट्रायल समाप्त हो चुका है! आगे उपयोग करने के लिए कृपया सब्सक्रिप्शन प्लान खरीदें।" 
      });
    }

    res.json({ success: true, message: "Login Successful", user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Settings
app.get('/api/settings', async (req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'app_settings' });
    if (!setting) {
      setting = new Setting({
        key: 'app_settings',
        qrCodeUrl: '/qr.jpg',
        promoBannerUrl: '',
        plans: [
          { name: '1 Month Plan', price: '₹199', days: 30 },
          { name: '1 Year Plan', price: '₹999', days: 365 }
        ]
      });
      await setting.save();
    }
    res.json({ success: true, setting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Settings (Admin)
app.post('/api/admin/settings', async (req, res) => {
  const { qrCodeUrl, promoBannerUrl, plans } = req.body;
  try {
    let setting = await Setting.findOneAndUpdate(
      { key: 'app_settings' },
      { qrCodeUrl, promoBannerUrl, plans },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: "Settings updated successfully", setting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all users for Admin
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().sort({ _id: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete user by Admin
app.delete('/api/admin/user/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Readymade PPT Server running on port ${PORT}`));