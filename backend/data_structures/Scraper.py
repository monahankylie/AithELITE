import json
import os
import uuid
import time
import random
from utils.scraper_functions import extract_keys, string_builder, dictionary_builder, generic_regex_gen, extract_values
import re
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from itertools import count
import requests
##ADD ERROR HANDLING
##ADD FORK FUNCTION 

class Scraper_Task:
    # Class attribute to hold the global config
    structure_file = {}
    @staticmethod
    def load_structure(file_path):
        try:
            with open(file_path, "r") as f:
                Scraper_Task.structure_file = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError, PermissionError) as e:
            raise RuntimeError(f"Config Load Failed: {e}")         
    def __init__(self, scrape_preset):
        self.seed_dict = {}
        
        self.validation_and_setup(scrape_preset)
        self.step_dict = {} #a list containing links for each step

        self.current_url = ""
        self.current_html = "" #REFACTOR TO SOUP

        self.session = requests.Session()
        ua = UserAgent()
        # This provides the required key-value pair
        self.session.headers.update({
            "User-Agent": ua.chrome
        })
        self.counter = count(0)
#this funcion here defines how a json file shold be structured 
    def validation_and_setup(self, scrape_preset):
        cfg = Scraper_Task.structure_file.get("scrape_presets", {}).get(scrape_preset)
        if not cfg:
            raise ValueError(f"Site config for '{scrape_preset}' missing or empty in structure file.")
        scrape_cfg = cfg.get("scraping",{})
        if not scrape_cfg:
            raise ValueError(f"Scrape config for '{scrape_preset}' missing or empty in structure file.")
        url = cfg.get("site_url")
        if not url:
            raise ValueError(f"Site url missing or null for '{scrape_preset}'.")
        steps = scrape_cfg.get("steps", [])
        if not steps:
            raise ValueError(f"Site scrape steps missing or null for '{scrape_preset}'.")

        self.scrape_preset = scrape_preset
        self.site_cfg = cfg
        self.scrape_cfg = scrape_cfg
        self.site_url = str(url)
        self.steps = steps
    
        steps = self.scrape_cfg.get("steps", [])
        
        for index, step in enumerate(steps):
            methods = step.get("scrape_method", [])
            if not methods:
                raise ValueError(f"There are no methods for step {step} in {structure_file}")
            for method in methods:
                if not (hasattr(self, method) and callable(getattr(self, method))):
                    raise AttributeError(f"Step {index} Method '{method}' is not implemented in {self.__class__.__name__}.")
            if "target" in methods and "target" not in step:
                raise KeyError(f"[{step_name}] 'target' method requested, but no 'target' configuration block was found.")
    def start_scrape(self):
        self.run_step(self.steps[0])
        print("scrape done.")     
    def run_step(self, step_config):
        step_process = step_config.get("scrape_method", [])
        for process_name in step_process:
            print("starting " + process_name)
            method = getattr(self, process_name, None)
            if method:
                method(step_config)
            else:
                print(f"Warning: Method '{process_name}' not found in Scraper class.")
        
    #when automation occurs, we seed via each line from a markup file
    def seed(self, dictionary):
        self.seed_dict = dictionary
    #builds the entry string 
    #this, along with access all, jumps to next step.
    def entry(self, step_config):
        ##seed verification
        current_step = self.which_step_am_i(step_config)
        pattern = step_config.get("pattern", "")
        keys = extract_keys(pattern)

        for key in keys:
            if(self.seed_dict.get(key)):
                continue
            else:
                raise ValueError(f"Missing value for seed key: {key}")
                
        
        entry_url = self.site_url+string_builder(pattern, self.seed_dict)
        self.current_html = self.get_html(entry_url)
        self.current_url = entry_url
        self.step_dict[current_step] = [entry_url]
    #fill in the href pattern from seed_dict
    #on a current html, match all
    #regex is optional
    #store in appropriate list of step within dictionary
    def match(self, step_config):
        
        #fill in the gaps
        match_info = step_config.get("match")
        temp_pattern = match_info.get("pattern")
        temp_key_list = extract_keys(temp_pattern)
        temp_dict = dictionary_builder(temp_key_list,[r'[^/]+' for val in temp_key_list])
        pattern = string_builder(temp_pattern,temp_dict|self.seed_dict)

        #choice for optional regex that can be found anywhere in string
        optional_regex = match_info.get("regex_pattern","")
        if optional_regex:
            pattern = f"(?=.*{optional_regex}).*?{pattern}"

        regex = re.compile(pattern)

        #hardcoded default, modify to change in future
        tag = match_info.get("tag","a")
        attr = match_info.get("attr","href") #change this in future for other attributes/no attributes

        matches = self.current_html.find_all(tag,**{attr: True}) #this means only find tags containing whatever the attribute is
        #filtering matches via regex
        matches = [match for match in matches if regex.search(match.get(attr, ""))]
        
        i = self.which_step_am_i(step_config)
        if(len(matches) == 0):
            print(f"NO MATCH FOUND FOR STEP {i}")
            print(f"when looking for {regex} in {self.current_url}")
            filename = "debug_output.html"
            with open(filename, "w", encoding="utf-8") as f:
                f.write(self.current_html)
            backup = match_info.get("must_store",False)
            if(backup):
                matches.append(backup)
                
        self.step_dict[i] = matches
        
    #given parameters from json, we extract things of that type. otherwise, if the user so desires to get the whole link/element, they can
    #simply omit extract from methods list
    def extract(self, step_config):
        current_step = self.which_step_am_i(step_config)
        extract_config = step_config.get("extract")
        extraction_type = extract_config.get("type")
        #implement some sort of dictionary in the future
        elements = self.step_dict.get(current_step, [])
        unique_set = None
        if not elements:
            return
        #when grabbing NEXT DATA we load json blob
        if extraction_type == "json":
            unique_set = [json.loads(elem.string) for elem in elements if elem.string]
        else: 
            unique_set = list(dict.fromkeys([elem.get(extraction_type) for elem in elements if elem.get(extraction_type)]))
            
        
        ##print(f"extracted: {unique_set}")
        self.step_dict[current_step] = unique_set
    #this is how we jump steps to perform a DFS style scraping
    ##access the current step's list to step into the next step and set current url and html to that 
    def access_each(self, step_config):
        current_idx = self.which_step_am_i(step_config)
        next_step_idx = current_idx + 1
    
        if next_step_idx >= len(self.steps):
            return
    
        # Save the anchor state
        anchor_html = self.current_html
        targets = self.step_dict.get(current_idx, [])
        if not targets:
            return #silent exit 
        ##print(f"accessing {targets}")
        for url in targets:
            
            full_url = self.site_url + url if not url.startswith('http') else url
            self.current_url = full_url
            time.sleep(random.uniform(5, 10)) ##ADD PARAMETERS OR FUNCTION TO CHANGE INTERVALS
            self.current_html = self.get_html(full_url) 
            if self.current_html is None:
                continue
            self.run_step(self.steps[next_step_idx])
            self.current_html = anchor_html     

    def fork(self,step_config):
        fork_config = step_config.get("fork",{}) 
        current_pattern = fork_config.get("current_pattern",None)
        requested_patterns = fork_config.get("requested_patterns",None) ##should be list
        if not fork_config or not requested_patterns: 
            print("no requested patterns found...")
            return
        generic_pattern = generic_regex_gen(current_pattern)#get generic pattern in case 
        keys = extract_keys(current_pattern)
        step = self.which_step_am_i(step_config)
        processed_stuff = self.step_dict.get(step, [])
        new_path_buffer = []

        if processed_stuff: ##if we have stuff inside this 
            for target in processed_stuff:
                match = re.search(generic_pattern, target) #check if current item has that pattern within 
                if not match:
                    continue
                start,end = match.span() #if pattern match, we will grab the substring for a better match
                substring = target[start:end]
                values = extract_values(current_pattern,substring)
                fork_dict = dictionary_builder(keys,values)
                for r_pattern in requested_patterns:
                    new_path = string_builder(r_pattern,fork_dict)
                    new_path = target[:start] + new_path + target[end:]
                    new_path_buffer.append(new_path)
        
        else: #should the user not have this after a match + extract, it will use the current html
            target = self.current_url
            match = re.search(generic_pattern, target)
            if match:
                start,end = match.span() #if pattern match, we will grab the substring for a better match
                substring = target[start:end]
                values = extract_values(current_pattern,substring)
                fork_dict = dictionary_builder(keys,values)
                for r_pattern in requested_patterns:
                    new_path = string_builder(r_pattern,fork_dict)
                    new_path = target[:start] + new_path + target[end:]
                    new_path_buffer.append(new_path)

        if fork_config.get("replace",False):
            self.step_dict[step] = new_path_buffer
        else:
            processed_stuff.extend(new_path_buffer)






        ##used after match usually, but will use current_url if current step does not incl match
        ##parses each entry match
        ##decides whether or not to overwrite list(defined in step_config)

        pass 
    
    def store(self,step_config):
        writers = { 
            ".json": lambda data, f: json.dump(data, f, indent=4),
            ".txt": lambda data, f: f.write(str(data))
        }
        namers = {
            "uuid1": lambda: uuid.uuid1,
            "uuid4": lambda: uuid.uuid4,
            "number":lambda: next(self.counter)
        }

        step = self.which_step_am_i(step_config)
        store_config = step_config.get("store")
        base_path = store_config.get("path", "output")  
        os.makedirs(base_path, exist_ok=True) #make path if nonexistent
        processed_stuff = self.step_dict.get(step, [])
            
        method = store_config.get("method","each")
        extension = store_config.get("ext",".json").lower().strip()
        write_method = writers.get(extension,writers[".json"]) ##ait if the user doesnt give us one, then itll  be json
        name_method = namers.get(store_config.get("name_scheme"))
        ##can probs shove all these conditionals within a lambda
        ##lets make a write function in utils another time. rewriting serial is tedious.
        if method == "each":
            for data in processed_stuff:
                while True:
                    serial = name_method()
                    file_path = os.path.join(base_path, f"{serial}{extension}")
                    if not os.path.exists(file_path):
                        break
                with open(file_path, 'w') as f:
                    write_method(str(data), f)
        else:
            serial = name_method()
            file_path = os.path.join(base_path, f"{serial}{extension}")
            if method == "page":
                with open(file_path, 'w') as f:
                    write_method(str(self.current_soup),f)
            elif method == "all":
                with open(file_path, 'w') as f:
                    write_method("\n".join([str(p) for p in processed_stuff]),f)

    def append(self, step_config):
        step = self.which_step_am_i(step_config)
        append_cfg = step_config.get("append", {})
        string = append_cfg.get("string", "").strip('/')
        
        # FIXED: Safe list access
        elements = self.step_dict.get(step, [])
        if not elements:
            return

        processed_urls = []
        for elem in elements:
            # FIXED: Handle query params and trailing slashes safely
            base, sep, query = elem.partition('?')
            processed_urls.append(f"{base.rstrip('/')}/{string}{sep}{query}")
            
        self.step_dict[step] = processed_urls
    def get_structure(self):
        return self.site_cfg
    def get_scrape_config(self):
        return self.scrape_cfg
    def get_html(self, URL):
        try:
            page = self.session.get(URL, timeout=15)
            page.raise_for_status() 
            return BeautifulSoup(page.text, 'html.parser')
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                print(f"404 Not Found: {URL}")
                return None  # Return None so we can skip it
            raise e # Still crash on 500s or other critical errors
        except Exception as e:
            print(f"Connection Error at {URL}: {e}")
            return None
    def print_step_desc(self,step_config):
        print(step_config.get("description"))
    def which_step_am_i(self,step_config):
        return self.steps.index(step_config)

