#!/usr/bin/env python3
"""Check relative markdown links resolve. Usage: check-doc-links.py [files...]
With no args, checks AGENTS.md, ICM.md, docs/WORKFLOW.md, docs/design/*.md and
skill/agent files. Ignores http(s), mailto and pure #anchors; ignores anchors."""
import re, sys, glob, os
DEFAULT = ["AGENTS.md", "ICM.md", "docs/WORKFLOW.md", "docs/evidence/EVIDENCE-TEMPLATE.md",
           *glob.glob("docs/design/*.md"), *glob.glob(".cursor/skills/*/SKILL.md"),
           *glob.glob(".cursor/agents/*.md"), *glob.glob(".agents/skills/better-ui/SKILL.md")]
files = sys.argv[1:] or DEFAULT
link = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
bad = 0
for f in files:
    text = re.sub(r"```.*?```", "", open(f, encoding="utf-8").read(), flags=re.S)
    for m in link.finditer(text):
        t = m.group(1).split("#")[0]
        if not t or re.match(r"^(https?:|mailto:)", t): continue
        # .cursor/ files use repo-root-relative links by convention.
        cands = [os.path.join(os.path.dirname(f), t)] + ([t] if f.startswith(".cursor/") else [])
        if not any(os.path.exists(os.path.normpath(c)) for c in cands):
            print(f"BROKEN {f}: {m.group(1)}"); bad += 1
sys.exit(1 if bad else 0)
