# Use Case 5: Inline Spans, Complex Info Strings, and Delimiter Distinctions

This test verifies strict adherence to Skill 1.0 Rule 7 (distinguishing inline code spans from block fences), handling attributes in info strings, and complex inline markdown.

`````markdown
# Configuration Guide

Here is an example command inline: ```npm run build``` followed by ```npm test```.

````js {1-5} title="pipeline.config.js" highlight="true"
module.exports = {
  env: 'production',
  inlineExample: "```const inline = true;```",
  strikethroughNote: "~~deprecated option with ~~~ three tildes inside~~"
};
````

Notice that the lines above contain:
1. An inline triple-backtick span on a single line: ```echo "inline single line"```
2. Strikethrough syntax with three tildes: ~~three ~~~ tildes inline~~
3. An info string containing attributes, brackets, and quotes: `{1-5} title="pipeline.config.js"`

````shell
# Standalone shell block
echo "Checking inline spans: `code` and ``double`` and ```triple``` inline"
````

End of configuration guide.
`````
