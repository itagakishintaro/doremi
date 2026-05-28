import sys
import numpy as np

# numpy 2.x removed these deprecated aliases that oemer 0.1.5 still uses.
for name, py in {"int": int, "float": float, "bool": bool, "object": object}.items():
    if not hasattr(np, name):
        setattr(np, name, py)

from oemer.ete import main

if __name__ == "__main__":
    sys.argv = ["oemer", *sys.argv[1:]]
    main()
