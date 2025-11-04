// server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config(); // load .env file
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));




// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// =============================
//  MODELS
// =============================

const lessonSchema = new mongoose.Schema({
  title: String,
  type: { type: String }, // video, pdf, quiz, etc.
  contentUrl: String,
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  lessons: [lessonSchema],
});



const Course = mongoose.model("Course", courseSchema);

// =============================
//  ROUTES
// =============================

// Default test route
app.get("/api", (req, res) => {
  res.send("API is working!");
});

// Add a course
app.post("/api/courses", async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all courses
app.get("/api/courses", async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
});

// Get a specific course by ID
app.get("/api/courses/:id", async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json(course);
});

// =============================
//  START SERVER
// =============================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


const studentProgressSchema = new mongoose.Schema({
  studentId: String,         // later can link with a real user login
  courseId: String,
  completedLessons: [String],
  quizResults: [
    {
      quizId: String,
      score: Number,
      total: Number
    }
  ],
  completionPercentage: Number
});

const StudentProgress = mongoose.model('StudentProgress', studentProgressSchema);


// ===== Progress Schema =====
// const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  studentId: String,
  courseId: String,
  completedLessons: [String],
  quizResults: Array,
  completionPercentage: Number
});

const Progress = mongoose.model('Progress', progressSchema);


// ===== API to Save/Update Progress =====
app.post('/api/progress', async (req, res) => {
  try {
    const { studentId, courseId, completedLessons, quizResults, completionPercentage } = req.body;
    const progress = await Progress.findOneAndUpdate(
      { studentId, courseId },
      { completedLessons, quizResults, completionPercentage },
      { upsert: true, new: true }
    );
    res.status(200).json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== API to Get Student Progress for All Courses =====
app.get('/api/progress/:studentId', async (req, res) => {
  try {
    const progress = await Progress.find({ studentId: req.params.studentId });
    res.status(200).json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/progress/:studentId/:courseId', async (req, res) => {
  const { studentId, courseId } = req.params;
  try {
    const progress = await Progress.findOne({ studentId, courseId });
    if (!progress) {
      return res.json({ completedLessons: [], completionPercentage: 0, quizResults: [] });
    }
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Student schema
const studentSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
});

const Student = mongoose.model('Student', studentSchema);


// 🟢 Student Registration
app.post('/api/students/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    const existing = await Student.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already exists' });

    const newStudent = new Student({ username, password });
    await newStudent.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔵 Student Login
app.post('/api/students/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const student = await Student.findOne({ username });

    if (!student || student.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.json({
      message: 'Login successful',
      studentId: student._id,
      username: student.username
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟣 Enroll in a course
app.post('/api/enroll', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Already enrolled?
    if (student.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    student.enrolledCourses.push(courseId);
    await student.save();

    res.json({ message: 'Course enrolled successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 Get enrolled courses
app.get('/api/students/:studentId/enrolled', async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId).populate('enrolledCourses');
  res.json(student?.enrolledCourses || []);
});








