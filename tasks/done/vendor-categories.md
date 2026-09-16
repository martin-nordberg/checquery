
# Vendor Categories

> **Superseded.** Vendor categories proved to be a mistake in practice and were removed from the entire
> application — see `tasks/done/remove-vendor-categories-implementation-plan.md`. Kept here only as the
> historical record of what was originally asked for and why.

Make vendors fall into categories much like accounts but with key differences: 

* There is no such thing as a vendor subcategory and no need for root vendor categories. 
  Vendor categories are just a flat list of categories and every vendor must have a parent category. 
  It should be possible to change the category of a vendor, but every vendor must fall in a category.
* Vendor names must be unique across all categories, not just within a parent category.
* Vendor categories have a name and a description as attributes. Vendor category names must be unique.