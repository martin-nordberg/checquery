
# Export-Import Accounts and Vendors

Add an ability to export the list of accounts and their account categories. Optionally include vendors 
as well. 

The export output should be a file-picker-selected new file containing human-formatted JSON with field 
names similar to the corresponding creation events. File name can just be ".json" for easy editing 
with other tools. Unique IDs should be omitted from the output, to be generated afresh during import
in another file. To reference a parent category or the default account for a vendor, a full path is 
used in the form <account type> : <category name> : <subcategory name> : <account name>. 
Deleted or deactivated entities are not exported.
isPrimary is not included in an export.

Import needs a lot of checking. The whole import should succeed or entirely fail, no partial import
if there are errors. Checking should include:
* If an existing name already exists (within a category when relevant), the imported account, category, 
  or vendor must have identical description.
* The uniqueness of account names and subcategories within an account category must be preserved.
* Problems are reported with friendly detailed error messages including line number of the file with 
  the problem.