// first make this in terminal
// npm init -y why -y ? // because it will create a package.json file with default values
// then npm i express mongoose dotenv 
// then create a .env file and add your environment variables
// then create a app.js file and add your code



import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not defined.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('🔌 Successfully connected to MongoDB.');
})
.catch(err => {
  console.error('❌ Initial MongoDB connection error:', err);
  process.exit(1);
});

// 👇 Event Listeners for Mongoose connection
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose disconnected from DB');
});

app.use(express.json());



/* 
### 

- Create a **User** model with these fields:
    - `name` (text)
    - `email` (text)
    - Make sure `email` has a **unique index** to make searches fast.
- Create a **Post** model with these fields:
    - `title` (text)
    - `content` (text)
    - `author` — this should be a **reference** to a User (store the User’s ID
*/

// 📘 User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // The 'unique: true' index ensures fast searches and prevents duplicate emails
  email: { type: String, required: true, unique: true }
});

const User = mongoose.model('User', userSchema);

// 📘 Post Schema

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});


// 🧠 Instance Method
postSchema.methods.getPostInfo = function() {
  return `Post Title: ${this.title}, Author: ${this.author}`;
};



 // 🔍 Static Method
postSchema.statics.findByAuthor = function(authorId) {
  return this.find({ author: authorId });
};













//  🔄 Middleware
postSchema.pre('save', function(next) {
  console.log(`Saving post: ${this.title}`);
  next();
});


postSchema.post('save', function(doc) {
  console.log(`Saved post: ${doc.title}`);
});

const Post = mongoose.model('Post', postSchema);






// # Lab Assignment

// ## Requirements

// You will build a simple backend app with **Users** and **Posts** collections. You must do all these tasks:

// ### 1. Create Models (Schemas)

// - Create a **User** model with these fields:
//     - `name` (text)
//     - `email` (text)
//     - Make sure `email` has a **unique index** to make searches fast.
// - Create a **Post** model with these fields:
//     - `title` (text)
//     - `content` (text)
//     - `author` — this should be a **reference** to a User (store the User’s ID).

// ### 2. Create Express Routes

// - **POST `/users`** — Add a new user
//     - Input: JSON with `name` and `email`
//     - Save the user to the database and return the saved user.
// - **POST `/posts`** — Add a new post
//     - Input: JSON with `title`, `content`, and `author` (User ID)
//     - Save the post and return it.
// - GET `/posts` — Get All Posts with Author Name (with Optional `.lean()`)
//     - This route returns all posts with the author's name.
//     - Use `.populate()` on the `author` field to get only the author's `name`.
//     - If the user adds `?lean=true` in the URL, then also use `.lean()` to return simple JavaScript objects (not Mongoose documents).
    
//     📌 Examples:
    
//     - `GET /posts` → returns full Mongoose documents (with populated author name)
//     - `GET /posts?lean=true` → returns plain JavaScript objects with populated author name
// - **GET `/posts/export`** — Export all posts to a text file
//     - Use a **cursor** to get posts one by one
//     - For each post, write this line to `posts.txt`:
        
//         `"Title: [title], Author: [author name]"`
        
//     - When done, send a message "Export finished, file saved as posts.txt".

// ### 3. Make Sure to:

// - Handle errors properly (send error messages if something goes wrong)
// - Use the proper MongoDB indexes as explained
// - Test each route works correctly before moving to the next










// get all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create a new user
app.post('/users', async (req, res) => {
  try {
    // Use the User model defined at the top, do not redefine it here
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// get all posts (with optional lean)
app.get('/posts', async (req, res) => {
  try {
    const lean = req.query.lean === 'true';
    let query = Post.find().populate('author', 'name');
    if (lean) query = query.lean();
    const posts = await query;
    res.json(posts);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// get a post by id
app.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name');
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }
    res.json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// create a new post
app.post('/posts', async (req, res) => {
  try {
    const post = new Post(req.body);  
    const savedPost = await post.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(400).json({ error: err.message });  
  }  
});
// - **GET `/posts/export`** — Export all posts to a text file
app.get('/posts/export', async (req, res) => {
  const fs = require('fs');
  const filePath = 'posts.txt';
  
  try {
    const cursor = Post.find().populate('author', 'name').cursor();
    const writeStream = fs.createWriteStream(filePath);
    
    for await (const post of cursor) {
      const line = `Title: ${post.title}, Author: ${post.author.name}\n`;
      writeStream.write(line);
    }
    
    writeStream.end();
    writeStream.on('finish', () => {
      res.send(`Export finished, file saved as ${filePath}`);
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
