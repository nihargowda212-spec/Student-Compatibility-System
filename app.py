from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import hashlib
import secrets
import string
from datetime import datetime
import math
from decimal import Decimal

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-in-production'
CORS(app)

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'student_compatibility',
    'user': 'root',
    'password': 'nihargowdamp212'  # Change this to your MySQL password
}

def get_db_connection():
    """Create and return database connection"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_invite_code():
    """Generate a random 8-character invite code"""
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(8))

# Frontend Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/test')
def test_page():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('test.html')

@app.route('/invite')
def invite_page():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('invite.html')

@app.route('/results')
def results_page():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('results.html')

# API Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        password_hash = hash_password(password)
        
        # Check if username or email already exists
        cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Username or email already exists'}), 400
        
        # Insert new user
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
            (username, email, password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid
        
        session['user_id'] = user_id
        session['username'] = username
        
        conn.close()
        return jsonify({'message': 'Registration successful', 'user_id': user_id}), 201
    except Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        password_hash = hash_password(password)
        
        cursor.execute(
            "SELECT id, username FROM users WHERE username = %s AND password_hash = %s",
            (username, password_hash)
        )
        user = cursor.fetchone()
        
        conn.close()
        
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            return jsonify({'message': 'Login successful', 'user_id': user['id']}), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
    except Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/questions', methods=['GET'])
def get_questions():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, category, question_text, question_number FROM questions ORDER BY question_number")
        questions = cursor.fetchall()
        conn.close()
        return jsonify({'questions': questions}), 200
    except Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/submit-test', methods=['POST'])
def submit_test():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    responses = data.get('responses')  # List of {question_id: response_value}
    invite_code = data.get('invite_code', None)  # Optional invite code
    
    if not responses or len(responses) != 40:
        return jsonify({'error': 'All 40 questions must be answered'}), 400
    
    user_id = session['user_id']
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        
        # Delete existing responses
        cursor.execute("DELETE FROM test_responses WHERE user_id = %s", (user_id,))
        
        # Insert new responses
        for response in responses:
            cursor.execute(
                "INSERT INTO test_responses (user_id, question_id, response_value) VALUES (%s, %s, %s)",
                (user_id, response['question_id'], response['response_value'])
            )
        
        # Calculate personality scores
        calculate_personality_scores(user_id, cursor)
        
        # If invite code provided, mark it as used
        if invite_code:
            cursor.execute(
                "UPDATE invites SET used_by_user_id = %s, is_used = TRUE, used_at = CURRENT_TIMESTAMP WHERE invite_code = %s AND is_used = FALSE",
                (user_id, invite_code)
            )
            # Get the creator of the invite
            cursor.execute(
                "SELECT created_by_user_id FROM invites WHERE invite_code = %s",
                (invite_code,)
            )
            invite_result = cursor.fetchone()
            if invite_result:
                creator_id = invite_result[0]
                # Calculate compatibility if both users have completed tests
                calculate_compatibility(creator_id, user_id, cursor)
        
        conn.commit()
        conn.close()
        return jsonify({'message': 'Test submitted successfully'}), 200
    except Error as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

def calculate_personality_scores(user_id, cursor):
    """Calculate personality scores for a user based on their responses"""
    # Get all responses grouped by category
    cursor.execute("""
        SELECT q.category, AVG(tr.response_value) * 20 as avg_score
        FROM test_responses tr
        JOIN questions q ON tr.question_id = q.id
        WHERE tr.user_id = %s
        GROUP BY q.category
    """, (user_id,))
    
    scores = {row[0]: row[1] for row in cursor.fetchall()}
    
    # Insert or update personality scores
    cursor.execute("""
        INSERT INTO personality_scores 
        (user_id, mindset_score, self_management_score, interactions_score, personality_score, resilience_score)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        mindset_score = VALUES(mindset_score),
        self_management_score = VALUES(self_management_score),
        interactions_score = VALUES(interactions_score),
        personality_score = VALUES(personality_score),
        resilience_score = VALUES(resilience_score),
        calculated_at = CURRENT_TIMESTAMP
    """, (
        user_id,
        scores.get('Mindset', 0),
        scores.get('Self-Management', 0),
        scores.get('Interactions', 0),
        scores.get('Personality', 0),
        scores.get('Resilience', 0)
    ))

def calculate_compatibility(user_a_id, user_b_id, cursor):
    """Calculate compatibility between two users"""
    # Get personality scores for both users
    cursor.execute("""
        SELECT mindset_score, self_management_score, interactions_score, personality_score, resilience_score
        FROM personality_scores WHERE user_id = %s
    """, (user_a_id,))
    user_a_scores = cursor.fetchone()
    
    cursor.execute("""
        SELECT mindset_score, self_management_score, interactions_score, personality_score, resilience_score
        FROM personality_scores WHERE user_id = %s
    """, (user_b_id,))
    user_b_scores = cursor.fetchone()
    
    if not user_a_scores or not user_b_scores:
        return
    
    # Calculate Euclidean distance (lower distance = higher compatibility)
    differences = [
        abs(user_a_scores[i] - user_b_scores[i]) for i in range(5)
    ]
    distance = math.sqrt(sum(d**2 for d in differences))
    
    # Convert distance to compatibility score (0-100)
    # Max possible distance is sqrt(5 * 100^2) = ~223.6
    # We'll invert it: compatibility = 100 - (distance / 223.6 * 100)
    max_distance = math.sqrt(5 * 100 * 100)
    compatibility_score = max(0, 100 - (distance / max_distance * 100))
    
    # Insert or update compatibility result
    cursor.execute("""
        INSERT INTO compatibility_results (user_a_id, user_b_id, compatibility_score)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE
        compatibility_score = VALUES(compatibility_score),
        calculated_at = CURRENT_TIMESTAMP
    """, (user_a_id, user_b_id, compatibility_score))

@app.route('/api/generate-invite', methods=['POST'])
def generate_invite():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor()
        invite_code = generate_invite_code()
        
        # Ensure code is unique
        while True:
            cursor.execute("SELECT id FROM invites WHERE invite_code = %s", (invite_code,))
            if not cursor.fetchone():
                break
            invite_code = generate_invite_code()
        
        cursor.execute(
            "INSERT INTO invites (invite_code, created_by_user_id) VALUES (%s, %s)",
            (invite_code, user_id)
        )
        conn.commit()
        conn.close()
        return jsonify({'invite_code': invite_code}), 200
    except Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/personality-scores', methods=['GET'])
def get_personality_scores():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT mindset_score, self_management_score, interactions_score, 
                   personality_score, resilience_score, calculated_at
            FROM personality_scores WHERE user_id = %s
        """, (user_id,))
        scores = cursor.fetchone()
        conn.close()
        
        if scores:
            normalized = {}
            for key, value in scores.items():
                if isinstance(value, Decimal):
                    normalized[key] = float(value)
                else:
                    normalized[key] = value
            normalized['username'] = session.get('username')
            return jsonify(normalized), 200
        else:
            return jsonify({'error': 'No scores found. Please complete the test first.'}), 404
    except Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/compatibility', methods=['GET'])
def get_compatibility():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        # Get compatibility results where current user is either user_a or user_b
        cursor.execute("""
            SELECT 
                CASE 
                    WHEN user_a_id = %s THEN user_b_id 
                    ELSE user_a_id 
                END as other_user_id,
                u.username as other_username,
                compatibility_score
            FROM compatibility_results cr
            JOIN users u ON (u.id = CASE WHEN user_a_id = %s THEN user_b_id ELSE user_a_id END)
            WHERE user_a_id = %s OR user_b_id = %s
            ORDER BY compatibility_score DESC
        """, (user_id, user_id, user_id, user_id))
        
        results = cursor.fetchall()
        conn.close()
        return jsonify({'compatibility_results': results}), 200
    except Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


@app.route('/api/compatibility/<int:other_user_id>', methods=['GET'])
def get_compatibility_detail(other_user_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user_id']
    if user_id == other_user_id:
        return jsonify({'error': 'Cannot compare with yourself'}), 400
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
    
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Ensure compatibility record exists
        cursor.execute("""
            SELECT compatibility_score
            FROM compatibility_results
            WHERE (user_a_id = %s AND user_b_id = %s)
               OR (user_a_id = %s AND user_b_id = %s)
        """, (user_id, other_user_id, other_user_id, user_id))
        compatibility = cursor.fetchone()
        if not compatibility:
            conn.close()
            return jsonify({'error': 'Compatibility data not found'}), 404
        
        # Fetch usernames
        cursor.execute("SELECT username FROM users WHERE id = %s", (other_user_id,))
        other_user = cursor.fetchone()
        if not other_user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        cursor.execute("""
            SELECT mindset_score, self_management_score, interactions_score, 
                   personality_score, resilience_score, calculated_at
            FROM personality_scores WHERE user_id = %s
        """, (user_id,))
        user_scores = cursor.fetchone()
        
        cursor.execute("""
            SELECT mindset_score, self_management_score, interactions_score, 
                   personality_score, resilience_score, calculated_at
            FROM personality_scores WHERE user_id = %s
        """, (other_user_id,))
        partner_scores = cursor.fetchone()
        conn.close()
        
        if not user_scores or not partner_scores:
            return jsonify({'error': 'Personality scores not found for both users'}), 404
        
        def normalize_scores(payload):
            normalized_payload = {}
            for key, value in payload.items():
                if isinstance(value, Decimal):
                    normalized_payload[key] = float(value)
                else:
                    normalized_payload[key] = value
            return normalized_payload
        
        response = {
            'user': {
                'user_id': user_id,
                'username': session.get('username'),
                'scores': normalize_scores(user_scores)
            },
            'partner': {
                'user_id': other_user_id,
                'username': other_user['username'],
                'scores': normalize_scores(partner_scores)
            },
            'compatibility_score': float(compatibility['compatibility_score'])
        }
        return jsonify(response), 200
    except Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

