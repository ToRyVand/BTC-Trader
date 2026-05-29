import json
import tempfile
import os

def check_consecutive_errors(journal_path, max_errors=3):
    """Testable version."""
    try:
        with open(journal_path, "r") as f:
            lines = f.readlines()
    except FileNotFoundError:
        return 0

    consecutive = 0
    for line in reversed(lines[-20:]):
        try:
            entry = json.loads(line)
            is_error = (
                entry.get("event") == "ERROR"
                or entry.get("result", {}).get("status") == "ERROR"
                or (entry.get("event") == "CYCLE" and entry.get("result", {}).get("status") == "ERROR")
            )
            if is_error:
                consecutive += 1
            else:
                break
        except Exception:
            break
    return consecutive


# Test 1: No errors
with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.jsonl') as f:
    f.write('{"event": "CYCLE", "result": {"status": "SUCCESS"}}\n')
    path1 = f.name

assert check_consecutive_errors(path1) == 0
print("✅ Test 1 passed: No errors")

# Test 2: 3 consecutive errors
with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.jsonl') as f:
    for i in range(3):
        f.write(f'{{"event": "ERROR", "detail": "error {i}"}}\n')
    path2 = f.name

assert check_consecutive_errors(path2) == 3
print("✅ Test 2 passed: 3 consecutive errors")

# Test 3: Mixed with non-error at end
with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.jsonl') as f:
    f.write('{"event": "ERROR"}\n')
    f.write('{"event": "ERROR"}\n')
    f.write('{"event": "CYCLE", "result": {"status": "SUCCESS"}}\n')
    path3 = f.name

assert check_consecutive_errors(path3) == 0
print("✅ Test 3 passed: No consecutive errors at end")

# Cleanup
os.unlink(path1)
os.unlink(path2)
os.unlink(path3)

print("\n✅ All consecutive error tests passed!")
