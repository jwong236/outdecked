"""
Authentication and User Management System
Handles user registration, login, sessions, and role-based access
"""

import sqlite3
import hashlib
import secrets
import json
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, session, g
from database import get_db_connection

# Role permissions system
ROLE_PERMISSIONS = {
    "owner": {
        "manage_users": True,
        "manage_content": True,
        "view_admin_panel": True,
        "moderate_content": True,
        "access_all_decks": True,
        "system_settings": True,
    },
    "admin": {
        "manage_users": True,
        "manage_content": True,
        "view_admin_panel": True,
        "moderate_content": True,
        "access_all_decks": True,
        "system_settings": False,
    },
    "moderator": {
        "manage_users": False,
        "manage_content": False,
        "view_admin_panel": False,
        "moderate_content": True,
        "access_all_decks": False,
        "system_settings": False,
    },
    "user": {
        "manage_users": False,
        "manage_content": False,
        "view_admin_panel": False,
        "moderate_content": False,
        "access_all_decks": False,
        "system_settings": False,
    },
}

# Default user preferences
DEFAULT_USER_PREFERENCES = {
    "background": "/backgrounds/background-1.jpg",
    "theme": "dark",
    "language": "en",
    "cards_per_page": "20",
    "default_sort": "name",
    "show_prices": "true",
    "notifications": "true",
}


def hash_password(password):
    """Hash password using PBKDF2 with salt (secure for small websites)"""
    # Generate a random salt
    salt = secrets.token_hex(16)  # 32 character salt
    # Use PBKDF2 with SHA256, 100,000 iterations
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    )
    # Return salt + hash as hex string
    return salt + password_hash.hex()


def verify_password(password, password_hash):
    """Verify password against PBKDF2 hash"""
    try:
        # Extract salt (first 32 characters) and hash (rest)
        salt = password_hash[:32]
        stored_hash = password_hash[32:]

        # Hash the provided password with the same salt
        password_hash_computed = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
        )

        # Compare hashes securely
        return secrets.compare_digest(stored_hash, password_hash_computed.hex())
    except Exception:
        # Fallback for old SHA256 hashes during migration
        return hashlib.sha256(password.encode()).hexdigest() == password_hash


def generate_session_token():
    """Generate a secure session token"""
    return secrets.token_urlsafe(32)


def get_current_user():
    """Get current user from session"""
    if "user_id" in session:
        conn = get_db_connection()
        cursor = conn.execute(
            "SELECT * FROM users WHERE id = ? AND is_active = TRUE",
            (session["user_id"],),
        )
        user = cursor.fetchone()
        conn.close()
        if user:
            # Handle both Row objects and tuples
            if hasattr(user, "keys"):
                return dict(user)
            else:
                # Convert tuple to dict using column names
                columns = [description[0] for description in cursor.description]
                return dict(zip(columns, user))
        return None
    return None


def require_auth(f):
    """Decorator to require authentication"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        g.current_user = user
        return f(*args, **kwargs)

    return decorated_function


def require_role(required_role):
    """Decorator to require specific role"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401

            # Check role hierarchy
            role_hierarchy = ["user", "moderator", "admin", "owner"]
            user_role_level = role_hierarchy.index(user["role"])
            required_role_level = role_hierarchy.index(required_role)

            if user_role_level < required_role_level:
                return jsonify({"error": "Insufficient permissions"}), 403

            g.current_user = user
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_permission(permission):
    """Decorator to require specific permission"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401

            user_role = user["role"]
            if not ROLE_PERMISSIONS.get(user_role, {}).get(permission, False):
                return jsonify({"error": "Insufficient permissions"}), 403

            g.current_user = user
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def handle_register():
    """Handle user registration"""
    data = request.get_json()

    # Validate input
    required_fields = ["username", "email", "password"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    username = data["username"].strip()
    email = data["email"].strip().lower()
    password = data["password"]

    # Basic validation
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if "@" not in email:
        return jsonify({"error": "Invalid email format"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if username or email already exists
        cursor.execute(
            "SELECT id FROM users WHERE username = ? OR email = ?", (username, email)
        )
        if cursor.fetchone():
            return jsonify({"error": "Username or email already exists"}), 400

        # Create user
        password_hash = hash_password(password)
        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash, display_name)
            VALUES (?, ?, ?, ?)
        """,
            (username, email, password_hash, username),
        )

        user_id = cursor.lastrowid

        # Set default preferences using the existing column-based structure
        cursor.execute(
            """
            INSERT INTO user_preferences (user_id, background, cards_per_page, default_sort, theme)
            VALUES (?, ?, ?, ?, ?)
        """,
            (user_id, "/backgrounds/background-1.jpg", 24, "name", "light"),
        )

        conn.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "User registered successfully",
                    "user_id": user_id,
                }
            ),
            201,
        )

    except sqlite3.IntegrityError:
        return jsonify({"error": "Username or email already exists"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def handle_login():
    """Handle user login"""
    data = request.get_json()

    username_or_email = data.get("username", "").strip()
    password = data.get("password", "")

    if not username_or_email or not password:
        return jsonify({"error": "Username/email and password are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Find user by username or email
    cursor.execute(
        """
        SELECT * FROM users 
        WHERE (username = ? OR email = ?) AND is_active = TRUE
    """,
        (username_or_email, username_or_email),
    )

    user = cursor.fetchone()

    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid credentials"}), 401

    # Create session
    session_token = generate_session_token()
    expires_at = datetime.now() + timedelta(days=30)  # 30 day session

    cursor.execute(
        """
        INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
    """,
        (
            user["id"],
            session_token,
            expires_at,
            request.remote_addr,
            request.headers.get("User-Agent", ""),
        ),
    )

    # Update last login
    cursor.execute(
        "UPDATE users SET last_login = ? WHERE id = ?", (datetime.now(), user["id"])
    )

    conn.commit()
    conn.close()

    # Set session
    session["user_id"] = user["id"]
    session["session_token"] = session_token

    return jsonify(
        {
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "role": user["role"],
                "display_name": user["display_name"],
                "avatar_url": user["avatar_url"],
            },
        }
    )


def handle_logout():
    """Handle user logout"""
    if "session_token" in session:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Remove session from database
        cursor.execute(
            "DELETE FROM user_sessions WHERE session_token = ?",
            (session["session_token"],),
        )

        conn.commit()
        conn.close()

    # Clear session
    session.clear()

    return jsonify({"success": True, "message": "Logout successful"})


def handle_get_current_user():
    """Get current user information"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    return jsonify(
        {
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "role": user["role"],
                "display_name": user["display_name"],
                "avatar_url": user["avatar_url"],
                "last_login": user["last_login"],
            }
        }
    )


def handle_get_user_preferences():
    """Get user preferences"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    conn = get_db_connection()
    cursor = conn.execute(
        "SELECT background, cards_per_page, default_sort, theme FROM user_preferences WHERE user_id = ?",
        (user["id"],),
    )

    result = cursor.fetchone()
    conn.close()

    if result:
        preferences = {
            "background": result["background"],
            "cards_per_page": result["cards_per_page"],
            "default_sort": result["default_sort"],
            "theme": result["theme"],
        }
        print(f"📖 Reading preferences from DB for user {user['id']}: {preferences}")
    else:
        preferences = {
            "background": "/backgrounds/background-1.jpg",
            "cards_per_page": 24,
            "default_sort": "name",
            "theme": "light",
        }
        print(f"⚠️ No preferences found in DB for user {user['id']}, using defaults")

    return jsonify({"preferences": preferences})


def handle_update_user_preferences():
    """Update user preferences"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.get_json()
    preferences = data.get("preferences", {})

    print(f"📦 Updating preferences for user {user['id']}: {preferences}")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Update specific columns
    background = preferences.get("background", "/backgrounds/background-1.jpg")
    cards_per_page = preferences.get("cards_per_page", 24)
    default_sort = preferences.get("default_sort", "name")
    theme = preferences.get("theme", "light")

    print(
        f"💾 Saving to DB - background: {background}, cards_per_page: {cards_per_page}, default_sort: {default_sort}, theme: {theme}"
    )

    # Check if preferences exist
    existing = cursor.execute(
        "SELECT id FROM user_preferences WHERE user_id = ? LIMIT 1",
        (user["id"],),
    ).fetchone()

    if existing:
        # Update existing preferences
        cursor.execute(
            """
            UPDATE user_preferences 
            SET background = ?, cards_per_page = ?, default_sort = ?, theme = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (
                background,
                cards_per_page,
                default_sort,
                theme,
                datetime.now(),
                user["id"],
            ),
        )
    else:
        # Insert new preferences
        cursor.execute(
            """
            INSERT INTO user_preferences (user_id, background, cards_per_page, default_sort, theme, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                background,
                cards_per_page,
                default_sort,
                theme,
                datetime.now(),
            ),
        )

    conn.commit()
    print(f"✅ Preferences committed to database for user {user['id']}")

    # Verify the write by reading it back immediately
    verify_cursor = conn.execute(
        "SELECT background FROM user_preferences WHERE user_id = ?",
        (user["id"],),
    )
    verify_result = verify_cursor.fetchone()
    if verify_result:
        print(f"🔍 Verification read: background = {verify_result['background']}")
    else:
        print(f"⚠️ Verification failed: No row found for user {user['id']}")

    conn.close()

    return jsonify({"success": True, "message": "Preferences updated"})


def handle_get_users():
    """Get all users (admin only)"""
    user = get_current_user()
    if not user or user["role"] not in ["admin", "owner"]:
        return jsonify({"error": "Insufficient permissions"}), 403

    conn = get_db_connection()
    cursor = conn.execute(
        """
        SELECT id, username, email, role, display_name, is_active, 
               is_verified, last_login, created_at
        FROM users 
        ORDER BY created_at DESC
    """
    )

    users = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({"users": users})


def handle_update_user_role():
    """Update user role (admin/owner only)"""
    user = get_current_user()
    if not user or user["role"] not in ["admin", "owner"]:
        return jsonify({"error": "Insufficient permissions"}), 403

    data = request.get_json()
    target_user_id = data.get("user_id")
    new_role = data.get("role")

    if not target_user_id or not new_role:
        return jsonify({"error": "user_id and role are required"}), 400

    if new_role not in ["user", "moderator", "admin", "owner"]:
        return jsonify({"error": "Invalid role"}), 400

    # Prevent non-owners from creating owners
    if new_role == "owner" and user["role"] != "owner":
        return jsonify({"error": "Only owners can create other owners"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE users SET role = ?, updated_at = ? WHERE id = ?",
        (new_role, datetime.now(), target_user_id),
    )

    if cursor.rowcount == 0:
        return jsonify({"error": "User not found"}), 404

    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "User role updated"})


def handle_get_user_stats():
    """Get user statistics (admin only)"""
    user = get_current_user()
    if not user or user["role"] not in ["admin", "owner"]:
        return jsonify({"error": "Insufficient permissions"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    # Get user counts by role
    cursor.execute(
        """
        SELECT role, COUNT(*) as count 
        FROM users 
        WHERE is_active = TRUE 
        GROUP BY role
    """
    )
    role_counts = {row["role"]: row["count"] for row in cursor.fetchall()}

    # Get total users
    cursor.execute("SELECT COUNT(*) as total FROM users WHERE is_active = TRUE")
    total_users = cursor.fetchone()["total"]

    # Get recent registrations (last 30 days)
    cursor.execute(
        """
        SELECT COUNT(*) as recent 
        FROM users 
        WHERE created_at > datetime('now', '-30 days') AND is_active = TRUE
    """
    )
    recent_users = cursor.fetchone()["recent"]

    conn.close()

    return jsonify(
        {
            "total_users": total_users,
            "recent_users": recent_users,
            "role_counts": role_counts,
        }
    )


def handle_get_user_hand():
    """Get user's saved hand"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT hand_data FROM user_hands 
            WHERE user_id = ?
        """,
            (user["id"],),
        )

        result = cursor.fetchone()
        if result:
            hand_data = json.loads(result["hand_data"])
            return jsonify({"hand": hand_data})
        else:
            return jsonify({"hand": []})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def handle_save_user_hand():
    """Save user's hand to database"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.get_json()
    if not data or "hand" not in data:
        return jsonify({"error": "Hand data is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        hand_json = json.dumps(data["hand"])

        # Insert or update user hand
        cursor.execute(
            """
            INSERT OR REPLACE INTO user_hands (user_id, hand_data, updated_at)
            VALUES (?, ?, datetime('now'))
        """,
            (user["id"], hand_json),
        )

        conn.commit()
        return jsonify({"success": True, "message": "Hand saved successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def handle_get_user_decks():
    """Get user's saved decks"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT deck_data FROM user_decks 
            WHERE user_id = ?
            ORDER BY updated_at DESC
        """,
            (user["id"],),
        )

        results = cursor.fetchall()
        decks = []

        for row in results:
            # Handle both Row objects and tuples
            if hasattr(row, "keys"):
                deck_data = json.loads(row["deck_data"])
            else:
                deck_data = json.loads(row[0])  # deck_data is at index 0
            decks.append(deck_data)

        return jsonify({"success": True, "decks": decks})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def handle_save_user_decks():
    """Save user's decks to database"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.get_json()
    if not data or "decks" not in data:
        return jsonify({"error": "Decks data is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Delete existing decks for this user
        cursor.execute("DELETE FROM user_decks WHERE user_id = ?", (user["id"],))

        # Insert new decks
        for deck in data["decks"]:
            deck_json = json.dumps(deck)
            cursor.execute(
                """
                INSERT INTO user_decks (user_id, deck_id, deck_data, updated_at)
                VALUES (?, ?, ?, datetime('now'))
            """,
                (user["id"], deck["id"], deck_json),
            )

        conn.commit()
        return jsonify({"success": True, "message": "Decks saved successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
