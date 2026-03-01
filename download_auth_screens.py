import os
import urllib.request
import re

urls = {
    "login_raw.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2E1Yjk5MzU3ZjhlZDQwMGRiY2EyMDI2NTk1OTlmZTUzEgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086",
    "register_raw.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2QyN2I4MTM0ODI5ODQxNDc4M2U5OGZkNWY1ODE3OTVlEgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086"
}

out_dir = "gestion_immobiliere/templates"

for name, url in urls.items():
    print(f"Downloading {name}...")
    temp_path = os.path.join(out_dir, name)
    try:
        urllib.request.urlretrieve(url, temp_path)
    except Exception as e:
        print(f"Failed to download {name}: {e}")
        continue
        
    print(f"Converting {name} to Jinja template...")
    with open(temp_path, "r", encoding="utf-8") as f:
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
        
    final_content = "{% extends 'base.html' %}\n\n{% block content %}\n" + body_content.strip() + "\n{% endblock %}\n"
    
    out_name = "login.html" if "login" in name else "register.html"
    with open(os.path.join(out_dir, out_name), "w", encoding="utf-8") as f:
        f.write(final_content)
        
    os.remove(temp_path)

print("Done generating authentication screens.")
