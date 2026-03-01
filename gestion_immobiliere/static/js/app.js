document.addEventListener('DOMContentLoaded', () => {

    // --- AUTHENTICATION LOGIC ---

    // 1. LOGIN PAGE (login.html)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorText = document.getElementById('login-error');
            errorText.classList.add('hidden');

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                errorText.textContent = "Veuillez remplir les champs obligatoires.";
                errorText.classList.remove('hidden');
                return;
            }

            try {
                // Here we use email as username since the backend model expects a username at login
                // Assuming username == email for simplicity of the UI design, or we adjust the fetch.
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: email, password: password })
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('jwt_token', data.access_token);
                    localStorage.setItem('user_role', data.role);
                    localStorage.setItem('user_id', data.id);

                    if (data.role === 'proprietaire' || data.role === 'owner') {
                        window.location.href = '/dashboard-proprietaire';
                    } else {
                        window.location.href = '/dashboard-locataire';
                    }
                } else {
                    errorText.textContent = data.message || "Erreur de connexion";
                    errorText.classList.remove('hidden');
                }
            } catch (err) {
                errorText.textContent = "Erreur de réseau";
                errorText.classList.remove('hidden');
            }
        });
    }

    // 2. REGISTER PAGE (register.html)
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const errorText = document.getElementById('register-error');
            errorText.classList.add('hidden');

            const fullname = document.getElementById('fullname').value;
            const email = document.getElementById('reg-email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('reg-password').value;

            const roleInput = document.querySelector('input[name="role"]:checked');
            // 'owner' or 'tenant' based on the new HTML design structure
            let role = roleInput ? roleInput.value : 'tenant';
            if (role === 'owner') role = 'proprietaire';
            if (role === 'tenant') role = 'locataire';

            if (!email || !password || !fullname) {
                errorText.textContent = "Veuillez remplir tous les champs.";
                errorText.classList.remove('hidden');
                return;
            }

            try {
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Backend expects username, we pass fullname
                    body: JSON.stringify({ username: fullname, password: password, email: email, role: role })
                });
                const data = await res.json();

                if (res.ok) {
                    // Auto-login
                    const loginRes = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: fullname, password: password })
                    });
                    const loginData = await loginRes.json();

                    if (loginRes.ok) {
                        localStorage.setItem('jwt_token', loginData.access_token);
                        localStorage.setItem('user_role', loginData.role);
                        localStorage.setItem('user_id', loginData.id);
                        if (loginData.role === 'proprietaire') {
                            window.location.href = '/dashboard-proprietaire';
                        } else {
                            window.location.href = '/dashboard-locataire';
                        }
                    }
                } else {
                    errorText.textContent = data.message || "Erreur lors de l'inscription";
                    errorText.classList.remove('hidden');
                }
            } catch (err) {
                errorText.textContent = "Erreur de réseau";
                errorText.classList.remove('hidden');
            }
        });
    }

    // Radio button logic for visual selection on register page
    const roleLabels = document.querySelectorAll('label:has(input[name="role"])');
    roleLabels.forEach(label => {
        label.addEventListener('click', () => {
            roleLabels.forEach(l => {
                l.classList.remove('border-primary');
                l.classList.add('border-gray-200', 'dark:border-gray-800');
                const checkIcon = l.querySelector('.absolute');
                if (checkIcon) checkIcon.remove();
            });
            label.classList.remove('border-gray-200', 'dark:border-gray-800');
            label.classList.add('border-primary');
            label.innerHTML += `<div class="absolute top-2 right-2"><span class="material-symbols-outlined text-primary text-xl">check_circle</span></div>`;
        });
    });

    // --- DASHBOARD LOGIC & LOGOUT ---

    const logoutBtns = document.querySelectorAll('#logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_role');
            window.location.href = '/login';
        });
    });

    const token = localStorage.getItem('jwt_token');

    if (window.location.pathname === '/dashboard-proprietaire' && token) {
        fetch('/api/dashboard/proprietaire', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.username) {
                    const nameEl = document.getElementById('owner-name');
                    if (nameEl) nameEl.textContent = `Bonjour ${data.username} !`;

                    const incomeEl = document.getElementById('owner-income');
                    if (incomeEl) incomeEl.textContent = `€${data.loyers_percevoir.toFixed(2)}`;

                    const collectedEl = document.getElementById('owner-collected');
                    if (collectedEl) collectedEl.textContent = `€${data.loyers_encaisses.toFixed(2)}`;

                    const occupiedEl = document.getElementById('owner-occupied');
                    if (occupiedEl) occupiedEl.textContent = `${data.louees} / ${data.total_props}`;

                    // Alert logic: also fetch pending payments to show count
                    fetch('/api/paiements', { headers: { 'Authorization': `Bearer ${token}` } })
                        .then(pr => pr.json())
                        .then(paiements => {
                            const pendingCount = paiements.filter(p => p.statut === 'en_attente').length;
                            const alertsEl = document.getElementById('owner-alerts');
                            if (alertsEl) alertsEl.textContent = pendingCount;
                        });
                }
            })
            .catch(err => {
                console.error(err);
                window.location.href = '/login';
            });
    }

    if (window.location.pathname === '/dashboard-locataire' && token) {
        fetch('/api/dashboard/locataire', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.username) {
                    const nameEl = document.getElementById('tenant-name');
                    if (nameEl) nameEl.textContent = `Bonjour ${data.username} !`;

                    const rentEl = document.getElementById('tenant-next-rent');
                    if (rentEl) {
                        if (data.has_contract) {
                            rentEl.textContent = `€${data.loyer ? data.loyer.toFixed(2) : '0.00'}`;
                        } else {
                            rentEl.textContent = 'Aucun bail actif';
                            rentEl.classList.add('text-sm');
                        }
                    }
                }
            })
            .catch(err => {
                console.error(err);
                window.location.href = '/login';
            });
    }

    if (window.location.pathname === '/ajouter-propriete' && token) {
        const loadProperties = () => {
            fetch('/api/proprietes', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(props => {
                    const listEl = document.getElementById('properties-list');
                    if (!listEl) return;
                    listEl.innerHTML = '';
                    if (props.length === 0) {
                        listEl.innerHTML = '<p class="text-sm text-gray-500">Aucun bien enregistré pour le moment.</p>';
                        return;
                    }
                    props.forEach(p => {
                        listEl.innerHTML += `
                        <div class="flex flex-col rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 class="font-semibold text-gray-900 dark:text-white">${p.adresse}</h3>
                            <div class="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>${p.nombre_pieces || 0} pièces, ${p.superficie || 0} m²</span>
                                <span class="font-bold text-primary">€${p.prix || 0}</span>
                            </div>
                        </div>
                    `;
                    });
                })
                .catch(console.error);
        };

        // Load immediately
        loadProperties();

        // Handle Add Property Form
        const addBtn = document.getElementById('add-property-btn');
        if (addBtn) {
            addBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const btn = e.target;
                btn.disabled = true;
                btn.classList.add('opacity-50');

                const street = document.getElementById('street').value;
                const addr2 = document.getElementById('address-2').value;
                const postal = document.getElementById('postal-code').value;
                const city = document.getElementById('city').value;
                const country = document.getElementById('country').value;

                const prix = document.getElementById('prix').value;
                const superficie = document.getElementById('superficie').value;
                const pieces = document.getElementById('pieces').value;

                const errorEl = document.getElementById('add-error');
                const successEl = document.getElementById('add-success');
                errorEl.classList.add('hidden');
                successEl.classList.add('hidden');

                if (!street || !city || !prix) {
                    errorEl.textContent = 'La rue, la ville et le prix sont obligatoires.';
                    errorEl.classList.remove('hidden');
                    btn.disabled = false;
                    btn.classList.remove('opacity-50');
                    return;
                }

                const fullAddress = `${street} ${addr2 ? addr2 + ' ' : ''}${postal} ${city}, ${country}`;

                try {
                    const res = await fetch('/api/proprietes', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            adresse: fullAddress,
                            prix: parseFloat(prix),
                            superficie: parseFloat(superficie) || 0,
                            nombre_pieces: parseInt(pieces) || 0,
                            description: ''
                        })
                    });

                    if (res.ok) {
                        successEl.textContent = 'Propriété ajoutée avec succès !';
                        successEl.classList.remove('hidden');

                        // Clear inputs
                        document.getElementById('street').value = '';
                        document.getElementById('address-2').value = '';
                        document.getElementById('prix').value = '';
                        document.getElementById('superficie').value = '';
                        document.getElementById('pieces').value = '';

                        // Reload list
                        loadProperties();
                    } else {
                        const data = await res.json();
                        errorEl.textContent = data.message || 'Erreur lors de l’ajout.';
                        errorEl.classList.remove('hidden');
                    }
                } catch (err) {
                    errorEl.textContent = 'Erreur réseau.';
                    errorEl.classList.remove('hidden');
                } finally {
                    btn.disabled = false;
                    btn.classList.remove('opacity-50');
                }
            });
        }
    }

    // --- PAIEMENTS LOGIC ---
    if (window.location.pathname === '/paiements' && token) {
        const myRole = localStorage.getItem('user_role');
        const listEl = document.getElementById('payments-list');
        const showDeclareBtn = document.getElementById('show-declare-btn');
        const declareContainer = document.getElementById('declaration-form-container');
        const cancelDeclareBtn = document.getElementById('cancel-declare-btn');
        const declareForm = document.getElementById('payment-declaration-form');

        // Navigation Adjustment
        const navHome = document.getElementById('nav-home');
        const navBiens = document.getElementById('nav-biens');
        const navLocs = document.getElementById('nav-locataires');

        if (myRole === 'proprietaire') {
            if (navHome) navHome.href = '/dashboard-proprietaire';
        } else {
            if (navHome) navHome.href = '/dashboard-locataire';
            if (navBiens) navBiens.classList.add('hidden');
            if (navLocs) navLocs.classList.add('hidden');
            if (showDeclareBtn) showDeclareBtn.classList.remove('hidden');
        }

        const loadPaiements = () => {
            fetch('/api/paiements', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    if (!listEl) return;
                    listEl.innerHTML = '';
                    if (data.length === 0) {
                        listEl.innerHTML = '<p class="text-sm text-center text-gray-500 mt-4">Aucun paiement trouvé.</p>';
                        return;
                    }
                    data.sort((a, b) => new Date(b.date) - new Date(a.date));
                    data.forEach(p => {
                        const dateObj = new Date(p.date);
                        let color = 'gray';
                        let statusLabel = p.statut;

                        if (p.statut === 'paye' || p.statut === 'effectue') { color = 'green'; statusLabel = 'Payé'; }
                        else if (p.statut === 'en_retard' || p.statut === 'echoue') { color = 'red'; statusLabel = 'Retard'; }
                        else if (p.statut === 'en_attente') { color = 'yellow'; statusLabel = 'En attente'; }
                        else if (p.statut === 'refuse') { color = 'red'; statusLabel = 'Refusé'; }

                        let actionsHtml = '';
                        if (myRole === 'proprietaire' && p.statut === 'en_attente') {
                            actionsHtml = `
                                <div class="flex gap-2 mt-3">
                                    <button onclick="updatePaiementStatus(${p.id}, 'paye')" class="flex-1 py-2 bg-green-500 text-white text-xs font-bold rounded-lg shadow-sm">Valider</button>
                                    <button onclick="updatePaiementStatus(${p.id}, 'refuse')" class="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm">Refuser</button>
                                </div>
                            `;
                        }

                        listEl.innerHTML += `
                            <div class="flex flex-col gap-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-[#111418] dark:text-white text-base font-bold leading-normal">€${p.montant.toFixed(2)}</p>
                                        <p class="text-[10px] text-gray-400 uppercase font-bold">${p.username || ''}</p>
                                    </div>
                                    <div class="flex items-center gap-2 rounded-full px-3 py-1 bg-${color}-100 dark:bg-${color}-900/50">
                                        <div class="size-2 rounded-full bg-${color}-500"></div>
                                        <p class="text-${color}-700 dark:text-${color}-300 text-xs font-medium">${statusLabel}</p>
                                    </div>
                                </div>
                                <div class="flex justify-between items-center">
                                    <p class="text-xs text-gray-500">${p.description || 'Paiement loyer'}</p>
                                    <p class="text-[10px] text-gray-400">${dateObj.toLocaleDateString()}</p>
                                </div>
                                ${actionsHtml}
                            </div>
                        `;
                    });
                })
                .catch(console.error);
        };

        window.updatePaiementStatus = async (id, status) => {
            try {
                const res = await fetch(`/api/paiements/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ statut: status })
                });
                if (res.ok) loadPaiements();
            } catch (err) {
                console.error('Failed to update payment', err);
            }
        };

        loadPaiements();

        // Tenant Declaration Actions
        if (showDeclareBtn) {
            showDeclareBtn.addEventListener('click', () => {
                declareContainer.classList.toggle('hidden');
            });
        }
        if (cancelDeclareBtn) {
            cancelDeclareBtn.addEventListener('click', () => {
                declareContainer.classList.add('hidden');
            });
        }
        if (declareForm) {
            declareForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const amount = document.getElementById('pay-amount').value;
                const desc = document.getElementById('pay-desc').value;

                try {
                    const res = await fetch('/api/paiements', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ montant: parseFloat(amount), description: desc })
                    });
                    if (res.ok) {
                        declareContainer.classList.add('hidden');
                        declareForm.reset();
                        loadPaiements();
                    }
                } catch (err) {
                    console.error('Failed to declare payment', err);
                }
            });
        }
        // Receipt Upload Simulation
        const uploadBtn = document.getElementById('upload-receipt-btn');
        const fileInput = document.getElementById('hidden-file-input');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    alert('Quittance / Reçu envoyé avec succès (Simulation)');
                    fileInput.value = ''; // Reset
                }
            });
        }
    }

    // --- MESSAGES LOGIC ---
    if (window.location.pathname === '/messages' && token) {
        const myUserId = parseInt(localStorage.getItem('user_id') || '0', 10);
        const myRole = localStorage.getItem('user_role');
        const defaultReceiver = myRole === 'proprietaire' ? 2 : 1;

        const loadMessages = () => {
            fetch('/api/messages', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    const chatEl = document.getElementById('chat-messages');
                    if (!chatEl) return;
                    chatEl.innerHTML = '';
                    if (data.length === 0) {
                        chatEl.innerHTML = '<p class="text-sm text-center text-gray-500 mt-4">Aucun message.</p>';
                        return;
                    }
                    data.sort((a, b) => new Date(a.date) - new Date(b.date));
                    data.forEach(m => {
                        const isMine = m.sender === myUserId;
                        if (isMine) {
                            chatEl.innerHTML += `
                            <div class="flex items-end gap-3 justify-end">
                                <div class="flex flex-1 flex-col gap-1.5 items-end">
                                    <div class="text-base font-normal leading-normal flex max-w-xs rounded-lg rounded-br-none px-4 py-2.5 bg-primary text-white shadow-sm">
                                        ${m.contenu}
                                    </div>
                                </div>
                            </div>`;
                        } else {
                            chatEl.innerHTML += `
                            <div class="flex items-end gap-3">
                                <div class="flex flex-1 flex-col gap-1.5 items-start">
                                    <div class="text-base font-normal leading-normal flex max-w-xs rounded-lg rounded-bl-none px-4 py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm">
                                        ${m.contenu}
                                    </div>
                                </div>
                            </div>`;
                        }
                    });
                    chatEl.scrollTop = chatEl.scrollHeight;
                })
                .catch(console.error);
        };

        loadMessages();

        const sendBtn = document.getElementById('send-message-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', async () => {
                const input = document.getElementById('message-input');
                const text = input.value.trim();
                if (!text) return;
                input.value = '';

                try {
                    await fetch('/api/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ contenu: text, receiver_id: defaultReceiver })
                    });
                    loadMessages();
                } catch (err) {
                    console.error('Failed to send message', err);
                }
            });
        }
    }

    // --- CONTRATS LOGIC ---
    if (window.location.pathname === '/contrat' && token) {
        const propSelect = document.getElementById('propriete-select');
        const locSelect = document.getElementById('locataire-select');
        const contractList = document.getElementById('contrats-list');
        const contractForm = document.getElementById('create-contract-form');
        const errorEl = document.getElementById('contract-error');
        const successEl = document.getElementById('contract-success');

        // 1. Fetch Properties
        fetch('/api/proprietes', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(props => {
                if (!propSelect) return;
                propSelect.innerHTML = '<option value="" disabled selected>Choisir un bien</option>';
                // Only show properties that are NOT already rented? 
                // For now show all, or filter if backend provides status.
                props.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.adresse;
                    propSelect.appendChild(opt);
                });
            });

        // 2. Fetch Tenants
        fetch('/api/users/locataires', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(users => {
                if (!locSelect) return;
                locSelect.innerHTML = '<option value="" disabled selected>Choisir un locataire</option>';
                users.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u.id;
                    opt.textContent = u.username + ' (' + u.email + ')';
                    locSelect.appendChild(opt);
                });
            });

        // 3. Load existing contracts
        const loadContracts = () => {
            fetch('/api/contrats', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    if (!contractList) return;
                    contractList.innerHTML = '';
                    if (data.length === 0) {
                        contractList.innerHTML = '<p class="text-sm text-gray-500">Aucun contrat actif.</p>';
                        return;
                    }
                    data.sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut));
                    data.forEach(c => {
                        contractList.innerHTML += `
                            <div class="flex flex-col gap-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="font-bold text-slate-800 dark:text-white">${c.propriete_adresse}</p>
                                        <p class="text-xs text-slate-500 dark:text-slate-400">Locataire: ${c.locataire_nom}</p>
                                    </div>
                                    <div class="px-2 py-1 rounded-full text-[10px] font-bold uppercase ${c.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
                                        ${c.statut}
                                    </div>
                                </div>
                                <div class="flex justify-between items-center mt-2">
                                    <p class="text-sm font-semibold text-primary">€${c.loyer}/mois</p>
                                    <p class="text-xs text-slate-400">Du ${new Date(c.date_debut).toLocaleDateString()} au ${new Date(c.date_fin).toLocaleDateString()}</p>
                                </div>
                            </div>
                        `;
                    });
                });
        };

        loadContracts();

        // 4. Handle form submission
        if (contractForm) {
            contractForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                errorEl.classList.add('hidden');
                successEl.classList.add('hidden');

                const propId = propSelect.value;
                const locId = locSelect.value;
                const rent = document.getElementById('rent-amount').value;
                const start = document.getElementById('start-date').value;
                const end = document.getElementById('end-date').value;

                if (!propId || !locId || !rent || !start || !end) {
                    errorEl.textContent = "Tous les champs sont obligatoires.";
                    errorEl.classList.remove('hidden');
                    return;
                }

                try {
                    const res = await fetch('/api/contrats', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            propriete_id: parseInt(propId),
                            locataire_id: parseInt(locId),
                            montant_loyer: parseFloat(rent),
                            date_debut: start,
                            date_fin: end
                        })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        successEl.textContent = data.message;
                        successEl.classList.remove('hidden');
                        contractForm.reset();
                        loadContracts();
                    } else {
                        errorEl.textContent = data.message;
                        errorEl.classList.remove('hidden');
                    }
                } catch (err) {
                    errorEl.textContent = "Erreur réseau.";
                    errorEl.classList.remove('hidden');
                }
            });
        }
    }

});
