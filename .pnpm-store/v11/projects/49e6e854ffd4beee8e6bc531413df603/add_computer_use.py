import os
config_path = os.path.expanduser("~/.codex/config.toml")
with open(config_path, "r", encoding="utf-8") as f:
    config = f.read()
if 'computer-use@openai-bundled' not in config:
    toml_entry = '[plugins."computer-use@openai-bundled"]\nenabled = true\n\n[features]'
    config = config.replace('[features]', toml_entry)
    with open(config_path, "w", encoding="utf-8") as f:
        f.write(config)
    print("Added")
else:
    print("Already there")
