import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_socketio import SocketIO, join_room, emit
from functools import wraps
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
socketio = SocketIO(app, cors_allowed_origins="*")

with app.app_context():
    db.create_all()

@app.context_processor
def inject_user_role():
    return dict(current_user_role=session.get('user_role'))

def role_required(role):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = User.query.get(int(current_user_id))
            if not user or user.role != role:
                return jsonify({"message": f"Accès refusé. Rôle {role} requis."}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

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
        session['user_role'] = user.role
        redirect_url = '/dashboard-proprietaire' if user.role == 'proprietaire' else '/dashboard-locataire'
        return jsonify({
            'access_token': access_token, 
            'role': user.role, 
            'id': user.id,
            'redirect_url': redirect_url
        }), 200
        
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    session.pop('user_role', None)
    return jsonify({'message': 'Successfully logged out'}), 200

# Proprietes API
@app.route('/api/proprietes', methods=['GET'])
@jwt_required()
@role_required('proprietaire')
def get_proprietes():
    current_user_id = int(get_jwt_identity())
    props = Propriete.query.filter_by(owner_id=current_user_id, statut_archive=False).all()
    res = [{'id': p.id, 'adresse': p.adresse, 'statut': p.statut, 'prix': p.prix, 'superficie': p.superficie, 'pieces': p.nombre_pieces} for p in props]
    return jsonify(res), 200

@app.route('/api/proprietes', methods=['POST'])
@jwt_required()
@role_required('proprietaire')
def add_propriete():
    current_user_id = int(get_jwt_identity())
    
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
    return jsonify({'id': p.id, 'adresse': p.adresse, 'statut': p.statut, 'prix': p.prix, 'description': p.description, 'superficie': p.superficie, 'nombre_pieces': p.nombre_pieces}), 200

@app.route('/api/proprietes/<int:id>', methods=['PUT'])
@jwt_required()
@role_required('proprietaire')
def update_propriete(id):
    current_user_id = int(get_jwt_identity())
    p = Propriete.query.get_or_404(id)
    if p.owner_id != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    p.adresse = data.get('adresse', p.adresse)
    p.prix = data.get('prix', p.prix)
    p.superficie = data.get('superficie', p.superficie)
    p.nombre_pieces = data.get('nombre_pieces', p.nombre_pieces)
    p.description = data.get('description', p.description)
    
    db.session.commit()
    return jsonify({'message': 'Propriété mise à jour'}), 200

# Dashboards APIs (mock logic)
@app.route('/api/dashboard/proprietaire', methods=['GET'])
@jwt_required()
@role_required('proprietaire')
def dashboard_prop():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    props = Propriete.query.filter_by(owner_id=current_user_id, statut_archive=False).all()
    
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

@app.route('/api/proprietes/<int:id>/archive', methods=['PATCH'])
@jwt_required()
@role_required('proprietaire')
def archive_propriete(id):
    current_user_id = int(get_jwt_identity())
    p = Propriete.query.get_or_404(id)
    if p.owner_id != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403
    p.statut_archive = True
    db.session.commit()
    return jsonify({'message': 'Propriété archivée avec succès'}), 200

@app.route('/api/dashboard/locataire', methods=['GET'])
@jwt_required()
@role_required('locataire')
def dashboard_loc():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    # Find active contract
    contrat = Contrat.query.filter_by(locataire_id=current_user_id, statut='actif').first()
    if not contrat:
        return jsonify({'username': user.username, 'has_contract': False, 'loyer': 0, 'payment_status': 'none'}), 200

    # Check if a payment exists for the current month
    now = datetime.utcnow()
    existing_payment = Paiement.query.filter(
        Paiement.user_id == current_user_id,
        db.extract('month', Paiement.date) == now.month,
        db.extract('year', Paiement.date) == now.year
    ).order_by(Paiement.date.desc()).first()

    if existing_payment and existing_payment.statut in ('paye', 'effectue'):
        payment_status = 'paye'
    elif existing_payment and existing_payment.statut == 'en_attente':
        payment_status = 'en_attente'
    else:
        payment_status = 'none'

    return jsonify({
        'username': user.username,
        'has_contract': True,
        'loyer': contrat.montant_loyer,
        'propriete_id': contrat.propriete_id,
        'payment_status': payment_status
    }), 200

# Users API
@app.route('/api/users/locataires', methods=['GET'])
@jwt_required()
@role_required('proprietaire')
def get_locataires():
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
    # Allow direct status override for simulated payments (projet ecole - no real payment gateway)
    requested_statut = data.get('statut', 'en_attente')
    # Only 'paye' or 'en_attente' are valid on creation
    if requested_statut not in ('paye', 'en_attente', 'effectue'):
        requested_statut = 'en_attente'

    p = Paiement(
        user_id=current_user_id,
        montant=data['montant'],
        date=datetime.utcnow(),
        description=data.get('description', ''),
        statut=requested_statut,
        type=data.get('type', 'loyer')
    )
    db.session.add(p)
    db.session.commit()

    # Notification for owner
    contrat = Contrat.query.filter_by(locataire_id=current_user_id, statut='actif').first()
    if contrat:
        tenant = User.query.get(current_user_id)
        notif = Notification(
            user_id=contrat.proprietaire_id,
            titre='Paiement déclaré',
            message=f'{tenant.username} a déclaré un paiement de {p.montant}fcfa',
            type='payment'
        )
        db.session.add(notif)
        db.session.commit()
        socketio.emit('new_notification', {
            'titre': notif.titre,
            'message': notif.message,
            'type': 'payment'
        }, room=f'user_{contrat.proprietaire_id}')

    return jsonify({'message': 'Paiement créé'}), 201

@app.route('/api/paiements/export', methods=['GET'])
@jwt_required()
@role_required('proprietaire')
def export_paiements():
    current_user_id = int(get_jwt_identity())
    from flask import Response
    import csv
    import io
    
    # Get all payments for tenants of this owner
    contrats = Contrat.query.filter_by(proprietaire_id=current_user_id).all()
    tenant_ids = [c.locataire_id for c in contrats]
    paiements = Paiement.query.filter(Paiement.user_id.in_(tenant_ids)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Locataire', 'Montant', 'Statut', 'Description'])
    for p in paiements:
        u = User.query.get(p.user_id)
        writer.writerow([
            p.date.strftime('%Y-%m-%d %H:%M:%S'),
            u.username if u else 'Inconnu',
            f"{p.montant:.2f}",
            p.statut,
            p.description
        ])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=paiements_immogestion.csv"}
    )

@app.route('/api/paiements/<int:id>', methods=['PATCH'])
@jwt_required()
def update_paiement(id):
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)

    data = request.get_json()
    p = Paiement.query.get_or_404(id)

    if user.role == 'proprietaire':
        # Verify owner actually owns the property related to this payment
        contrat = Contrat.query.filter_by(proprietaire_id=current_user_id, locataire_id=p.user_id).first()
        if not contrat:
            return jsonify({'message': 'Unauthorized (Not your tenant)'}), 403
    elif user.role == 'locataire':
        # Tenant can only update their OWN payment (e.g., for simulation)
        if p.user_id != current_user_id:
            return jsonify({'message': 'Unauthorized (Not your payment)'}), 403
    else:
        return jsonify({'message': 'Unauthorized'}), 403

    if 'statut' in data:
        p.statut = data['statut']

    db.session.commit()

    # Notification for tenant
    notif = Notification(
        user_id=p.user_id,
        titre='Statut Paiement' if p.statut != 'paye' else 'Paiement Validé',
        message=f'Votre paiement de {p.montant}fcfa a été mis à jour: {p.statut}',
        type='payment'
    )
    db.session.add(notif)
    db.session.commit()

    socketio.emit('new_notification', {
        'titre': notif.titre,
        'message': notif.message,
        'type': 'payment'
    }, room=f'user_{p.user_id}')

    return jsonify({'message': 'Statut du paiement mis à jour'}), 200

@app.route('/api/paiements/<int:id>/quittance', methods=['GET'])
@jwt_required()
def generate_quittance(id):
    current_user_id = int(get_jwt_identity())
    p = Paiement.query.get_or_404(id)
    
    # Security: check if user is the tenant or the owner
    if p.user_id != current_user_id:
        # Check if current user is owner of the related property
        contrat = Contrat.query.filter_by(locataire_id=p.user_id, statut='actif').first()
        if not contrat or contrat.proprietaire_id != current_user_id:
            return jsonify({'message': 'Unauthorized'}), 403
            
    if p.statut != 'paye':
        return jsonify({'message': 'Quittance non disponible pour un paiement non validé'}), 400
        
    tenant = User.query.get(p.user_id)
    # Get property details from contract
    contrat = Contrat.query.filter_by(locataire_id=p.user_id, statut='actif').first()
    prop_addr = 'Inconnue'
    if contrat:
        prop = Propriete.query.get(contrat.propriete_id)
        if prop: prop_addr = prop.adresse

    from flask import render_template_string
    template = """
    <html>
    <head><style>body { font-family: sans-serif; padding: 40px; } .receipt { border: 2px solid #000; padding: 20px; }</style></head>
    <body>
        <div class="receipt">
            <h1>QUITTANCE DE LOYER</h1>
            <p><strong>Date :</strong> {{ date }}</p>
            <p><strong>Locataire :</strong> {{ tenant }}</p>
            <p><strong>Propriété :</strong> {{ propriete }}</p>
            <p><strong>Montant :</strong> {{ montant }} fcfa</p>
            <p><strong>Statut :</strong> PAYÉ</p>
            <hr>
            <p>Merci pour votre confiance.</p>
        </div>
    </body>
    </html>
    """
    return render_template_string(template, 
                                 date=p.date.strftime('%d/%m/%Y'),
                                 tenant=tenant.username,
                                 propriete=prop_addr,
                                 montant=p.montant)

# Messages API
@app.route('/api/messages', methods=['GET', 'POST'])
@jwt_required()
def manage_messages():
    current_user_id = int(get_jwt_identity())
    if request.method == 'GET':
        contact_id = request.args.get('contact_id', type=int)
        if contact_id:
            msgs = Message.query.filter(
                ((Message.sender_id == current_user_id) & (Message.receiver_id == contact_id)) |
                ((Message.sender_id == contact_id) & (Message.receiver_id == current_user_id))
            ).order_by(Message.date.asc()).all()
        else:
            msgs = Message.query.filter((Message.sender_id == current_user_id) | (Message.receiver_id == current_user_id)).all()
        return jsonify([{'id': m.id, 'contenu': m.contenu, 'sender': m.sender_id, 'lu': m.lu, 'date': m.date.isoformat()} for m in msgs]), 200
    
    # POST
    data = request.get_json()
    m = Message(
        sender_id=current_user_id,
        receiver_id=data['receiver_id'],
        contenu=data['contenu']
    )
    db.session.add(m)
    db.session.commit()

    # Emit real-time event to the receiver's personal room
    sender = User.query.get(current_user_id)
    
    # Create persistent notification
    notif = Notification(
        user_id=data['receiver_id'],
        titre='Nouveau message',
        message=f'Message de {sender.username}: {m.contenu[:50]}...',
        type='chat'
    )
    db.session.add(notif)
    db.session.commit()

    socketio.emit('new_message', {
        'id': m.id,
        'sender': m.sender_id,
        'sender_name': sender.username if sender else 'Inconnu',
        'contenu': m.contenu,
        'date': m.date.isoformat()
    }, room=f'user_{data["receiver_id"]}')

    # Also emit notification alert
    socketio.emit('new_notification', {
        'titre': notif.titre,
        'message': notif.message,
        'type': 'chat'
    }, room=f'user_{data["receiver_id"]}')

    return jsonify({'message': 'Message envoyé'}), 201

@app.route('/api/messages/contacts', methods=['GET'])
@jwt_required()
def get_contacts():
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    contacts = []
    if user.role == 'proprietaire':
        contrats = Contrat.query.filter_by(proprietaire_id=current_user_id).all()
        tenant_ids = list(set([c.locataire_id for c in contrats]))
        tenants = User.query.filter(User.id.in_(tenant_ids)).all()
        contacts = [{'id': t.id, 'username': t.username} for t in tenants]
    else:
        # Tenant sees their owner through an active contract
        contrat = Contrat.query.filter_by(locataire_id=current_user_id, statut='actif').first()
        if contrat:
            owner = User.query.get(contrat.proprietaire_id)
            if owner:
                contacts = [{'id': owner.id, 'username': owner.username}]
                
    return jsonify(contacts), 200

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
@role_required('proprietaire')
def create_contrat():
    current_user_id = int(get_jwt_identity())
        
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

@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    current_user_id = int(get_jwt_identity())
    notifs = Notification.query.filter_by(user_id=current_user_id).order_by(Notification.date.desc()).all()
    return jsonify([{
        'id': n.id,
        'titre': n.titre,
        'message': n.message,
        'type': n.type,
        'lu': n.lu,
        'date': n.date.isoformat()
    } for n in notifs]), 200

@app.route('/api/notifications/mark-read', methods=['PUT'])
@jwt_required()
def mark_notifications_read():
    current_user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=current_user_id, lu=False).update({Notification.lu: True})
    db.session.commit()
    return jsonify({'message': 'Notifications marquées comme lues'}), 200

# Automation & Cron
def check_upcoming_rents_and_notify():
    now = datetime.utcnow()
    # If standard rent day is 5th, remind between 1st and 5th
    if 1 <= now.day <= 5:
        contrats = Contrat.query.filter_by(statut='actif').all()
        for c in contrats:
            # Check if payment exists for this month and year
            payment_exists = Paiement.query.filter(
                Paiement.user_id == c.locataire_id,
                db.extract('month', Paiement.date) == now.month,
                db.extract('year', Paiement.date) == now.year
            ).first()
            
            if not payment_exists:
                # Add notification
                msg = f"Votre loyer de {c.montant_loyer}fcfa pour {now.strftime('%B')} est attendu avant le 5 du mois."
                notif = Notification(
                    user_id=c.locataire_id,
                    titre='Rappel de loyer',
                    message=msg
                )
                db.session.add(notif)
                # Emit real-time notification to the user
                socketio.emit('new_notification', {
                    'titre': notif.titre,
                    'message': notif.message
                }, room=f'user_{c.locataire_id}')
        db.session.commit()
        return True
    return False

@app.route('/api/trigger-cron', methods=['GET'])
def trigger_cron():
    done = check_upcoming_rents_and_notify()
    return jsonify({'message': 'Cron triggered', 'notifications_sent': done}), 200

# ==========================================
# WebSocket Events
# ==========================================

@socketio.on('connect')
def handle_connect():
    """When a client connects via socket.io."""
    pass

@socketio.on('join')
def handle_join(data):
    """Client joins its personal room (room = 'user_{id}').
    data = { 'user_id': 3 }
    """
    room = f"user_{data.get('user_id')}"
    join_room(room)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
