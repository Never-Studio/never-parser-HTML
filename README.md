# js-never-parser
A js parser for parsing websites into annotated text. 
Features:
- removes occluded elements
- parses shadowDOM
- parses iFrames
- annotation with <clickable> and <typeable> tags

There are multiple files:
| name | description |
| --- | --- |
| raw-text-parser.js | parses into raw text|
| annotated-parser.js | annotates with <clickable> and <typable> tags|
| agent-parser.js | output not cleaned from <br> tags |


