# Antigravity Prompt - Application de Gestion Immobilière PWA

## Présentation du Projet

Ce projet consiste à développer une application web mobile de gestion immobilière fonctionnant comme une Progressive Web App (PWA). L'application permettra aux utilisateurs (propriétaires et locataires) de gérer leurs biens immobiliers, suivre les paiements, communiquer via une messagerie intégrée, et recevoir des notifications en temps réel. Le frontend est conçu avec Stitch (export HTML/CSS) et le backend est développé en Python avec le framework Flask. L'application est optimisée pour une utilisation sur mobile avec une interface tactile intuitive et des performances fluides.

## Screens Stitch à Intégrer


Écran

ID Stitch

Fichier Template

Route Flask

Écran d'accueil/Connexion

acca97fdb9374194b122d3d8d6d7292d

accueil.html

/

Historique des Paiements

0a96083fcbd64552b48662febc014a7a

paiements.html

/paiements

Messagerie/Communication

2902e340e3c340d896de8ee8769356c6

messages.html

/messages

Ajouter une Propriété

368e3289fce145629bc22065ca2948e9

ajouter.html

/ajouter-propriete

Dashboard Propriétaire

59bdcb9c7a5b40368e101350083d1337

dashboard_owner.html

/dashboard-proprietaire

Dashboard Locataire

9e897521f75642e3a6e25a6be19571fb

dashboard_tenant.html

/dashboard-locataire

Notifications/Alertes

cd54c7f0cfff4965aa416d28e2ae66ce

notifications.html

/notifications

Détails du Contrat

f413a676e5514e47ac3add036db992c3

contrat.html

/contrat

Structure du Projet

gestion_immobiliere/
├── app.py                    # Point d'entrée principal Flask
├── config.py                 # Configuration de l'application
├── requirements.txt          # Dépendances Python
├── instance/
│   └── database.db           # Base de données SQLite
├── templates/                # Templates HTML Stitch
│   ├── base.html             # Template de base (header, footer, navigation)
│   ├── accueil.html          # Écran d'accueil/Connexion
│   ├── paiements.html        # Historique des Paiements
│   ├── messages.html         # Messagerie
│   ├── ajouter.html          # Ajouter une Propriété
│   ├── dashboard_owner.html  # Dashboard Propriétaire
│   ├── dashboard_tenant.html # Dashboard Locataire
│   ├── notifications.html    # Notifications
│   └── contrat.html          # Détails du Contrat
├── static/                   # Fichiers statiques
│   ├── css/
│   │   ├── style.css         # Styles principaux
│   │   ├── responsive.css    # Media queries mobile
│   │   └── animations.css    # Animations et transitions
│   ├── js/
│   │   ├── app.js            # Logique principale
│   │   ├── api.js            # Communication avec l'API
│   │   ├── auth.js           # Gestion authentification
│   │   └── notifications.js  # Gestion des notifications
│   ├── images/               # Images et icônes
│   └── icons/                # Icônes PWA
├── pwa/                      # Configuration PWA
│   ├── manifest.json         # Manifeste PWA
│   ├── service-worker.js     # Service Worker offline
│   └── sw-register.js        # Enregistrement du Service Worker
└── models/                   # Modèles de données
    ├── __init__.py
    ├── user.py               # Modèle User
    ├── paiement.py           # Modèle Paiement
    ├── message.py            # Modèle Message
    ├── propriete.py          # Modèle Propriété
    ├── contrat.py            # Modèle Contrat
    └── notification.py       # Modèle Notification


    Backend - Configuration Flask

    # config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///instance/database.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-change-in-production'
    JWT_EXPIRATION_DELTA = 86400
    CORS_ORIGINS = ['*']


Modèles de Base de Données
# models/__init__.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    token = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Paiement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    montant = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    description = db.Column(db.String(200))
    statut = db.Column(db.String(20), default='effectue')
    type = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    contenu = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    lu = db.Column(db.Boolean, default=False)

class Propriete(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    adresse = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    superficie = db.Column(db.Float)
    nombre_pieces = db.Column(db.Integer)
    prix = db.Column(db.Float)
    image_url = db.Column(db.String(500))
    statut = db.Column(db.String(20), default='disponible')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Contrat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    locataire_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    proprietaire_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    propriete_id = db.Column(db.Integer, db.ForeignKey('propriete.id'), nullable=False)
    date_debut = db.Column(db.Date, nullable=False)
    date_fin = db.Column(db.Date, nullable=False)
    montant_loyer = db.Column(db.Float, nullable=False)
    statut = db.Column(db.String(20), default='actif')
    conditions = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    titre = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50))
    lu = db.Column(db.Boolean, default=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)


Endpoints API REST
Authentication
POST /api/login - Authentifie l'utilisateur et retourne un token JWT
POST /api/register - Crée un nouvel utilisateur
POST /api/logout - Déconnecte l'utilisateur
Paiements
GET /api/paiements - Liste les paiements (avec pagination)
POST /api/paiements - Crée un nouveau paiement
Messages
GET /api/messages - Liste les messages
POST /api/messages - Envoie un message
PUT /api/messages/<id>/lu - Marque comme lu
Propriétés
GET /api/proprietes - Liste les propriétés
POST /api/proprietes - Ajoute une propriété
GET /api/proprietes/<id> - Détails d'une propriété
Dashboards
GET /api/dashboard/proprietaire - Données dashboard propriétaire
GET /api/dashboard/locataire - Données dashboard locataire
Contrats
GET /api/contrats - Liste des contrats
Notifications
GET /api/notifications - Liste des notifications
PUT /api/notifications/<id>/lu - Marque comme lu
Configuration PWA
manifest.json
json

Copy code
{
  "name": "Gestion Immobilière",
  "short_name": "GestImmo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2196F3",
  "icons": [
    {
      "src": "/static/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/static/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
service-worker.js
Cache les ressources statiques pour le mode offline
Gère la synchronisation des données
Implémente les stratégies de cache (cache-first pour les assets, network-first pour l'API)
Contraintes Techniques
Design responsive mobile-first avec media queries
Interface tactile optimisée (zones cliquables >= 44px)
Animations CSS fluides (60fps)
Tokens JWT pour l'authentification
Hashage bcrypt pour les mots de passe
Validation des données entrantes
Protection CORS
Support hors-ligne via Service Worker
Installation possible sur l'écran d'accueil mobile

