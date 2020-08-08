---
id: troubleshooting
title: Troubleshooting common problems
sidebar_label: Troubleshooting
---

### `TypeError: Cannot convert undefined value to object` on `someVariable._closure`

This error frequently happens when metro cache is not updated. Clear it with:

```
watchman watch-del-all
yarn start -- --reset-cache
```
