##cut down previous functions
import json 
import re
from bs4 import BeautifulSoup
import requests

def string_builder(str_template, dict_of_args): #use this to go to diff pages. teams -> roster -> individual player
    try:
        return str_template.format(**dict_of_args)
    except (IndexError, KeyError) as e:
        raise ValueError(f"Template/Args mismatch: {e}")

def dictionary_builder(keys,values):
    if len(keys) != len(values):
        raise ValueError(f"Mismatch: Pattern needs {len(keys)} values, got {len(values)}")
    return dict(zip(keys, values))

def extract_keys(str_template):
    key = re.compile(r'{(\w+)}')
    list_of_keys = re.findall(key,str_template)
    return list_of_keys

def get_html(URL): #gets html in text
    header = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    page = requests.get(URL,headers=header) 
    soup = BeautifulSoup(page.text,'html.parser') #take html
    return soup