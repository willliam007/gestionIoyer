import os
import re

raw_dir = "gestion_immobiliere/templates/stitch_raw"
out_dir = "gestion_immobiliere/templates"

files = [
    "accueil.html", "paiements.html", "messages.html", "ajouter.html",
    "dashboard_owner.html", "dashboard_tenant.html", "notifications.html", "contrat.html"
]

for filename in files:
    with open(os.path.join(raw_dir, filename), "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract body content
    match = re.search(r'<body[^>]*>(.*)</body>', content, re.DOTALL | re.IGNORECASE)
    if not match:
        body_content = content
    else:
        body_content = match.group(1)
        
    # Remove the wrapper div if it's there at the top level
    wrapper_match = re.search(r'^\s*<div[^>]*class="relative flex[^>]*>(.*)</div>\s*$', body_content, re.DOTALL | re.IGNORECASE)
    if wrapper_match:
        body_content = wrapper_match.group(1)
        
    # Attempt to extract top app bar
    # and bottom nav bar
    # Usually they have comments <!-- Top App Bar --> and <!-- Bottom Navigation Bar -->
    # We will just replace them with standard base include blocks or keep them for now
    
    final_content = "{% extends 'base.html' %}\n\n{% block content %}\n" + body_content.strip() + "\n{% endblock %}\n"
    
    with open(os.path.join(out_dir, filename), "w", encoding="utf-8") as f:
        f.write(final_content)

print("Conversion complete.")
