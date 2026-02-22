# Installation Guide

## Prerequisites

- **Docker** and **Docker Compose** installed on your machine.
- A terminal or command prompt.
- Git (optional, for cloning the repository).

## Platform-Specific Instructions

### macOS / Linux

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/rohanbatrain/Storage-Management-System.git
    cd personal-storage-management
    ```
2.  **Start the Application**
    Run the following command in the root directory:
    ```bash
    docker-compose up -d --build
    ```
    This will build the backend and frontend images and start the containers.

3.  **Access the Application**
    - **Web App**: Open your browser and go to [http://localhost:3000](http://localhost:3000)
    - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

### Windows (using WSL2)

1.  Ensure **WSL2** (Windows Subsystem for Linux) is installed and Docker Desktop is configured to use it.
2.  Open your WSL terminal (e.g., Ubuntu).
3.  Follow the **macOS / Linux** instructions above.

## Environment Variables

The system uses reasonable defaults, but you can configure it via a `.env` file in the root directory:

```env
# Database Credentials
POSTGRES_USER=psms_user
POSTGRES_PASSWORD=psms_password
POSTGRES_DB=psms

# Backend Settings
SECRET_KEY=your-secret-key-here
```

## Running Without Docker (Development)

If you need to run the services directly on your host machine (e.g., for development):

### Backend

1.  Navigate to `backend/`.
2.  Create a virtual environment: `python -m venv venv`
3.  Activate it: `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
4.  Install dependencies: `pip install -r requirements.txt`
5.  Run the server: `uvicorn app.main:app --reload`

### Web Frontend

1.  Navigate to `web/`.
2.  Install dependencies: `npm install`
3.  Start dev server: `npm run dev`

### Mobile App
1. Navigate to `mobile/`.
2. Install dependencies: `npm install`
3. Start Expo: `npx expo start`
