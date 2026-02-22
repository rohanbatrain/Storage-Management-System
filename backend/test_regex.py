import re
text = "<think>some thought</think>actual reply"
print(re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip())
