import time
import utils
import method_1
import method_2
import method_3

SCENARIOS = [
    {"start": "https://en.wikipedia.org/wiki/Potato", "target": "Barack Obama", "keywords": "Barack Obama president"},
    {"start": "https://en.wikipedia.org/wiki/Sharknado_2:_The_Second_One", "target": "William Shakespeare", "keywords": "William Shakespeare writer"},
    # {"start": "https://en.wikipedia.org/wiki/Hallucinogenic_fish", "target": "Andrej Karpathy", "keywords": "Andrej Karpathy AI scientist Tesla OpenAI"},
    # {"start": "https://en.wikipedia.org/wiki/United_States_Bicycle_Route_System", "target": "Fanta cake", "keywords": "Fanta cake dessert"},
]

AGENTS = [
    {"name": "Hybrid (Method 1)", "func": method_1.run_step},
    {"name": "SBERT (Method 2)", "func": method_2.run_step},
    {"name": "CoT (Method 3)", "func": method_3.run_step},
]

MAX_STEPS = 15


def play_game(agent_func, start_url, target, keywords):
    current_url = start_url
    visited = {start_url}
    path = []
    start_time = time.time()

    print(f"\n      📍 Start: [{start_url.split('/')[-1]}]")

    for step in range(1, MAX_STEPS + 1):
        page_title = current_url.split("/wiki/")[-1].replace("_", " ")
        path.append(page_title)

        if target.lower() in page_title.lower():
            return {"status": "WIN", "time": time.time() - start_time, "steps": step, "path": path}

        links = utils.get_clean_links(current_url)
        valid_links = {k: v for k, v in links.items() if v not in visited}

        if not valid_links:
            print(f"      💀 Dead End: {page_title}")
            return {"status": "DEAD_END", "time": 0, "steps": step, "path": path}

        # Check Shortcuts (Fairness rule)
        direct_match = None
        for t in valid_links.keys():
            if target.lower() in t.lower():
                direct_match = t
                break

        if direct_match:
            choice = direct_match
            print(f"      ⚡ [Step {step}] Shortcut Found: '{choice}'")
        else:
            choice = agent_func(page_title, target, keywords, valid_links)
            print(f"      👉 [Step {step}] {page_title} --> '{choice}'")

        # Safety Check
        if choice not in valid_links:
            choice = list(valid_links.keys())[0]
            print(f"      ⚠️ Invalid choice, fallback to: {choice}")

        current_url = valid_links[choice]
        visited.add(current_url)

    return {"status": "TIMEOUT", "time": 0, "steps": MAX_STEPS, "path": path}


print("\n" + "=" * 60)
print("🏆 WIKIPEDIA SPEEDRUN ALGORITHM BATTLE 🏆")
print("=" * 60 + "\n")

all_results = []

for scenario in SCENARIOS:
    s_title = f"{scenario['start'].split('/')[-1]} -> {scenario['target']}"
    print(f"🌍 SCENARIO: {s_title}")
    print("-" * 60)

    for agent in AGENTS:
        print(f"▶️  AGENT: {agent['name']} Running...")

        result = play_game(agent['func'], scenario['start'], scenario['target'], scenario['keywords'])

        res_data = {
            "scenario": s_title,
            "agent": agent['name'],
            "status": result['status'],
            "time": result['time'],
            "steps": result['steps']
        }
        all_results.append(res_data)

        if result['status'] == "WIN":
            print(f"🏁 RESULT: SUCCESS! ({result['time']:.2f} seconds)")
        else:
            print(f"🏁 RESULT: {result['status']}")

        print("." * 60 + "\n")
        time.sleep(1)

    print("\n" + "#" * 60 + "\n")

print("\n" + "=" * 90)
print(f"{'SCENARIO':<35} | {'METHOD':<18} | {'STATUS':<8} | {'TIME':<8} | {'STEPS'}")
print("=" * 90)

for r in all_results:
    t_str = f"{r['time']:.2f}s" if r['time'] > 0 else "-"
    print(f"{r['scenario'][:35]:<35} | {r['agent']:<18} | {r['status']:<8} | {t_str:<8} | {r['steps']}")
print("=" * 90)