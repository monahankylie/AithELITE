
def traverse_paths(json_blob, value_map_json) -> dict:
    new_dict = {}
    for key, path in value_map_json.items():
        # Handle literal strings
        if isinstance(path, str):
            new_dict[key] = path
            continue

        current_node = json_blob
        try:
            for node in path:
                if isinstance(current_node, list) and isinstance(node, dict):
                    f_key, f_val = next(iter(node.items()))
                    current_node = next(item for item in current_node if item.get(f_key) == f_val)
                else:
                    current_node = current_node[node]
            
            # Omit None values so Pydantic defaults can take over
            if current_node is not None:
                new_dict[key] = current_node
            
        except (KeyError, TypeError, IndexError, StopIteration):
            pass
            
    return new_dict
