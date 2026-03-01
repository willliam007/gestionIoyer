import os
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from models import db, User, Propriete, Paiement, Message, Contrat, Notification
from config import Config
from datetime import datetime

app = Flask(__name__)
app.config.from_object(Config)

# Ensure instance folder exists
os.makedirs(app.instance_path, exist_ok=True)

db.init_app(app)
jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})

with app.app_context():
    db.create_all()

# ==========================================
# UI HTML Routes
# ==========================================

@app.route('/')
def index():
    return render_template('accueil.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/paiements')
def paiements():
    return render_template('paiements.html')

@app.route('/messages')
def messages():
    return render_template('messages.html')

@app.route('/ajouter-propriete')
def ajouter_propriete():
    return render_template('ajouter.html')

@app.route('/dashboard-proprietaire')
def dashboard_proprietaire():
    return render_template('dashboard_owner.html')

@app.route('/dashboard-locataire')
def dashboard_locataire():
    return render_template('dashboard_tenant.html')

@app.route('/notifications')
def notifications():
    return render_template('notifications.html')

@app.route('/contrat')
def contrat_page():
    return render_template('contrat.html')

# ==========================================
# REST API Endpoints
# ==========================================

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password') or not data.get('email') or not data.get('role'):
        return jsonify({'message': 'Missing fields'}), 400
    
    if User.query.filter_by(username=data['username']).first() or User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'User already exists'}), 400
        
    new_user = User(username=data['username'], email=data['email'], role=data['role'])
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'Registration successful'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    login_id = data.get('username') # The frontend app.js sends the email field in the 'username' key
    
    # Check if a user matches either the username or the email
    user = User.query.filter((User.username == login_id) | (User.email == login_id)).first()
    
    if user and user.check_password(data.get('password')):
        access_token = create_access_token(identity=str(user.id))
        return jsonify(access_token=access_token, role=user.role, id=user.id), 200
        
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Successfully logged out'}), 200

# Proprietes API
@app.route('/api/proprietes', methods=['GET'])
@jwt_required()
def get_proprietes():
    current_user_id = int(get_jwt_identity())
    props = Propriete.query.filter_by(owner_id=current_user_id).all()
    res = [{'id': p.id, 'adresse': p.adresse, 'statut': p.statut, 'prix': p.prix, 'superficie': p.superficie, 'pieces': p.nombre_pieces} for p in props]
    return jsonify(res), 200

@app.route('/api/proprietes', methods=['POST'])
@jwt_required()
def add_propriete():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    if user.role != 'proprietaire':
        return jsonify({'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    new_prop = Propriete(
        owner_id=current_user_id,
        adresse=data['adresse'],
        description=data.get('description', ''),
        superficie=data.get('superficie', 0),
        nombre_pieces=data.get('nombre_pieces', 0),
        prix=data.get('prix', 0),
        statut='disponible'
    )
    db.session.add(new_prop)
    db.session.commit()
    return jsonify({'message': 'Propriété ajoutée'}), 201

@app.route('/api/proprietes/<int:id>', methods=['GET'])
def get_propriete(id):
    p = Propriete.query.get_or_404(id)
    return jsonify({'id': p.id, 'adresse': p.adresse, 'statut': p.statut, 'prix': p.prix, 'description': p.description}), 200

# Dashboards APIs (mock logic)
@app.route('/api/dashboard/proprietaire', methods=['GET'])
@jwt_required()
def dashboard_prop():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    props = Propriete.query.filter_by(owner_id=current_user_id).all()
    
    # Total expected from active contracts
    contrats = Contrat.query.filter_by(proprietaire_id=current_user_id, statut='actif').all()
    loyers_percevoir = sum([c.montant_loyer for c in contrats])
    
    # Actually collected (validated) payments this month
    from datetime import datetime
    now = datetime.utcnow()
    # Simplified: sum of all 'paye' status payments from tenants of this owner in the current month
    tenant_ids = [c.locataire_id for c in contrats]
    payes = Paiement.query.filter(
        Paiement.user_id.in_(tenant_ids),
        Paiement.statut == 'paye',
        db.extract('month', Paiement.date) == now.month,
        db.extract('year', Paiement.date) == now.year
    ).all()
    loyers_encaisses = sum([p.montant for p in payes])
    
    return jsonify({
        'username': user.username,
        'total_props': len(props),
        'disponibles': len([p for p in props if p.statut == 'disponible']),
        'louees': len([p for p in props if p.statut == 'louee']),
        'loyers_percevoir': loyers_percevoir,
        'loyers_encaisses': loyers_encaisses
    }), 200

@app.route('/api/dashboard/locataire', methods=['GET'])
@jwt_required()
def dashboard_loc():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    # Find active contract
    contrat = Contrat.query.filter_by(locataire_id=current_user_id, statut='actif').first()
    if not contrat:
        return jsonify({'username': user.username, 'has_contract': False, 'loyer': 0}), 200
        
    return jsonify({
        'username': user.username,
        'has_contract': True,
        'loyer': contrat.montant_loyer,
        'propriete_id': contrat.propriete_id
    }), 200

# Users API
@app.route('/api/users/locataires', methods=['GET'])
@jwt_required()
def get_locataires():
    user = User.query.get(int(get_jwt_identity()))
    if user.role != 'proprietaire':
        return jsonify({'message': 'Unauthorized'}), 403
    locataires = User.query.filter_by(role='locataire').all()
    return jsonify([{'id': l.id, 'username': l.username, 'email': l.email} for l in locataires]), 200

# Paiements API
@app.route('/api/paiements', methods=['GET', 'POST'])
@jwt_required()
def manage_paiements():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if request.method == 'GET':
        if user.role == 'proprietaire':
            # Get all payments related to properties owned by this user
            props = Propriete.query.filter_by(owner_id=current_user_id).all()
            prop_ids = [p.id for p in props]
            # We need to link payments to properties. Currently Paiement model doesn't have propriete_id.
            # Let's assume we filter by the tenants linked to these properties if we had a better mapping,
            # or better: let's add propriete_id to Paiement if needed, but for now, let's just 
            # find payments where the user_id belongs to a tenant of this owner.
            contrats = Contrat.query.filter_by(proprietaire_id=current_user_id).all()
            tenant_ids = [c.locataire_id for c in contrats]
            paiements = Paiement.query.filter(Paiement.user_id.in_(tenant_ids)).all()
        else:
            paiements = Paiement.query.filter_by(user_id=current_user_id).all()
            
        res = []
        for p in paiements:
            u = User.query.get(p.user_id)
            res.append({
                'id': p.id,
                'montant': p.montant,
                'date': p.date.isoformat(),
                'statut': p.statut,
                'username': u.username if u else 'Inconnu',
                'description': p.description
            })
        return jsonify(res), 200
    
    # POST (Declare a payment)
    data = request.get_json()
    p = Paiement(
        user_id=current_user_id,
        montant=data['montant'],
        date=datetime.utcnow(),
        description=data.get('description', ''),
        statut='en_attente', # Default to pending for verification
        type=data.get('type', 'loyer')
    )
    db.session.add(p)
    db.session.commit()
    return jsonify({'message': 'Paiement déclaré avec succès', 'id': p.id}), 201

@app.route('/api/paiements/<int:id>', methods=['PATCH'])
@jwt_required()
def update_paiement(id):
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    if user.role != 'proprietaire':
        return jsonify({'message': 'Unauthorized'}), 403
        
    data = request.get_json()
    p = Paiement.query.get_or_404(id)
    
    # Verify owner actually owns the property related to this payment 
    # (Simplified: check if tenant of this payment has a contract with this owner)
    contrat = Contrat.query.filter_by(proprietaire_id=current_user_id, locataire_id=p.user_id).first()
    if not contrat:
        return jsonify({'message': 'Unauthorized (Not your tenant)'}), 403
        
    if 'statut' in data:
        p.statut = data['statut']
        
    db.session.commit()
    return jsonify({'message': 'Statut du paiement mis à jour'}), 200

# Messages API
@app.route('/api/messages', methods=['GET', 'POST'])
@jwt_required()
def manage_messages():
    current_user_id = int(get_jwt_identity())
    if request.method == 'GET':
        msgs = Message.query.filter((Message.sender_id == current_user_id) | (Message.receiver_id == current_user_id)).all()
        return jsonify([{'id': m.id, 'contenu': m.contenu, 'sender': m.sender_id, 'lu': m.lu} for m in msgs]), 200
    
    # POST
    data = request.get_json()
    m = Message(
        sender_id=current_user_id,
        receiver_id=data['receiver_id'],
        contenu=data['contenu']
    )
    db.session.add(m)
    db.session.commit()
    return jsonify({'message': 'Message envoyé'}), 201

@app.route('/api/messages/<int:id>/lu', methods=['PUT'])
@jwt_required()
def read_message(id):
    current_user_id = int(get_jwt_identity())
    msg = Message.query.get_or_404(id)
    if msg.receiver_id == current_user_id:
        msg.lu = True
        db.session.commit()
        return jsonify({'message': 'Lu'}), 200
    return jsonify({'message': 'Unauthorized'}), 403

# Contrats API
@app.route('/api/contrats', methods=['GET'])
@jwt_required()
def get_contrats():
    current_user_id = int(get_jwt_identity())
    contrats = Contrat.query.filter((Contrat.locataire_id == current_user_id) | (Contrat.proprietaire_id == current_user_id)).all()
    
    res = []
    for c in contrats:
        prop = Propriete.query.get(c.propriete_id)
        locataire = User.query.get(c.locataire_id)
        res.append({
            'id': c.id, 
            'loyer': c.montant_loyer, 
            'statut': c.statut,
            'date_debut': c.date_debut.isoformat() if c.date_debut else None,
            'date_fin': c.date_fin.isoformat() if c.date_fin else None,
            'propriete_adresse': prop.adresse if prop else 'Inconnu',
            'locataire_nom': locataire.username if locataire else 'Inconnu'
        })
    return jsonify(res), 200

@app.route('/api/contrats', methods=['POST'])
@jwt_required()
def create_contrat():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    if user.role != 'proprietaire':
        return jsonify({'message': 'Unauthorized'}), 403
        
    data = request.get_json()
    from datetime import datetime
    try:
        date_debut = datetime.strptime(data.get('date_debut'), '%Y-%m-%d').date()
        date_fin = datetime.strptime(data.get('date_fin'), '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    new_contrat = Contrat(
        locataire_id=data.get('locataire_id'),
        proprietaire_id=current_user_id,
        propriete_id=data.get('propriete_id'),
        date_debut=date_debut,
        date_fin=date_fin,
        montant_loyer=data.get('montant_loyer'),
        statut='actif'
    )
    db.session.add(new_contrat)
    
    prop = Propriete.query.get(data.get('propriete_id'))
    if prop:
        prop.statut = 'louee'
        
    db.session.commit()
    return jsonify({'message': 'Contrat créé avec succès', 'id': new_contrat.id}), 201

# Notifications API
@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    current_user_id = int(get_jwt_identity())
    nots = Notification.query.filter_by(user_id=current_user_id).all()
    return jsonify([{'id': n.id, 'titre': n.titre, 'message': n.message, 'lu': n.lu} for n in nots]), 200

@app.route('/api/notifications/<int:id>/lu', methods=['PUT'])
@jwt_required()
def read_notification(id):
    current_user_id = int(get_jwt_identity())
    n = Notification.query.get_or_404(id)
    if n.user_id == current_user_id:
        n.lu = True
        db.session.commit()
        return jsonify({'message': 'Lu'}), 200
    return jsonify({'message': 'Unauthorized'}), 403

if __name__ == '__main__':
    app.run(debug=True, port=5000)
