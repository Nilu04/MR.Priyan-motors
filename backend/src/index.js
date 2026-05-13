// backend/src/index.js - Complete Express API for Cloudflare Workers
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { httpServerHandler } from 'cloudflare:node';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://priyan_admin:PriyanMotor2026@cluster1.qobexsl.mongodb.net/priyan-motors?retryWrites=true&w=majority';

// ============= MIDDLEWARE =============
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============= MONGODB CONNECTION =============
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
}

// ============= SCHEMAS =============
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const bikeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  price_num: { type: Number, required: true },
  year: { type: String, required: true },
  km: { type: String, required: true },
  location: { type: String, required: true },
  brand: { type: String, required: true },
  image: { type: String },
  created_at: { type: Date, default: Date.now }
});

const soldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sold_price: { type: String, required: true },
  sold_price_num: { type: Number, required: true },
  month_year: { type: String, required: true },
  buyer: { type: String, required: true },
  image: { type: String },
  created_at: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  bikeId: { type: String, required: true },
  text: { type: String, required: true },
  user: { type: String, default: 'Guest' },
  date: { type: String, default: () => new Date().toLocaleString() },
  replies: [{
    text: String,
    user: String,
    date: String
  }]
});

const feedbackSchema = new mongoose.Schema({
  soldId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  user: { type: String, default: 'Customer' },
  date: { type: String, default: () => new Date().toLocaleString() },
  replies: [{
    text: String,
    user: String,
    date: String
  }]
});

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: String, required: true },
  updated_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Bike = mongoose.model('Bike', bikeSchema);
const Sold = mongoose.model('Sold', soldSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const Setting = mongoose.model('Setting', settingSchema);

// ============= AUTH MIDDLEWARE =============
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// ============= INITIALIZE DEFAULT DATA =============
async function initializeData() {
  await connectDB();
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await User.create({ username: 'admin', password: hashedPassword });
      console.log('✅ Admin user created');
    }
    
    const logoSetting = await Setting.findOne({ key: 'website_logo' });
    if (!logoSetting) {
      await Setting.create({ key: 'website_logo', value: 'https://placehold.co/400x400/1E3A8A/white?text=PM' });
    }
    
    const whatsappSetting = await Setting.findOne({ key: 'whatsapp_group' });
    if (!whatsappSetting) {
      await Setting.create({ key: 'whatsapp_group', value: 'https://chat.whatsapp.com/yourinvitecode' });
    }
    
    const facebookSetting = await Setting.findOne({ key: 'facebook_page' });
    if (!facebookSetting) {
      await Setting.create({ key: 'facebook_page', value: 'https://facebook.com/yourpage' });
    }
    
    const bikeCount = await Bike.countDocuments();
    if (bikeCount === 0) {
      const sampleBikes = [
        { name: "Hero Glamour", price: "Rs. 290,000", price_num: 290000, year: "2020", km: "26,200 km", location: "Batticaloa", brand: "Hero", image: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
        { name: "Apache RTR 180", price: "Rs. 350,000", price_num: 350000, year: "2014", km: "34,300 km", location: "Batticaloa", brand: "TVS", image: "https://i.ibb.co/yF2W5xJp/b2.jpg" },
        { name: "YAMAHA RAY ZR", price: "Rs. 490,000", price_num: 490000, year: "2018", km: "32,800 km", location: "Batticaloa", brand: "YAMAHA", image: "https://i.ibb.co/1tbJmkkr/b3.jpg" }
      ];
      await Bike.insertMany(sampleBikes);
    }
    
    const soldCount = await Sold.countDocuments();
    if (soldCount === 0) {
      const sampleSold = [
        { name: "Honda CB Shine", sold_price: "Rs. 375,000", sold_price_num: 375000, month_year: "Feb 2025", buyer: "Mr. Ramesh", image: "https://i.ibb.co/JRzmSsHs/b1.jpg" },
        { name: "Yamaha FZ V3", sold_price: "Rs. 485,000", sold_price_num: 485000, month_year: "Mar 2025", buyer: "Mrs. Santhiya", image: "https://i.ibb.co/yF2W5xJp/b2.jpg" }
      ];
      await Sold.insertMany(sampleSold);
    }
  } catch (err) {
    console.error('Init error:', err);
  }
}

// ============= AUTH ROUTES =============
app.post('/api/login', async (req, res) => {
  await connectDB();
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  await connectDB();
  const { currentPassword, newPassword } = req.body;
  
  try {
    const user = await User.findById(req.user._id);
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    await User.findByIdAndUpdate(req.user._id, { password: hashedNewPassword });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.post('/api/change-username', authenticateToken, async (req, res) => {
  await connectDB();
  const { newUsername } = req.body;
  
  try {
    await User.findByIdAndUpdate(req.user._id, { username: newUsername });
    const newToken = jwt.sign({ id: req.user._id, username: newUsername }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Username changed successfully', token: newToken, username: newUsername });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  await connectDB();
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});

app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: { id: req.user._id, username: req.user.username } });
});

// ============= BIKE ROUTES =============
app.get('/api/bikes', async (req, res) => {
  await connectDB();
  const bikes = await Bike.find().sort({ created_at: -1 });
  res.json(bikes);
});

app.post('/api/bikes', authenticateToken, async (req, res) => {
  await connectDB();
  try {
    const { name, price, price_num, year, km, location, brand, image_url } = req.body;
    
    const bikeData = {
      name, price, price_num: parseInt(price_num), year, km, location, brand,
      image: image_url || null
    };
    
    const bike = await Bike.create(bikeData);
    res.json({ id: bike._id, message: 'Bike added successfully', bike });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bikes/:id', authenticateToken, async (req, res) => {
  await connectDB();
  try {
    const { id } = req.params;
    const { name, price, price_num, year, km, location, brand, image_url } = req.body;
    
    const updateData = {
      name, price, price_num: parseInt(price_num), year, km, location, brand,
      image: image_url
    };
    
    const updatedBike = await Bike.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ message: 'Bike updated successfully', bike: updatedBike });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bikes/:id', authenticateToken, async (req, res) => {
  await connectDB();
  try {
    const { id } = req.params;
    await Bike.findByIdAndDelete(id);
    res.json({ message: 'Bike deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= SOLD ROUTES =============
app.get('/api/sold', async (req, res) => {
  await connectDB();
  const sold = await Sold.find().sort({ created_at: -1 });
  res.json(sold);
});

app.post('/api/sold', authenticateToken, async (req, res) => {
  await connectDB();
  try {
    const { name, sold_price, sold_price_num, month_year, buyer, image_url } = req.body;
    
    const soldData = {
      name, sold_price, sold_price_num: parseInt(sold_price_num), month_year, buyer,
      image: image_url || null
    };
    
    const sold = await Sold.create(soldData);
    res.json({ id: sold._id, message: 'Sold entry added successfully', sold });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sold/:id', authenticateToken, async (req, res) => {
  await connectDB();
  try {
    const { id } = req.params;
    const { name, sold_price, sold_price_num, month_year, buyer, image_url } = req.body;
    
    const updateData = {
      name, sold_price, sold_price_num: parseInt(sold_price_num), month_year, buyer,
      image: image_url
    };
    
    const updatedSold = await Sold.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ message: 'Sold entry updated successfully', sold: updatedSold });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sold/:id', authenticateToken, async (req, res) => {
  await connectDB();
  try {
    const { id } = req.params;
    await Sold.findByIdAndDelete(id);
    res.json({ message: 'Sold entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= COMMENTS ROUTES =============
app.get('/api/comments/:bikeId', async (req, res) => {
  await connectDB();
  try {
    const comments = await Comment.find({ bikeId: req.params.bikeId }).sort({ _id: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/comments', async (req, res) => {
  await connectDB();
  try {
    const { bikeId, text, user } = req.body;
    const comment = await Comment.create({ bikeId, text, user: user || 'Guest' });
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/comments/:commentId/reply', async (req, res) => {
  await connectDB();
  try {
    const { commentId } = req.params;
    const { text, user } = req.body;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    comment.replies.push({ text, user: user || 'Admin', date: new Date().toLocaleString() });
    await comment.save();
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
  await connectDB();
  try {
    await Comment.findByIdAndDelete(req.params.commentId);
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= FEEDBACK ROUTES =============
app.get('/api/feedbacks/:soldId', async (req, res) => {
  await connectDB();
  try {
    const feedbacks = await Feedback.find({ soldId: req.params.soldId }).sort({ _id: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedbacks', async (req, res) => {
  await connectDB();
  try {
    const { soldId, rating, comment, user } = req.body;
    const feedback = await Feedback.create({ soldId, rating, comment, user: user || 'Customer' });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/feedbacks/:feedbackId/reply', async (req, res) => {
  await connectDB();
  try {
    const { feedbackId } = req.params;
    const { text, user } = req.body;
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    feedback.replies.push({ text, user: user || 'Admin', date: new Date().toLocaleString() });
    await feedback.save();
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/feedbacks/:feedbackId', authenticateToken, async (req, res) => {
  await connectDB();
  try {
    await Feedback.findByIdAndDelete(req.params.feedbackId);
    res.json({ message: 'Feedback deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= SETTINGS ROUTES =============
app.get('/api/settings/:key', async (req, res) => {
  await connectDB();
  const setting = await Setting.findOne({ key: req.params.key });
  res.json({ value: setting ? setting.value : null });
});

app.post('/api/settings/logo', authenticateToken, async (req, res) => {
  await connectDB();
  const { logoUrl } = req.body;
  
  await Setting.findOneAndUpdate(
    { key: 'website_logo' },
    { key: 'website_logo', value: logoUrl, updated_at: new Date() },
    { upsert: true }
  );
  res.json({ logoUrl });
});

app.post('/api/settings/social', authenticateToken, async (req, res) => {
  await connectDB();
  const { whatsapp_group, facebook_page } = req.body;
  
  if (whatsapp_group) {
    await Setting.findOneAndUpdate(
      { key: 'whatsapp_group' },
      { key: 'whatsapp_group', value: whatsapp_group },
      { upsert: true }
    );
  }
  if (facebook_page) {
    await Setting.findOneAndUpdate(
      { key: 'facebook_page' },
      { key: 'facebook_page', value: facebook_page },
      { upsert: true }
    );
  }
  res.json({ message: 'Social links updated' });
});

app.get('/api/settings/social', async (req, res) => {
  await connectDB();
  const whatsapp = await Setting.findOne({ key: 'whatsapp_group' });
  const facebook = await Setting.findOne({ key: 'facebook_page' });
  res.json({ 
    whatsapp_group: whatsapp ? whatsapp.value : 'https://chat.whatsapp.com/yourinvitecode',
    facebook_page: facebook ? facebook.value : 'https://facebook.com/yourpage'
  });
});

app.get('/api/settings/logo', async (req, res) => {
  await connectDB();
  const setting = await Setting.findOne({ key: 'website_logo' });
  res.json({ logoUrl: setting ? setting.value : 'https://placehold.co/400x400/1E3A8A/white?text=PM' });
});

// ============= INITIALIZE AND START =============
initializeData().then(() => {
  console.log('🚀 Data initialized');
});

// ============= CLOUDFLARE WORKERS HANDLER =============
app.listen(3000);
export default httpServerHandler({ port: 3000 });
