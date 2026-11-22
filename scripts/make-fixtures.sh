#!/usr/bin/env bash
# Generates the MP4 fixtures used by the E2E tests into e2e/fixtures/.
# Requires ffmpeg with an H.264 encoder (libx264) and AAC.
set -euo pipefail
out="$(dirname "$0")/../e2e/fixtures"
mkdir -p "$out"

video_src=(-f lavfi -i "testsrc=size=640x360:rate=25")
audio_src=(-f lavfi -i "sine=frequency=440:sample_rate=48000")
common=(-y -hide_banner -loglevel error -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart)

# 3 s, 640x360, H.264 + AAC (normal playback, loop, speed)
ffmpeg "${video_src[@]}" "${audio_src[@]}" -t 3 "${common[@]}" -shortest "$out/sample.mp4"
# 8 s (seek, time display)
ffmpeg -f lavfi -i "testsrc=size=640x360:rate=25" -f lavfi -i "sine=frequency=440:sample_rate=48000" -t 8 "${common[@]}" -shortest "$out/long.mp4"
# portrait 360x640
ffmpeg -f lavfi -i "testsrc=size=360x640:rate=25" -f lavfi -i "sine=frequency=440:sample_rate=48000" -t 2 "${common[@]}" -shortest "$out/portrait.mp4"
# no audio track
ffmpeg -f lavfi -i "testsrc=size=640x360:rate=25" -t 2 "${common[@]}" -an "$out/silent.mp4"
# audio only (no video track): must be rejected as unplayable (OQ-30)
ffmpeg -f lavfi -i "sine=frequency=440:sample_rate=48000" -t 2 -y -hide_banner -loglevel error -c:a aac -movflags +faststart "$out/audio-only.mp4"
# 1920x1080 (AT-07: window 960x540 layout check)
ffmpeg -f lavfi -i "testsrc=size=1920x1080:rate=25" -f lavfi -i "sine=frequency=440:sample_rate=48000" -t 2 "${common[@]}" -shortest "$out/fhd.mp4"
# not an MP4 at all
printf 'this is not a video file' > "$out/broken.mp4"
echo "fixtures written to $out"
