# Use Case 11: The Tremendously Messed Markdown Stress-Test

This benchmark intentionally combines severe syntax errors, multi-tier delimiter collisions, missing closures across different depths, and mismatched closing fence lengths to put the auto-repair engine to the ultimate test.

### Faults Introduced:
1. Outer `markdown` opened with only 3 backticks (will collide with every inner block).
2. Child `md` opened with 4 backticks (longer than parent!).
3. Grandchild `bash` opened with 5 backticks (longer than parent and grandparent!).
4. Great-grandchild `python` opened with 3 backticks.
5. Inside `python`, `~~~data` (tildes) is opened with NO closing fence before backtick closers appear!
6. Sibling `shell` opened with 3 spaces indentation (`   ```shell`).
7. Grandchild `ruby` opened with 4 tildes (`~~~~ruby`) containing ````yaml` (4 backticks), and NEITHER was closed before EOF!
8. Existing backtick closing lines at the end must NOT be duplicated during repair.

```markdown
# Section A: Severely Colliding Outer Block

   ```md
   ## Section B: Inverted Fence Lengths (4 backticks inside 3)

`````bash
# Section C: 5 backticks inside 4 and 3
echo "Catastrophic delimiter collision hierarchy"
`````

```python
# Section D: Colliding Python block
def process():
    print("Testing recovery")

~~~data
# Unclosed tilde block inside backticks!
key: value
data: [1, 2, 3]

```
```
```

   ```shell
   # Sibling block with irregular indentation
   echo "Sibling test"
   ```

~~~~ruby
# Unclosed Ruby block at depth 2
def ruby_test
  puts "Unclosed Ruby"
end

````yaml
# Unclosed YAML block nested inside unclosed Ruby block!
setting: true
active: false
