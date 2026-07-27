const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Static files (Jaise index.html) ko serve karne ke liye
app.use(express.static(__dirname));

// Database Connection
mongoose.connect('mongodb+srv://princekumarganga00_db_user:Prince_2008@cluster0.czgcm2j.mongodb.net/?appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Readymade PPT Database Connected Successfully!'))
  .catch(err => console.log('Database Connection Error: ', err));

const UserSchema = new mongoose.Schema({
  name: String,
  mobile: { type: String, unique: true },
  email: String,
  district: String,
  state: String,
  deviceId: String,
  planName: { type: String, default: '7 Days Free Trial' },
  planExpiry: Date,
  dailyHoursLimit: Number
});
const User = mongoose.model('User', UserSchema);

app.post('/api/user/login', async (req, res) => {
  const { name, mobile, email, district, state, deviceId } = req.body;
  try {
    let user = await User.findOne({ mobile });

    if (!user) {
      let expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      user = new User({
        name, mobile, email, district, state, deviceId,
        planName: '7 Days Free Trial',
        planExpiry: expiry,
        dailyHoursLimit: 24
      });
      await user.save();
    } else {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Readymade PPT Server running on port ${PORT}`));