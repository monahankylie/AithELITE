import collections
import os
import re
from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTEXT_DIR = os.path.join(BASE_DIR, "BoxScoresContext")

def get_start_indices(target_letter: str):
    if not target_letter:
        return 0, 0

    target_letter = target_letter.lower()
    
    context_files = [f for f in os.listdir(CONTEXT_DIR) if f.endswith(".txt")]
    context_files.sort(key=lambda x: os.path.getmtime(os.path.join(CONTEXT_DIR, x)))

    file_skip_count = 0
    anchor_skip_count = 0
    
    for filename in context_files:
        filepath = os.path.join(CONTEXT_DIR, filename)
        with open(filepath, "r") as f:
            content = f.read()

        soup = BeautifulSoup(content, 'html.parser')
        anchor_tags = soup.find_all('a', href=re.compile(r'/games/.*'))
        
        if not anchor_tags:
            file_skip_count += 1
            continue

        team_counts = collections.Counter()
        
        for tag in anchor_tags:
            href = tag.get('href', '')
            match = re.search(r'/([^/]+)-vs-([^/.]+)\.htm', href)
            if match:
                team_counts[match.group(1)] += 1
                team_counts[match.group(2)] += 1
        
        if team_counts:
            main_team = team_counts.most_common(1)[0][0]
            
            if main_team.lower().startswith(target_letter):
                return file_skip_count, anchor_skip_count
                
        anchor_skip_count += len(anchor_tags)
        file_skip_count += 1
        
    return 0, 0