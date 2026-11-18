"""Build the database and run its audit using the same engine as the game.

Requires Node.js. Use --watch to rebuild automatically when source files change.
"""
from pathlib import Path
import shutil
import subprocess
import sys

node = shutil.which("node")
if not node:
    raise SystemExit("Node.js ontbreekt. Installeer Node.js en voer de bouwer opnieuw uit.")
raise SystemExit(subprocess.call([node, str(Path(__file__).resolve().parent / "tools" / "build_database.mjs"), *sys.argv[1:]]))
