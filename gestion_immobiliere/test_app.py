import unittest
from app import app
from models import db, User, Propriete

class BasicTestCase(unittest.TestCase):

    def setUp(self):
        # Configure app for testing
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['WTF_CSRF_ENABLED'] = False
        
        # Create a test client
        self.client = app.test_client()
        
        # Initialize context and create tables
        with app.app_context():
            db.create_all()
            
            # Setup initial user
            user = User(username='testowner', email='owner@test.com', role='proprietaire')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_index_page(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)

    def test_dashboard_locataire_page(self):
        response = self.client.get('/dashboard-locataire')
        self.assertEqual(response.status_code, 200)

    def test_user_registration(self):
        response = self.client.post('/api/register', json={
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'mypassword',
            'role': 'locataire'
        })
        self.assertEqual(response.status_code, 201)

    def test_user_login(self):
        response = self.client.post('/api/login', json={
            'username': 'testowner',
            'password': 'password123'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('access_token'.encode(), response.data)

    def test_protected_route_without_token(self):
        response = self.client.get('/api/dashboard/proprietaire')
        # Expect 401 Unauthorized since no JWT is provided
        self.assertEqual(response.status_code, 401)

if __name__ == '__main__':
    unittest.main()
