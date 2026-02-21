import os
import json
import vector_maker


def run_directory_analysis(directory_path: str):
    print("=======MAIN=======")
    print(f"\n>>> Scanning directory: {directory_path}\n")

    all_results = {}

    # Loop through files
    for filename in os.listdir(directory_path):

        # Only process CSV files
        if filename.lower().endswith(".csv"):
            file_path = os.path.join(directory_path, filename)

            print(f">>> Processing: {filename}")

            try:
                fingerprint = vector_maker.extract_behavioral_fingerprint(file_path)

                # Convert numpy types to regular Python floats
                # fingerprint = {k: float(v) for k, v in fingerprint.items()}

                all_results[filename] = fingerprint

            except Exception as e:
                print(f"====>>>>Error processing {filename}: {e}")

    return all_results


if __name__ == "__main__":

    data_directory = "data"  # your folder containing CSV files

    results = run_directory_analysis(data_directory)

    print("\n======= FINAL OUTPUT =======\n")
    print(json.dumps(results, indent=2))