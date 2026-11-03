# Use Case 7: Extreme Nesting & Display Wrapper Optimization

This test presents deep nesting down to depth 7 and embeds literal documentation describing 10-backtick fence escaping.
By using tildes (`~~~raw`) for the block containing literal 10-backtick runs, backtick collisions are avoided while nesting down 7 layers!
Furthermore, it validates that the display wrapper optimizer switches to tildes (length 4) or exceeds the inner fence runs to avoid an unnecessarily massive backtick wrapper.

`````````markdown
# Level 1: Outer Specification (9 backticks)

````````md
## Level 2: Guide (8 backticks)

```````shell
### Level 3: Script Container (7 backticks)

``````python
#### Level 4: Python Script (6 backticks)

`````markdown
##### Level 5: Embedded Documentation (5 backticks)

````text
###### Level 6: Technical Notes (4 backticks)

~~~raw
Here is a literal documentation line demonstrating extreme fences:
The following span contains 10 consecutive backticks: ``````````
~~~
````
`````
``````
```````
````````
`````````
