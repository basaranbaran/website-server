import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer, util
import torch

device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"⚙️  [UTILS] Hardware: {torch.cuda.get_device_name(0) if device == 'cuda' else 'CPU'}")
print("⚙️  [UTILS] Loading SBERT Model...")
embedder = SentenceTransformer('all-MiniLM-L6-v2', device=device)


def get_clean_links(url):
    """Fetches and cleans valid Wikipedia links from a URL."""
    try:
        headers = {'User-Agent': 'SpeedrunBot/1.0'}
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code != 200: return {}
    except:
        return {}

    soup = BeautifulSoup(response.content, 'html.parser')
    content_div = soup.find(id="mw-content-text")
    if not content_div: return {}

    links = {}
    for a in content_div.find_all('a', href=True):
        href = a['href']
        title = a.get_text().strip()

        if (href.startswith("/wiki/") and ":" not in href and title and
                "Main_Page" not in href and "Identifier" not in title and "Wayback" not in title):
            full_url = "https://en.wikipedia.org" + href
            links[title] = full_url
    return links


def find_best_sbert_matches(link_titles, target_text, top_k=10):
    """Calculates vector similarity and returns top K matches."""
    target_emb = embedder.encode(target_text, convert_to_tensor=True)
    link_embs = embedder.encode(link_titles, convert_to_tensor=True)

    scores = util.cos_sim(target_emb, link_embs)[0]

    k = min(top_k, len(link_titles))
    top_results = torch.topk(scores, k=k)

    candidates = []
    for score, idx in zip(top_results.values, top_results.indices):
        candidates.append(link_titles[idx])

    return candidates