#!/usr/bin/env bash
# SCR-Mesh — local folder scaffolder (macOS / Linux / WSL)
# Usage: bash setup.sh [target-path]
# Example: bash setup.sh ~/Projects/scr-mesh

set -euo pipefail

TARGET="${1:-./scr-mesh}"
echo "Creating SCR-Mesh project structure at: $TARGET"

mkdir -p "$TARGET"/{apps/web-admin,apps/web-public,apps/mobile,services/ai-detection,services/gemini-orchestrator,services/mesh-coordinator,firebase/functions,shared/types,shared/constants,shared/playbooks,docs}

# Placeholder files so git tracks empty dirs
touch "$TARGET"/apps/web-admin/.gitkeep
touch "$TARGET"/apps/web-public/.gitkeep
touch "$TARGET"/apps/mobile/.gitkeep
touch "$TARGET"/services/ai-detection/.gitkeep
touch "$TARGET"/services/gemini-orchestrator/.gitkeep
touch "$TARGET"/services/mesh-coordinator/.gitkeep
touch "$TARGET"/firebase/functions/.gitkeep
touch "$TARGET"/shared/types/.gitkeep
touch "$TARGET"/shared/constants/.gitkeep
touch "$TARGET"/shared/playbooks/.gitkeep
touch "$TARGET"/docs/.gitkeep

echo ""
echo "Done. Structure created:"
echo ""
(cd "$TARGET" && find . -type d | sort | sed 's|^\./||; s|^|  |')
echo ""
echo "Next steps:"
echo "  1. cd $TARGET"
echo "  2. git init"
echo "  3. Open this folder in Google Antigravity"
echo "  4. Paste Prompt 0.1 from the Antigravity Agent Prompts document"
