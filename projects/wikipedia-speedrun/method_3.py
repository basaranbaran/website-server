import utils
import ollama
import re


def run_step(current_page_title, target_topic, target_keywords, links):
    link_titles = list(links.keys())
    candidates = utils.find_best_sbert_matches(link_titles, target_keywords, top_k=5)
    candidates_str = "\n".join([f"- {c}" for c in candidates])

    prompt = f"""
    Wikipedia Game. Current: "{current_page_title}". Target: "{target_topic}".
    Candidates:
    {candidates_str}

    Task:
    1. Analyze which link is logically closest to the target.
    2. Explain your reasoning briefly.
    3. Finally, write the selected link inside brackets like: [[Link Name]]
    """

    try:
        response = ollama.chat(model="llama3.1", messages=[{'role': 'user', 'content': prompt}])
        content = response['message']['content']

        match = re.search(r'\[\[(.*?)\]\]', content)
        if match:
            choice = match.group(1).strip()
            for cand in candidates:
                if cand.lower() in choice.lower():
                    return cand

        for cand in candidates:
            if cand.lower() in content.lower():
                return cand

        return candidates[0]
    except:
        return candidates[0]