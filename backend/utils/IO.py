import json
import os

def save_json(data, directory, filename):
    """
    Saves a dictionary or list to a JSON file in the specified directory.
    Creates the directory if it doesn't exist.
    """
    if not os.path.exists(directory):
        os.makedirs(directory)
        
    # Ensure filename has .json extension
    if not filename.endswith(".json"):
        filename += ".json"
        
    file_path = os.path.join(directory, filename)
    
    try:
        with open(file_path, "w") as f:
            json.dump(data, f, indent=4)
        return True
    except Exception as e:
        print(f"[IO ERROR] Failed to save {filename}: {e}")
        return False
