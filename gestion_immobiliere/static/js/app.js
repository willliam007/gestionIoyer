document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt_token');
    const userRole = localStorage.getItem('user_role');

    // --- 0. UI ROUTE GUARDS ---
    const publicPages = ['/', '/login', '/register', '/accueil'];
    const currentPath = window.location.pathname;

    if (!token && !publicPages.includes(currentPath) && currentPath !== '/') {
        // Redirect to login if trying to access a protected page without a token
        window.location.href = '/login';
        return;
    }

    // --- 0.5 LOGOUT LOGIC ---
    const logoutButtons = document.querySelectorAll('#logout-btn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_role');
            window.location.href = '/login';
        });
    });

    // --- NAVIGATION INITIALIZATION ---
    const bottomNav = document.getElementById('bottom-nav');
    if (userRole && bottomNav) {
        bottomNav.classList.remove('hidden');
        const navHome = document.getElementById('nav-home');
        const navBiens = document.getElementById('nav-biens');
        const navLocs = document.getElementById('nav-locataires');

        if (navHome) {
            navHome.href = (userRole === 'proprietaire') ? '/dashboard-proprietaire' : '/dashboard-locataire';
        }

        if (userRole === 'proprietaire') {
            if (navBiens) navBiens.classList.remove('hidden');
            if (navLocs) navLocs.classList.remove('hidden');
        }
    }

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

                    if (data.redirect_url) {
                        window.location.href = data.redirect_url;
                    } else if (data.role === 'proprietaire') {
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

                    // Fetch upcoming rents (active contracts)
                    fetch('/api/proprietes', { headers: { 'Authorization': `Bearer ${token}` } })
                        .then(res => res.json())
                        .then(props => {
                            const rentListEl = document.getElementById('owner-upcoming-rents');
                            if (!rentListEl) return;
                            rentListEl.innerHTML = '';
                            if (props.length === 0) {
                                rentListEl.innerHTML = '<p class="text-sm text-center text-gray-500 py-4 italic">Aucun bien actif.</p>';
                                return;
                            }
                            props.forEach(p => {
                                rentListEl.innerHTML += `
                                    <div class="flex min-h-[72px] items-center justify-between gap-4 rounded-xl bg-white dark:bg-gray-800 p-3 shadow-sm border border-gray-100 dark:border-gray-700">
                                        <div class="flex items-center gap-4">
                                            <div class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-white">
                                                <span class="material-symbols-outlined">house</span>
                                            </div>
                                            <div class="flex flex-col justify-center">
                                                <p class="text-base font-medium leading-normal text-[#111418] dark:text-gray-100 line-clamp-1">${p.adresse}</p>
                                                <p class="text-[10px] font-normal text-gray-400 capitalize">${p.statut}</p>
                                            </div>
                                        </div>
                                        <div class="shrink-0 text-right">
                                            <p class="text-base font-semibold leading-normal text-primary">€${p.prix.toFixed(2)}</p>
                                            <p class="text-[10px] text-gray-400">Mensuel</p>
                                        </div>
                                    </div>
                                `;
                            });
                        });

                    // Fetch alerts (notifications)
                    fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
                        .then(res => res.json())
                        .then(notifs => {
                            const alertListEl = document.querySelector('#owner-alerts-list');
                            if (!alertListEl) return;
                            alertListEl.innerHTML = '';

                            if (notifs.length === 0) {
                                alertListEl.innerHTML = '<p class="text-sm text-gray-500 italic p-4 text-center">Aucune alerte pour le moment.</p>';
                                return;
                            }

                            // Show only last 5
                            notifs.slice(0, 5).forEach(n => {
                                const isUnread = !n.lu;
                                alertListEl.innerHTML += `
                                    <div class="flex items-center gap-4 rounded-xl ${isUnread ? 'bg-primary/5 border-primary/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'} p-3 border shadow-sm transition-all">
                                        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg ${n.type === 'chat' ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}">
                                            <span class="material-symbols-outlined text-xl">${n.type === 'chat' ? 'chat' : 'notifications'}</span>
                                        </div>
                                        <div class="flex flex-col justify-center flex-1">
                                            <p class="text-sm font-bold text-slate-800 dark:text-gray-100">${n.titre}</p>
                                            <p class="text-xs text-gray-500 line-clamp-1">${n.message}</p>
                                        </div>
                                        <p class="text-[10px] text-gray-400 font-medium">${new Date(n.date).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                `;
                            });
                        });
                }
            })
            .catch(err => {
                console.error(err);
                window.location.href = '/login';
            });
    }

    if (window.location.pathname === '/dashboard-locataire' && token) {
        let currentRentAmount = 0;
        fetch('/api/dashboard/locataire', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.username) {
                    const nameEl = document.getElementById('tenant-name');
                    if (nameEl) nameEl.textContent = `Bonjour ${data.username} !`;

                    const rentEl = document.getElementById('tenant-next-rent');
                    const dueDateEl = document.getElementById('rent-due-date');
                    const badgeEl = document.getElementById('tenant-payment-badge');
                    const payNowBtnRef = document.getElementById('pay-now-btn');

                    if (rentEl) {
                        if (data.has_contract) {
                            currentRentAmount = data.loyer || 0;
                            rentEl.textContent = `€${currentRentAmount.toFixed(2)}`;

                            // Update badge and button based on payment_status
                            const ps = data.payment_status;
                            if (ps === 'paye') {
                                // Rent already paid this month
                                if (badgeEl) {
                                    badgeEl.textContent = '✅ Réglé';
                                    badgeEl.className = 'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
                                }
                                if (payNowBtnRef) {
                                    payNowBtnRef.disabled = true;
                                    payNowBtnRef.textContent = 'Loyer réglé ✓';
                                    payNowBtnRef.classList.add('opacity-50', 'cursor-not-allowed');
                                    payNowBtnRef.classList.remove('bg-primary');
                                    payNowBtnRef.classList.add('bg-green-500');
                                }
                                if (dueDateEl) dueDateEl.textContent = 'Prochaine échéance : 05 du mois prochain';
                            } else if (ps === 'en_attente') {
                                // Payment declared, awaiting owner validation
                                if (badgeEl) {
                                    badgeEl.textContent = '⏳ En attente';
                                    badgeEl.className = 'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
                                }
                                if (payNowBtnRef) {
                                    payNowBtnRef.disabled = true;
                                    payNowBtnRef.textContent = 'En attente de validation...';
                                    payNowBtnRef.classList.add('opacity-60', 'cursor-not-allowed');
                                }
                                if (dueDateEl) dueDateEl.textContent = 'Paiement soumis, en cours de validation';
                            } else {
                                // None - not paid
                                if (badgeEl) {
                                    badgeEl.textContent = '⚠️ À payer';
                                    badgeEl.className = 'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
                                }
                                if (dueDateEl) dueDateEl.textContent = 'Prochaine échéance : 05 du mois';
                            }
                        } else {
                            rentEl.textContent = 'Aucun bail actif';
                            rentEl.classList.add('text-sm');
                            if (dueDateEl) dueDateEl.textContent = "-";
                        }
                    }
                }
            })
            .catch(err => {
                console.error(err);
                window.location.href = '/login';
            });

        // Maintenance Request Logic
        const maintenanceModal = document.getElementById('maintenance-modal');
        const interventionBtn = document.getElementById('intervention-btn');
        const closeMaintenanceBtn = document.getElementById('close-maintenance-modal');
        const maintenanceForm = document.getElementById('maintenance-form');

        if (interventionBtn && maintenanceModal) {
            interventionBtn.addEventListener('click', () => {
                maintenanceModal.classList.remove('hidden');
            });
        }

        if (closeMaintenanceBtn && maintenanceModal) {
            closeMaintenanceBtn.addEventListener('click', () => {
                maintenanceModal.classList.add('hidden');
            });
        }

        if (maintenanceForm) {
            maintenanceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const content = document.getElementById('maintenance-content').value;

                try {
                    // Dynamically get the owner's ID instead of hardcoding 1
                    let receiverId = 1; // fallback
                    const contactsRes = await fetch('/api/messages/contacts', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (contactsRes.ok) {
                        const contacts = await contactsRes.json();
                        if (contacts.length > 0) receiverId = contacts[0].id;
                    }

                    const res = await fetch('/api/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            receiver_id: receiverId,
                            contenu: `[INTERVENTION] ${content}`
                        })
                    });

                    if (res.ok) {
                        alert("Demande d'intervention envoyée avec succès !");
                        maintenanceModal.classList.add('hidden');
                        maintenanceForm.reset();
                    } else {
                        alert("Erreur lors de l'envoi de la demande.");
                    }
                } catch (err) {
                    console.error('Error sending maintenance request', err);
                }
            });
        }

        // Payer Maintenant Simulation Logic
        const payNowBtn = document.getElementById('pay-now-btn');
        if (payNowBtn) {
            payNowBtn.addEventListener('click', async () => {
                try {
                    if (!currentRentAmount || currentRentAmount <= 0) {
                        alert("Aucun loyer défini pour votre contrat. Veuillez contacter votre propriétaire.");
                        return;
                    }

                    if (!confirm(`Simuler le paiement de €${currentRentAmount.toFixed(2)} ?`)) return;

                    // 1. Fetch pending payments for this tenant
                    const res = await fetch('/api/paiements', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const paiements = await res.json();

                    // Look for a pending payment for the CURRENT MONTH or simply the first 'en_attente'
                    const pending = paiements.find(p => p.statut === 'en_attente');

                    if (pending) {
                        // 2. Automate: PATCH it to 'paye'
                        const patchRes = await fetch(`/api/paiements/${pending.id}`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ statut: 'paye' })
                        });

                        if (patchRes.ok) {
                            alert("Paiement déclaré validé avec succès !");
                            window.location.reload();
                        } else {
                            alert("Échec de la validation du paiement.");
                        }
                    } else {
                        // 3. Automate: Create and pay in one step
                        const postRes = await fetch('/api/paiements', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                montant: currentRentAmount,
                                description: `Paiement automatique loyer - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
                                statut: 'paye'
                            })
                        });

                        if (postRes.ok) {
                            alert("Paiement créé et validé avec succès !");
                            window.location.reload();
                        } else {
                            alert("Échec de la création du paiement automatique.");
                        }
                    }
                } catch (err) {
                    console.error('Payment simulation error', err);
                }
            });
        }
    }

    if (window.location.pathname === '/ajouter-propriete' && token) {
        const loadProperties = () => {
            fetch('/api/proprietes', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(props => {
                    const listEl = document.getElementById('properties-list');
                    const countEl = document.getElementById('prop-count');
                    if (!listEl) return;
                    listEl.innerHTML = '';
                    if (countEl) countEl.textContent = `${props.length} bien(s)`;

                    if (props.length === 0) {
                        listEl.innerHTML = '<p class="text-sm text-gray-500 italic text-center py-10">Aucun bien enregistré pour le moment.</p>';
                        return;
                    }
                    props.forEach(p => {
                        listEl.innerHTML += `
                        <div class="flex flex-col rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 class="font-semibold text-gray-900 dark:text-white">${p.adresse}</h3>
                            <div class="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>${p.pieces || 0} pièces, ${p.superficie || 0} m²</span>
                                <span class="font-bold text-primary">€${p.prix || 0}</span>
                            </div>
                            <div class="flex gap-2 mt-3">
                                <button onclick="editProperty(${p.id})" class="flex-1 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-800 transition">Éditer</button>
                                <button onclick="archiveProperty(${p.id})" class="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-200 transition">Archiver</button>
                                <a href="/contrat?prop_id=${p.id}" class="flex-1 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg text-center hover:bg-primary/20 transition flex items-center justify-center">Assigner</a>
                            </div>
                        </div>
                    `;
                    });
                })
                .catch(console.error);
        };

        window.archiveProperty = async (id) => {
            if (!confirm("Voulez-vous vraiment archiver cette propriété ?")) return;
            try {
                const res = await fetch(`/api/proprietes/${id}/archive`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) loadProperties();
            } catch (err) {
                console.error('Failed to archive property', err);
            }
        };

        window.editProperty = async (id) => {
            // Fetch current details first
            try {
                const getRes = await fetch(`/api/proprietes/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const p = await getRes.json();

                const newPrice = prompt(`Modifier le loyer mensuel pour "${p.adresse}" :`, p.prix);
                if (newPrice === null || isNaN(parseFloat(newPrice))) return;

                const res = await fetch(`/api/proprietes/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ prix: parseFloat(newPrice) })
                });

                if (res.ok) {
                    alert("Propriété mise à jour !");
                    loadProperties();
                }
            } catch (err) {
                console.error('Edit property error', err);
            }
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

        if (myRole !== 'proprietaire') {
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
                                ${p.statut === 'paye' ? `<a href="/api/paiements/${p.id}/quittance" target="_blank" class="mt-2 text-xs text-primary font-bold flex items-center gap-1"><span class="material-symbols-outlined text-sm">download</span> Télécharger Quittance</a>` : ''}
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

        const exportBtn = document.getElementById('export-csv-btn');
        if (myRole === 'proprietaire' && exportBtn) {
            exportBtn.classList.remove('hidden');
            // Use fetch + Blob for proper JWT-authenticated CSV download
            exportBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const res = await fetch('/api/paiements/export', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) { alert('Erreur lors de l\'export.'); return; }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `paiements_immogestion_${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch (err) {
                    console.error('CSV export error', err);
                }
            });
        }

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
        const contactSelect = document.getElementById('contact-select');
        const contactRole = document.getElementById('contact-role');
        const chatEl = document.getElementById('chat-messages');
        let currentContactId = null;

        const loadContacts = async () => {
            try {
                const res = await fetch('/api/messages/contacts', { headers: { 'Authorization': `Bearer ${token}` } });
                const contacts = await res.json();
                if (contactSelect) {
                    contactSelect.innerHTML = '<option value="" disabled selected>Choisir un contact</option>';
                    contacts.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = c.username;
                        contactSelect.appendChild(opt);
                    });
                }
                // Auto-select for tenants: automatically load their owner's conversation
                const myRoleMsg = localStorage.getItem('user_role');
                if (myRoleMsg === 'locataire' && contacts.length > 0) {
                    currentContactId = contacts[0].id;
                    contactSelect.value = currentContactId;
                    if (contactRole) contactRole.textContent = 'Propriétaire';
                    loadMessages(currentContactId);
                } else if (contacts.length === 0 && chatEl) {
                    chatEl.innerHTML = '<p class="text-sm text-center text-gray-500 mt-10 italic">Aucun contact disponible. Vous devez avoir un contrat actif pour utiliser la messagerie.</p>';
                }
            } catch (err) { console.error('Load contacts error', err); }
        };

        const loadMessages = (cid) => {
            if (!cid) return;
            fetch(`/api/messages?contact_id=${cid}`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    if (!chatEl) return;
                    chatEl.innerHTML = '';
                    if (data.length === 0) {
                        chatEl.innerHTML = '<p class="text-sm text-center text-gray-500 mt-4 italic">Aucun message avec ce contact.</p>';
                        return;
                    }
                    data.sort((a, b) => new Date(a.date) - new Date(b.date));
                    data.forEach(m => {
                        const isMine = m.sender === myUserId;
                        if (isMine) {
                            chatEl.innerHTML += `
                            <div class="flex items-end gap-3 justify-end">
                                <div class="flex flex-1 flex-col gap-1.5 items-end">
                                    <div class="text-sm font-normal leading-normal flex max-w-xs rounded-2xl rounded-br-none px-4 py-2.5 bg-primary text-white shadow-sm">
                                        ${m.contenu}
                                    </div>
                                    <p class="text-[9px] text-gray-400 mr-1">${new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>`;
                        } else {
                            chatEl.innerHTML += `
                            <div class="flex items-end gap-3">
                                <div class="flex flex-1 flex-col gap-1.5 items-start">
                                    <div class="text-sm font-normal leading-normal flex max-w-xs rounded-2xl rounded-bl-none px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm">
                                        ${m.contenu}
                                    </div>
                                    <p class="text-[9px] text-gray-400 ml-1">${new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>`;
                        }
                    });
                    chatEl.scrollTop = chatEl.scrollHeight;
                })
                .catch(console.error);
        };

        if (contactSelect) {
            contactSelect.addEventListener('change', () => {
                currentContactId = contactSelect.value;
                loadMessages(currentContactId);
                // Simple role switching logic for UI
                if (contactRole) {
                    contactRole.textContent = localStorage.getItem('user_role') === 'proprietaire' ? 'Locataire' : 'Propriétaire';
                }
            });
        }

        loadContacts();

        const sendBtn = document.getElementById('send-message-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', async () => {
                if (!currentContactId) {
                    alert("Veuillez d'abord choisir un contact.");
                    return;
                }
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
                        body: JSON.stringify({ contenu: text, receiver_id: parseInt(currentContactId) })
                    });
                    loadMessages(currentContactId);
                } catch (err) {
                    console.error('Failed to send message', err);
                }
            });
        }
    }

    // --- CONTRATS LOGIC ---
    if (window.location.pathname === '/contrat' && token) {
        const myRole = localStorage.getItem('user_role');
        const ownerControls = document.getElementById('owner-contract-controls');
        const backBtn = document.getElementById('contrat-back-btn');
        const pageTitle = document.getElementById('contrat-page-title');

        if (myRole === 'proprietaire') {
            // Show the creation form for owners
            if (ownerControls) ownerControls.classList.remove('hidden');
            if (pageTitle) pageTitle.textContent = 'Nouveau Contrat';
        } else {
            // Tenant: read-only view, back to tenant dashboard
            if (backBtn) backBtn.href = '/dashboard-locataire';
            if (pageTitle) pageTitle.textContent = 'Mon Contrat';
        }

        const propSelect = document.getElementById('propriete-select');
        const locSelect = document.getElementById('locataire-select');
        const contractList = document.getElementById('contrats-list');
        const contractForm = document.getElementById('create-contract-form');
        const errorEl = document.getElementById('contract-error');
        const successEl = document.getElementById('contract-success');

        // For owners: fetch properties & tenants
        if (myRole === 'proprietaire') {
            // 1. Fetch Properties
            fetch('/api/proprietes', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(props => {
                    if (!propSelect) return;
                    propSelect.innerHTML = '<option value="" disabled selected>Choisir un bien</option>';
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
                    const loadLocSelect = (uList) => {
                        if (!locSelect) return;
                        locSelect.innerHTML = '<option value="" disabled selected>Choisir un locataire</option>';
                        uList.forEach(u => {
                            const opt = document.createElement('option');
                            opt.value = u.id;
                            opt.textContent = u.username + ' (' + u.email + ')';
                            locSelect.appendChild(opt);
                        });
                    };
                    loadLocSelect(users);

                    // Handle Quick Tenant Creation
                    const quickForm = document.getElementById('quick-tenant-form');
                    if (quickForm) {
                        quickForm.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const name = document.getElementById('quick-tenant-name').value;
                            const email = document.getElementById('quick-tenant-email').value;
                            const btn = e.target.querySelector('button');
                            btn.disabled = true;
                            btn.textContent = "Création...";

                            try {
                                const res = await fetch('/api/register', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        username: name, email: email,
                                        password: 'password123', role: 'locataire'
                                    })
                                });
                                const data = await res.json();
                                if (res.ok) {
                                    alert(`Locataire créé avec succès !\nMot de passe par défaut : password123`);
                                    quickForm.reset();
                                    // Reload the list
                                    fetch('/api/users/locataires', { headers: { 'Authorization': `Bearer ${token}` } })
                                        .then(r => r.json()).then(loadLocSelect);
                                } else {
                                    alert(data.message || "Erreur lors de la création.");
                                }
                            } catch (err) { console.error(err); }
                            finally {
                                btn.disabled = false;
                                btn.textContent = "Créer & Ajouter à la liste";
                            }
                        });
                    }
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
    }

    // --- NOTIFICATIONS PAGE ---
    if (window.location.pathname === '/notifications' && token) {
        const loadNotifications = () => {
            fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    const listEl = document.getElementById('notifications-list');
                    if (!listEl) return;
                    listEl.innerHTML = '';

                    if (data.length === 0) {
                        listEl.innerHTML = `
                            <div class="flex flex-col items-center justify-center text-center p-8 mt-12">
                                <div class="flex items-center justify-center size-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                                    <span class="material-symbols-outlined text-3xl text-gray-400">notifications_off</span>
                                </div>
                                <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200">Aucune notification</h3>
                                <p class="text-sm text-gray-500">Revenez plus tard pour voir vos alertes.</p>
                            </div>
                        `;
                        return;
                    }

                    data.forEach(n => {
                        const isUnread = !n.lu;
                        listEl.innerHTML += `
                            <div class="flex items-center gap-4 bg-white dark:bg-gray-900/50 px-4 min-h-[72px] py-4 border-b border-gray-50 dark:border-gray-800">
                                <div class="flex size-10 shrink-0 items-center justify-center rounded-full ${n.type === 'chat' ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}">
                                    <span class="material-symbols-outlined text-xl">${n.type === 'chat' ? 'chat' : 'notifications'}</span>
                                </div>
                                <div class="flex flex-col flex-1">
                                    <div class="flex justify-between items-start">
                                        <p class="text-sm font-bold text-slate-800 dark:text-gray-100">${n.titre}</p>
                                        <p class="text-[10px] text-gray-400 font-medium">${new Date(n.date).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${n.message}</p>
                                </div>
                                ${isUnread ? '<div class="size-2 rounded-full bg-primary shrink-0"></div>' : ''}
                            </div>
                        `;
                    });

                    // Mark as read
                    fetch('/api/notifications/mark-read', {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).then(() => {
                        const navNotif = document.getElementById('nav-notifications');
                        if (navNotif) navNotif.classList.remove('text-red-500');
                    });
                });
        };
        loadNotifications();
    }
});
