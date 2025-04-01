# Rikio - Backend

<p align="center">
<img src="https://rikio.vercel.app/logo.svg" alt="Rikio" width="100"/>
</p>

## 🚀 About Rikio
Rikio is a modern and feature-rich platform designed to provide users with seamless video streaming and content management. The frontend of Rikio is built with **React, Vite, Tailwind CSS, and ShadCN**, ensuring a fast, scalable, and responsive user experience.

### 🌐 Live Demo: [rikio.vercel.app](https://rikio.vercel.app/)

---

## 📌 Features
- 🎥 **Video Streaming**: Watch high-quality videos with a smooth playback experience.
- 🔍 **Search Functionality**: Find videos easily with an intuitive search bar.
- 🔄 **Authentication**: Sign up & sign in with email/password.
- 🌎 **Responsive Design**: Optimized for mobile, tablet, and desktop users.
- 🌙 **Dark Mode**: Enjoy an eye-friendly dark mode experience.
- ⚡ **Optimized Performance**: Leveraging Vite for fast builds and Tailwind CSS for efficient styling.
- 🔐 **Secure API Integration**: Works seamlessly with the [Rikio backend](https://github.com/rupam2232/Rikio-backend) for secure data handling.

---

## 🛠️ Tech Stack
  - **Frontend**\*: React (with Vite) ⚡\*
  - **Styling**\*: Tailwind CSS + ShadCN ✨\*
  - **State Management**\*: React Redux\*
  - **Routing**\*: React Router DOM\*
  - **Toast Notifications**\*: React Hot Toast\*
  - **Icons**\*: Lucide React\*
  - **Video Player**\*: Video.js\*
  - **File Upload**\*: React Dropzone\*
  - **HTTP Requests**\*: Axios\*
  - **Authentication**\*: Standard email/password authentication\*
  - **Backend API**\*: Integrated with [Rikio backend](https://github.com/rupam2232/Rikio-backend) (MERN Stack)\*
  - **Hosting**\*: Deployed on ****[Vercel](https://rikio.vercel.app/)**** 🌍\*

---

## 📦 Installation & Setup

### Clone the Repository
```bash
git clone https://github.com/rupam2232/Rikio-frontend.git
cd Rikio-frontend
```

### Install Dependencies
```bash
npm install
```

### Environment Variables
Create a `.env` file in the root directory and add the following variables:
```env
VITE_BACKEND_URI=your-backend-url
VITE_APP_NAME = "Rikio"
```

### Run the Development Server
```bash
npm run dev
```
The app will be available at **[http://localhost:5173](http://localhost:5173)**.

---

## 📄 Folder Structure
```
Rikio-frontend/
│── src/
│   ├── components/    # Reusable UI components
│   ├── pages/         # Application pages (Home, Login, Dashboard, etc.)
│   ├── hooks/         # Custom React hooks
│   ├── store/       # Global state management
│   ├── utils/         # Helper functions
│   ├── conf/         # Object of .env variables
│   ├── assets/        # Static assets like images & icons
│── public/            # Static files (favicon)
│── package.json       # Project dependencies
│── vite.config.js     # Vite configuration
```

---

## 🔗 API Endpoints
The frontend interacts with the [Rikio backend](https://github.com/rupam2232/Rikio-backend) API. Ensure that the backend is running and update the `VITE_BACKEND_URI` in your `.env` file accordingly.

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/users/register` | Register a new user |
| `POST` | `/users/login` | Authenticate user |
| `GET`  | `/videos` | Fetch all videos |
| `GET`  | `/videos/:id` | Fetch a specific video |

---

## 🚀 Deployment
Rikio frontend is deployed on **[Vercel](https://rikio.vercel.app/)**.


---

## 🛠️ Contributing
We welcome contributions to improve Rikio! 🚀
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
