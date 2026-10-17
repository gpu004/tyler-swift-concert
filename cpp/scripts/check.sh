#!/usr/bin/env bash
set -euo pipefail

if ! command -v uv >/dev/null 2>&1; then
  python3 -m pip install --user uv
  export PATH="$HOME/.local/bin:$PATH"
fi

cd "$(dirname "$0")/.."
mapfile -t source_files < <(find include src tests -type f \( -name '*.cpp' -o -name '*.hpp' \) | sort)
uvx --from clang-format==18.1.8 clang-format --dry-run --Werror "${source_files[@]}"
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
cmake --build build --parallel
mapfile -t cpp_files < <(find src tests -type f -name '*.cpp' | sort)
uvx --from clang-tidy==18.1.8 clang-tidy -p build "${cpp_files[@]}"
ctest --test-dir build --output-on-failure

for state_level in title:1 play:1 play:2 play:3 win:3 lose:3; do
  state="${state_level%%:*}"
  level="${state_level##*:}"
  SDL_VIDEODRIVER=dummy ./build/escape_office \
    --screenshot "build/smoke-${state}-${level}.bmp" \
    --state "$state" --level "$level" --seconds 0.5
done
