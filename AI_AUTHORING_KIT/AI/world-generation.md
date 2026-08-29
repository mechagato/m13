# World generation recipe

1. Parse the user intent (topic, interior/exterior, age)
2. Pick a template from EXAMPLES
3. Rename `name`, rewrite `description` and dialog
4. Swap materials only within catalog
5. Rebuild missions to match new ids
6. Validate
7. Emit YAML
