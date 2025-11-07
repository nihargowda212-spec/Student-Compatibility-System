# Student Compatibility System

A web application that allows students to take personality tests and find compatible study partners based on their personality profiles.

## Features

- User authentication (Login/Register)
- 40-question personality test with 5 categories:
  - Mindset (Questions 1-8)
  - Self-Management (Questions 9-16)
  - Interactions (Questions 17-24)
  - Personality (Questions 25-32)
  - Resilience (Questions 33-40)
- 8 questions per page (5 pages total)
- Invite code generation for friends
- Compatibility calculation between students
- Visual results display with radar chart
- Personalized action plans based on test results

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Python (Flask)
- **Database**: MySQL
- **Charts**: Chart.js

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- MySQL Server
- pip (Python package manager)

### Installation

1. **Clone or download the project**

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up MySQL Database**
   - Open MySQL and create a database user (or use root)
   - Update database credentials in `app.py` (DB_CONFIG dictionary)
   - Run the schema file to create tables:
     ```bash
     mysql -u root -p < database/schema.sql
     ```
     Or manually execute the SQL file in MySQL Workbench/phpMyAdmin

4. **Update Database Configuration**
   - Edit `app.py` and update the `DB_CONFIG` dictionary with your MySQL credentials:
     ```python
     DB_CONFIG = {
         'host': 'localhost',
         'database': 'student_compatibility',
         'user': 'your_username',
         'password': 'your_password'
     }
     ```

5. **Run the Flask Application**
   ```bash
   python app.py
   ```

6. **Access the Application**
   - Open your browser and navigate to: `http://localhost:5000`

## Project Structure

```
login/
├── app.py                      # Flask backend application
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── database/
│   └── schema.sql              # MySQL database schema
├── templates/
│   ├── index.html              # Home page
│   ├── login.html              # Login page
│   ├── register.html           # Registration page
│   ├── test.html               # Personality test page
│   ├── invite.html             # Invite code generation page
│   └── results.html            # Results display page
└── static/
    ├── css/
    │   └── style.css           # Stylesheet
    └── js/
        ├── auth.js             # Authentication logic
        ├── test.js             # Test page logic
        ├── invite.js           # Invite code logic
        └── results.js          # Results page logic
```

## Usage Flow

1. **Student A**:
   - Register/Login
   - Take the personality test (40 questions)
   - Generate an invite code
   - Share the invite code with Student B

2. **Student B**:
   - Register/Login
   - Take the personality test (40 questions)
   - Enter the invite code from Student A (optional)

3. **System**:
   - Calculates personality scores for both students
   - Calculates compatibility between them
   - Displays results with radar chart visualization

## API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/questions` - Get all test questions
- `POST /api/submit-test` - Submit test responses
- `POST /api/generate-invite` - Generate invite code
- `GET /api/personality-scores` - Get user's personality scores
- `GET /api/compatibility` - Get compatibility results

## Notes

- The test must be completed in order (all questions on a page must be answered before proceeding)
- Invite codes are optional but required for compatibility calculation between specific users
- Personality scores are calculated as averages of responses in each category (scaled to 0-100)
- Compatibility is calculated using Euclidean distance between personality scores

## Troubleshooting

- **Database Connection Error**: Check MySQL credentials in `app.py`
- **Module Not Found**: Run `pip install -r requirements.txt`
- **Port Already in Use**: Change the port in `app.py` (last line)

## License

This project is open source and available for educational purposes.

