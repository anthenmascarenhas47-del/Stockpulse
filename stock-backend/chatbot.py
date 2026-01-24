import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def ask_local_ai(prompt: str):
    res = requests.post(OLLAMA_URL, json={
        "model": "phi3",   # or mistral / phi3
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": 200}
    })

    return res.json()["response"]
