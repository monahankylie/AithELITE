import os
import re
from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTEXT_DIR = os.path.join(BASE_DIR, "BoxScoresContext")

def get_start_indices(target_letter: str):
    """
    Calculates the number of files and anchor tags to skip to reach the first
    game where the first team name starts with target_letter.

    Args:
        target_letter (str): The letter to search for (case-insensitive).

    Returns:
        A tuple (file_skip_count, anchor_skip_count) if the letter is found.
        Returns (0, 0) if the letter is not provided or not found.
    """
    if not target_letter:
        return 0, 0

    target_letter = target_letter.lower()
    
    context_files = [f for f in os.listdir(CONTEXT_DIR) if f.endswith(".txt")]
    context_files.sort(key=lambda x: os.path.getmtime(os.path.join(CONTEXT_DIR, x)))

    file_skip_count = 0
    for filename in context_files:
        filepath = os.path.join(CONTEXT_DIR, filename)
        with open(filepath, "r") as f:
            content = f.read()

        soup = BeautifulSoup(content, 'html.parser')
        anchor_tags = soup.find_all('a', href=re.compile(r'/games/.*'))

        anchor_skip_count = 0
        for tag in anchor_tags:
            href = tag.get('href', '')
            match = re.search(r'/([^/]+)-vs-[^/]+\.htm', href)
            if match:
                team_name = match.group(1)
                if team_name.lower().startswith(target_letter):
                    # Found the starting point, return the number of items to skip
                    return file_skip_count, anchor_skip_count
            anchor_skip_count += 1
        file_skip_count += 1
    
    # If the letter is not found after checking all files
    return 0, 0
