import utils


def run_step(current_page_title, target_topic, target_keywords, links):
    link_titles = list(links.keys())
    candidates = utils.find_best_sbert_matches(link_titles, target_keywords, top_k=1)
    
    return candidates[0] if candidates else link_titles[0]