
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
