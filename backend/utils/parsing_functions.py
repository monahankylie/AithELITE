
def traverse_paths(json_blob, value_map_json):
    new_dict = {}
    for key, path in value_map_json.items():
        current_node = json_blob
        try:
            for node in path:
                # If current_node is a list and path instruction is a dict, use it as a filter
                if isinstance(current_node, list) and isinstance(node, dict):
                    f_key, f_val = next(iter(node.items()))
                    # Find the first dictionary in the list that matches the key/value pair
                    current_node = next(item for item in current_node if item.get(f_key) == f_val)
                else:
                    # Standard key/index traversal
                    current_node = current_node[node]
            new_dict[key] = current_node
            
        except (KeyError, TypeError, IndexError, StopIteration):
            # Fails safely if the stat doesn't exist for a specific player
            new_dict[key] = None
            
    return new_dict

def extract_all_teams(json_blob, team_mapping):
    # 1. Get the path to the list of sports
    root_key = next(iter(team_mapping)) # "team_root"
    root_path = team_mapping[root_key]
    
    #returns all teams as a dict to root_key, confusing name 
    raw_sports_list = traverse_paths(json_blob, {root_key: root_path})[root_key] 
    
    if not raw_sports_list:
        return []
    return raw_sports_list

def parse_into_teams(teams_list,team_struct):
    all_teams = []

    for i in range(len(teams_list)):
        team_dict = traverse_paths(teams_list[i],team_struct)
        all_teams.append(Team(**team_dict))
    return all_teams