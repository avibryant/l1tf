l1tf
====

After Boyd et al: http://www.stanford.edu/~boyd/l1_tf/

Avi Bryant (Etsy) & Steven Noble (Shopify)

Usage:

```javascript
change_point_xy_pairs = l1tf(y_values, smoothness).points
```

Where smoothness ranges from 0.0 (do nothing) to 1.0 (reduce the line to 3 or so points).

The y_values are assumed to be evenly spaced.

See http://avibryant.github.com/l1tf for a demo.

License: MIT
