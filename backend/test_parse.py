import re
import json

content = """The psychological profile has been constructed using the onboarding questions. Now, we should update the onboarding completion status.
{"name": "update_psychological_profile", "arguments": {"profile_update": "{\\"post_loss_urge\\": \\"trade_again\\", \\"onboarding_complete\\": true}"}}"""

match = re.search(r'(\{[\s\n]*"name"[\s\n]*:[\s\n]*"[^"]+"[\s\n]*,[\s\n]*"arguments"[\s\n]*:.*\})', content, re.DOTALL)
if match:
    print('MATCHED!')
    parsed = json.loads(match.group(1))
    print('PARSED', parsed)
    print('STRIPPED', content[:match.start()].strip())
