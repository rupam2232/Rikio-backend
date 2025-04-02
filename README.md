# Rikio - Backend

<p align="center">
<img src="https://rikio.vercel.app/logo.svg" alt="Rikio" width="100"/>
</p>

## 🚀 About Rikio Backend
The Rikio Backend serves as the core API and data processing unit for the [Rikio platform](https://rikio.vercel.app/), handling user authentication, video management, and other essential functionalities. Built with **Node.js**, **Express**, and **MongoDB**, it ensures robust performance and scalability.

### 🌐 Live Demo: [rikio.vercel.app](https://rikio.vercel.app/)

---

## 📌 Features
- 🔑 **User Authentication**: Secure sign-up and sign-in mechanisms with JWT-based authentication.
- 🎥 **Video Management**: APIs to upload, retrieve, update, and delete video content.
- 🔍 **Search Functionality**: Efficient search endpoints to find videos based on various criteria.
- 💬 **Commenting System**: Comment on videos and tweets.
- 📊 **Analytics**: Track channel analytics.

---

## 🛠️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JSON Web Tokens (JWT)
- **Password Hashing**: Bcrypt
- **Security & Cookies**: Cookie-parser
- **CORS Handling**: Cors
- **File Uploads**: Multer & Cloudinary
- **Email Service**: Nodemailer
---

## 📦 Installation & Setup

### Clone the Repository
```bash
git clone https://github.com/rupam2232/Rikio-backend.git
cd Rikio-backend
```

### Install Dependencies
```bash
npm install
```

### Environment Variables
Create a `.env` file in the root directory and add the following variables:
```env
PORT=your-port

DB_NAME=your-db-name

MONGODB_URI=your-mongodb-uri

ACCESS_TOKEN_SECRET=your-access-token-secret

ACCESS_TOKEN_EXPIRY=your-access-token-expiry(e.g.,3d)

REFRESH_TOKEN_SECRET=your-refresh-token-secret

REFRESH_TOKEN_EXPIRY=your-refresh-token-expiry(e.g.,10d)

CLOUDINARY_CLOUD_NAME=your-cloudinary-name

CLOUDINARY_API_KEY=your-cloudinary-api-key

CLOUDINARY_API_SECRET=your-cloudinary-api-secret

CLOUDINARY_URL=your-cloudinary-url

EMAIL=your-email-address

EMAIL_PASSWORD=your-email-password

EMAIL_SERVICE=your-email-service-provider

NODE_ENV=development-or-production
```

### Run the Development Server
```bash
npm run dev
```
The app will be available at **[http://localhost:PORT](http://localhost:PORT)**.

---

## 📄 Folder Structure
```
Rikio-backend/
│── src/
│   ├── controllers/    # Route handlers
│   ├── models/         # Mongoose schemas
│   ├── routes/         # Express routes
│   ├── middlewares/    # Custom middleware functions
│   ├── utils/          # Utility functions
│   ├── config/         # Configuration files
│   ├── db/             # Connects to the mongodb server
│   ├── app.js          # setups cors and important middlewares
│   ├── index.js        # Entry point
│── package.json        # Project dependencies
```

---

## 🔗 API Endpoints
Here are some endpoints.

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/users/register` | Register a new user |
| `POST` | `/users/login` | Authenticate user |
| `GET`  | `/videos` | Fetch all videos |
| `GET`  | `/videos/:id` | Fetch a specific video |

---

## 🛠️ Contributing
We welcome contributions to improve Rikio Backend! 🚀
1. **Fork** the repository.
2. **Create** a new branch: `git checkout -b feature-name`.
3. **Commit** your changes: `git commit -m 'Add new feature'`.
4. **Push** to the branch: `git push origin feature-name`.
5. Submit a **Pull Request**.

---

## 📜 License
This project is licensed under the **MIT License**.

---

## 📞 Contact
For questions, issues, or collaborations, reach out to:  
**Twitter**: [rupam2232](https://x.com/rupam2232)  
**GitHub**: [rupam2232](https://github.com/rupam2232)  
**Linkedin**: [rupam2232](https://www.linkedin.com/in/rupam2232/)
