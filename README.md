### How to run it

To build it as it is:

```
yarn
yarn deploy
```

It will deploy to the graph node what was set in package.json in `deploy` script.

#### To deploy to another the graph node

- Create new The Graph Node
- Edit package.json for `deploy` script, change the graph url in end of a line
- Run: yarn deploy