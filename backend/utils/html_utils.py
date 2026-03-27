from bs4 import BeautifulSoup
import re
from typing import Optional, List, Dict

def clean_html_text(text: str) -> str:
    """Removes leading/trailing whitespace and normalized internal spaces."""
    if not text:
        return ""
    return " ".join(text.split()).strip()

def extract_numeric_value(text: str, default: float = 0.0) -> float:
    """Extracts a numeric value from text, removing %, etc."""
    if not text or text == "-" or text == "":
        return default
    
    clean_text = text.replace('%', '').replace(',', '').strip()
    try:
        return float(clean_text)
    except ValueError:
        return default

def get_text_or_none(element: Optional[BeautifulSoup]) -> Optional[str]:
    """Safely extracts text from a BS4 element or returns None."""
    if element:
        return clean_html_text(element.text)
    return None

def find_table_by_header(soup: BeautifulSoup, team_name: str, header_text: str) -> Optional[BeautifulSoup]:
    """
    Finds a specific stats table by searching for its owner (team name) 
    and then its header (e.g., 'Shooting').
    """
    # Look for span.school with team_name
    schools = soup.find_all('span', class_='school')
    for school in schools:
        if team_name.lower() in school.text.lower():
            # Check if next element or sibling has the header_text
            container = school.find_parent('div')
            if container:
                h4 = container.find('h4')
                if h4 and header_text.lower() in h4.text.lower():
                    return container.find('table')
    return None
