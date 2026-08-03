
# Encryption

## Environment variable

- Add use of a new environment variable, CHECQUERY_ENCRYPTION_DISABLED="true"/"false"

## Changes for File Encryption

- When CHECQUERY_ENCRYPTION_DISABLED == "false" or undefined
    - Password is required
    - File extension is "checquery"
    - The file will be encrypted
    - Dialogs work as now, but with password a required field and language about blank password removed
- When CHECQUERY_ENCRYPTION_DISABLED == "true"
    - Password entry is omitted 
      - File|New: dialog has name field only
      - File|Open: no dialog at all
    - File extension is "checquery-test"
    - The file will NOT be encrypted
- When CHECQUERY_ENCRYPTION_DISABLED == <something else, not "true"/"false">
    - Program exits with a suitable error