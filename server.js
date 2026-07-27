const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Database Connection (Yahan apna connection string dalein)
mongoose.connect('mongodb+srv://your_mongo_connection_string', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Readymade PPT Database Connected Successfully!'));

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  mobile: { type: String, unique: true },
  email: String,
  district: String,
  state: String,
  deviceId: String, // Ek mobile lock karne ke liye
  planName: { type: String, default: '7 Days Free Trial' },
  planExpiry: Date,
  dailyHoursLimit: Number
});
const User = mongoose.model('User', UserSchema);

// Admin / App Settings Schema (QR Code & Promo ke liye)
const SettingSchema = new mongoose.Schema({
  qrCodeUrl: String,
  promoText: String
});
const Setting = mongoose.model('Setting', SettingSchema);

// 1. User Registration & Login API (With One Device Restriction)
app.post('/api/user/login', async (req, res) => {
  const { name, mobile, email, district, state, deviceId } = req.body;
  try {
    let user = await User.findOne({ mobile });

    if (!user) {
      let expiry = new Date();
      expiry.setDate(expiry.getDate() + 7); // Default 7 Days Free

      user = new User({
        name, mobile, email, district, state, deviceId,
        planName: '7 Days Free Trial',
        planExpiry: expiry,
        dailyHoursLimit: 24
      });
      await user.save();
    } else {
      // Security Check: Ek mobile number se doosra device login na ho
      if (user.deviceId && user.deviceId !== deviceId) {
        return res.status(403).json({ 
          success: false, 
          message: "सुरक्षा कारणवश यह मोबाइल नंबर किसी अन्य डिवाइस पर एक्टिव है! एक नंबर से दूसरा डिवाइस नहीं चल सकता।" 
        });
      }
    }
    res.json({ success: true, message: "Login Successful", user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Admin Data Fetch API
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const users = await User.find({});
    let settings = await Setting.findOne({});
    if(!settings) {
      settings = await Setting.create({ qrCodeUrl: "default_qr.png", promoText: "रेडीमेड PPT ऐप में आपका स्वागत है!" });
    }
    res.json({ success: true, users, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Readymade PPT Server running on port ${PORT}`));