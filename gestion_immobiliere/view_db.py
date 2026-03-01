from app import app, db
from models import User

with app.app_context():
    users = User.query.all()
    print("=== UTILISATEURS DANS LA BASE DE DONNÉES ===")
    if not users:
        print("Aucun utilisateur trouvé.")
    for u in users:
        print(f"ID: {u.id} | Nom: {u.username} | Email: {u.email} | Rôle: {u.role}")
    print("============================================")
