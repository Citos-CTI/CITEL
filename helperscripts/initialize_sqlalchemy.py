from passlib.apps import custom_app_context as pwd_context
from main import db, User

def create_user():
    db.create_all()
    admin = User(id=0, username='admin', password_hash= pwd_context.encrypt("admin"))
    print("Created user")
    print("Login: admin")
    print("Password: admin")
    db.session.add(admin)
    db.session.commit()