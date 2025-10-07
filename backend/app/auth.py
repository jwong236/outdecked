"""
SQLAlchemy-based Authentication and User Management System
Handles user registration, login, sessions, and role-based access
"""

import hashlib
import secrets
import json
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, session, g
from database import get_session
from models import User, UserPreference, UserSession, UserHand, UserDeck

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
    """Get current user from session using SQLAlchemy"""
    if "user_id" in session:
        db_session = get_session()
        try:
            user = (
                db_session.query(User)
                .filter(User.id == session["user_id"], User.is_active == True)
                .first()
            )
            if user:
                return user.to_dict()
            return None
        finally:
            db_session.close()
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
    """Handle user registration with SQLAlchemy"""
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

    db_session = get_session()
    try:
        # Check if username or email already exists
        existing_user = (
            db_session.query(User)
            .filter((User.username == username) | (User.email == email))
            .first()
        )
        if existing_user:
            return jsonify({"error": "Username or email already exists"}), 400

        # Create user
        password_hash = hash_password(password)
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            display_name=username,
            role="user",
            is_active=True,
            is_verified=False,
        )
        db_session.add(user)
        db_session.flush()  # Get the user ID without committing

        # Set default preferences
        preferences = UserPreference(
            user_id=user.id,
            background="/backgrounds/background-1.jpg",
            cards_per_page=24,
            theme="light",
        )
        db_session.add(preferences)

        db_session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "User registered successfully",
                    "user_id": user.id,
                }
            ),
            201,
        )

    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_login():
    """Handle user login with SQLAlchemy"""
    data = request.get_json()

    username_or_email = data.get("username", "").strip()
    password = data.get("password", "")

    if not username_or_email or not password:
        return jsonify({"error": "Username/email and password are required"}), 400

    db_session = get_session()
    try:
        # Find user by username or email
        user = (
            db_session.query(User)
            .filter(
                (User.username == username_or_email) | (User.email == username_or_email)
            )
            .filter(User.is_active == True)
            .first()
        )

        if not user or not verify_password(password, user.password_hash):
            return jsonify({"error": "Invalid credentials"}), 401

        # Create session
        session_token = generate_session_token()
        expires_at = datetime.now() + timedelta(days=30)  # 30 day session

        user_session = UserSession(
            user_id=user.id,
            session_token=session_token,
            expires_at=expires_at,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent", ""),
        )
        db_session.add(user_session)

        # Update last login
        user.last_login = datetime.now()

        db_session.commit()

        # Set session
        session["user_id"] = user.id
        session["session_token"] = session_token

        return jsonify(
            {
                "success": True,
                "message": "Login successful",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role,
                    "display_name": user.display_name,
                    "avatar_url": user.avatar_url,
                },
            }
        )

    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_logout():
    """Handle user logout with SQLAlchemy"""
    if "session_token" in session:
        db_session = get_session()
        try:
            # Remove session from database
            db_session.query(UserSession).filter(
                UserSession.session_token == session["session_token"]
            ).delete()

            db_session.commit()
        except Exception as e:
            db_session.rollback()
            print(f"Error during logout: {e}")
        finally:
            db_session.close()

    # Clear session
    session.clear()

    return jsonify({"success": True, "message": "Logout successful"})


def handle_get_current_user():
    """Get current user information with SQLAlchemy"""
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
    """Get user preferences with SQLAlchemy"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    db_session = get_session()
    try:
        preferences = (
            db_session.query(UserPreference)
            .filter(UserPreference.user_id == user["id"])
            .first()
        )

        if preferences:
            return jsonify(
                {
                    "preferences": {
                        "background": preferences.background,
                        "cards_per_page": preferences.cards_per_page,
                        "theme": preferences.theme,
                    }
                }
            )
        else:
            return jsonify(
                {
                    "preferences": {
                        "background": "/backgrounds/background-1.jpg",
                        "cards_per_page": 24,
                        "theme": "light",
                    }
                }
            )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_update_user_preferences():
    """Update user preferences with SQLAlchemy"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.get_json()
    preferences_data = data.get("preferences", {})

    db_session = get_session()
    try:
        # Get or create preferences
        preferences = (
            db_session.query(UserPreference)
            .filter(UserPreference.user_id == user["id"])
            .first()
        )

        if not preferences:
            preferences = UserPreference(user_id=user["id"])
            db_session.add(preferences)

        # Update specific fields
        preferences.background = preferences_data.get(
            "background", "/backgrounds/background-1.jpg"
        )
        preferences.cards_per_page = preferences_data.get("cards_per_page", 24)
        preferences.theme = preferences_data.get("theme", "light")
        preferences.updated_at = datetime.now()

        db_session.commit()

        return jsonify({"success": True, "message": "Preferences updated"})

    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_get_users():
    """Get all users (admin only) with SQLAlchemy"""
    user = get_current_user()
    if not user or user["role"] not in ["admin", "owner"]:
        return jsonify({"error": "Insufficient permissions"}), 403

    db_session = get_session()
    try:
        users = db_session.query(User).order_by(User.created_at.desc()).all()

        users_data = []
        for u in users:
            users_data.append(
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "role": u.role,
                    "display_name": u.display_name,
                    "is_active": u.is_active,
                    "is_verified": u.is_verified,
                    "last_login": u.last_login.isoformat() if u.last_login else None,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                }
            )

        return jsonify({"users": users_data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_update_user_role():
    """Update user role (admin/owner only) with SQLAlchemy"""
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

    db_session = get_session()
    try:
        target_user = db_session.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            return jsonify({"error": "User not found"}), 404

        target_user.role = new_role
        target_user.updated_at = datetime.now()

        db_session.commit()

        return jsonify({"success": True, "message": "User role updated"})

    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_get_user_stats():
    """Get user statistics (admin only) with SQLAlchemy"""
    user = get_current_user()
    if not user or user["role"] not in ["admin", "owner"]:
        return jsonify({"error": "Insufficient permissions"}), 403

    db_session = get_session()
    try:
        from sqlalchemy import func

        # Get user counts by role
        role_counts_query = (
            db_session.query(User.role, func.count(User.id))
            .filter(User.is_active == True)
            .group_by(User.role)
        )
        role_counts = {role: count for role, count in role_counts_query.all()}

        # Get total users
        total_users = (
            db_session.query(func.count(User.id))
            .filter(User.is_active == True)
            .scalar()
        )

        # Get recent registrations (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_users = (
            db_session.query(func.count(User.id))
            .filter(User.created_at > thirty_days_ago, User.is_active == True)
            .scalar()
        )

        return jsonify(
            {
                "total_users": total_users,
                "recent_users": recent_users,
                "role_counts": role_counts,
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_get_user_hand():
    """Get user's saved hand with SQLAlchemy"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    db_session = get_session()
    try:
        user_hand = (
            db_session.query(UserHand).filter(UserHand.user_id == user["id"]).first()
        )

        if user_hand:
            hand_data = json.loads(user_hand.hand_data)
            # Ensure hand_data is an array
            if not isinstance(hand_data, list):
                hand_data = []
            return jsonify({"hand": hand_data})
        else:
            return jsonify({"hand": []})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_save_user_hand():
    """Save user's hand to database with SQLAlchemy"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.get_json()
    if not data or "hand" not in data:
        return jsonify({"error": "Hand data is required"}), 400

    db_session = get_session()
    try:
        hand_json = json.dumps(data["hand"])

        # Get or create user hand
        user_hand = (
            db_session.query(UserHand).filter(UserHand.user_id == user["id"]).first()
        )

        if user_hand:
            # Update existing hand
            user_hand.hand_data = hand_json
            user_hand.updated_at = datetime.now()
        else:
            # Create new hand
            user_hand = UserHand(
                user_id=user["id"],
                hand_data=hand_json,
            )
            db_session.add(user_hand)

        db_session.commit()
        return jsonify({"success": True, "message": "Hand saved successfully"})

    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_get_user_decks():
    """Get user's saved decks with SQLAlchemy"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    db_session = get_session()
    try:
        user_decks = (
            db_session.query(UserDeck)
            .filter(UserDeck.user_id == user["id"])
            .order_by(UserDeck.updated_at.desc())
            .all()
        )

        decks = []
        for deck in user_decks:
            deck_data = json.loads(deck.deck_data)
            decks.append(deck_data)

        return jsonify({"success": True, "decks": decks})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


def handle_save_user_decks():
    """Save user's decks to database with SQLAlchemy"""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.get_json()
    if not data or "decks" not in data:
        return jsonify({"error": "Decks data is required"}), 400

    db_session = get_session()
    try:
        # Delete existing decks for this user
        db_session.query(UserDeck).filter(UserDeck.user_id == user["id"]).delete()

        # Insert new decks
        for deck in data["decks"]:
            deck_json = json.dumps(deck)
            new_deck = UserDeck(
                user_id=user["id"],
                deck_id=deck["id"],
                deck_data=deck_json,
            )
            db_session.add(new_deck)

        db_session.commit()
        return jsonify({"success": True, "message": "Decks saved successfully"})

    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()
