# Use Case 9: Multi-Tier Collisions and Missing Closures (Auto-Repair Benchmark)

This document intentionally contains delimiter collisions and an unclosed block to test collision detection and bottom-up auto-repair.

### Intended Structure:
1. Outer `shell` block (opened with 3 backticks: collision with inner blocks!)
2. Child `md` block (opened with 3 backticks: collision with child and parent!)
3. Child `python` block (opened with 3 backticks: collision with parent!)
4. Inner `r` block (opened with 3 tildes, but missing closing fence!)

```shell
echo "Outer block with insufficient fence length"

```md
# Heading inside markdown block

```python
print("Python block colliding with md and shell")

~~~r
cat("Unclosed R block")

```
```
```
