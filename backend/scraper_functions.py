import json 
import re
from bs4 import BeautifulSoup
import requests

relevant_words = {}
with open("Resources/SiteInfo.json", "r") as f:
    json_dev_file = json.load(f)

def get_html(URL): #gets html in text
    header = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    page = requests.get(URL,headers=header) 
    soup = BeautifulSoup(page.text,'html.parser') #take html
    return soup

##going with simplicity here, 
def grab_hrefs(page_elem):
    tags = []
    tags = page_elem.find_all('a')
    links = [tag['href'] for tag in tags if 'href' in tag.attrs] #find links
    return links

def grab_id_parent(page_elem,pg_id):
    return page_elem.find(id=pg_id)
def grab_scripts(page_elem,regex = re.compile('')):
    #return [script for script in page_elem.find_all("script") if regex.search(script.attrs['src'])]
    return page_elem.find_all("script")
    
#IN USE NOW 
def grab_team_hrefs(page_elem):
    links = grab_hrefs(page_elem)

    ####REWORK vvvvv to work with other states via an container
    team_links = [link for link in links if link.startswith("/ca/") and link.endswith("/basketball/") and link != "/ca/basketball/"]
    ####HARDCODED RN but can use relevant words from parse_url_context in the future to decipher relevant links
    return team_links

def grab_player_hrefs(page_elem): #eventually should make respective classes that override this function
    links = grab_hrefs(page_elem)
    relevant_pattern = r'careerid=[a-z0-9]+' #eventually, it should read off json to get a regex depending on site
    player_links = [link for link in links if re.search(relevant_pattern,link)]
    return player_links
#WIP

def grab_player_info(page_elem):
    ##there is a big script.
    player_scripts = grab_id_parent(ex_player_pg, '__NEXT_DATA__')
    return
#WIP might not need
def get_team_URL(page_html):
    #try to guess which link is the teams URL on a given site
    return