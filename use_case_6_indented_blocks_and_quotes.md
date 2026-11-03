# Use Case 6: Indented Fences (CommonMark 0-3 Leading Spaces)

CommonMark allows code fences to be indented with up to 3 spaces. The closing fence may also have up to 3 spaces. This test verifies that indented code fences are properly identified, nesting depth is tracked, and indentation is preserved when formatting or repairing.

   `````markdown
   # Block indented with 3 spaces

  ````shell
  # Child block indented with 2 spaces
  echo "Nested inside 3-space block"
  ````

   Some explanatory text indented with 3 spaces.

 ~~~~python
 # Sibling block indented with 1 space
 print("Indented sibling with 1 space")
 ~~~~

   `````
