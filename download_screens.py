import os
import urllib.request

urls = {
    "accueil.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzI0ODEzOTNhMDE0YTRjODBhMWU0ZWY4MzVlNDgxMTQwEgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086",
    "paiements.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzY1ZjhjNDc5ZmIxMzRjYjI5YjRlMWNhY2Y1NTc3ZmMzEgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086",
    "messages.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzMwN2QxMzhlZjVlZjQxYjM4NGU5MjUyOTUxMjgzMDhlEgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086",
    "ajouter.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzU0N2NjNjI0M2ViMjRlYTFhZDk2YTI4MmI0MmIyMmY5EgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086",
    "dashboard_owner.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2NlNGVkYTUwOTM2YTQ1N2NhNGI0ZmFlYTNhNzliZmI3EgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086",
    "dashboard_tenant.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzY3YjYzZWFkOTk1MzRmODU4YmM5MDViY2RjMGZjNzA0EgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086",
    "notifications.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzg4NTUwMjMwN2I4MTQ2ZTM5ZTIwOTE3MzVlMTdlNWE5EgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086",
    "contrat.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzJiNGE1NDEzMDc1MTQxY2ViOTJiMWE1ZDIyZjM0MDQyEgsSBxCeip7ayB4YAZIBIwoKcHJvamVjdF9pZBIVQhMyMjY3MTM5ODI5NzEyMzI1MjQy&filename=&opi=89354086"
}

out_dir = "gestion_immobiliere/templates/stitch_raw"
os.makedirs(out_dir, exist_ok=True)

for name, url in urls.items():
    print(f"Downloading {name}...")
    try:
        urllib.request.urlretrieve(url, os.path.join(out_dir, name))
    except Exception as e:
        print(f"Failed to download {name}: {e}")

print("Done downloading.")
