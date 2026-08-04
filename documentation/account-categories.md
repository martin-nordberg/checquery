# Account Categories

This is a significant refactoring across all levels of the code....

Change accounts so that they are no longer hierarchical. Instead, 
newly introduced account categories form the recursive hierarchy. 
Accounts are changed so that they always have a parent category
instead of a parent account.

This will require domain model updates, materialized store database schema updates,
and UI updates. Domain model:
  - AcctCtgId with prefix "actg"
  - AccountCategory with account type, name, description, and parent category
  - The existing root accounts become root account categories instead.
  - Net Worth splits into "Equity" account category and "Net Worth", predefined 
    account, the only equity account.
  - Net Worth is the only account that is a direct child of a root account category. Every
    other account must have at least one level of categorization beyond the root level.
  - Account Category and Account names must all be unique within their parent category,
    much like a file system with folders and files.
  - Suggest an approach for adding new account categories vs new accounts in the account list pages.

It is OK to wipe and replace the existing migration 0002 if needed, but it may not be.
Let me know, and I will delete the existing sample file I have working.

