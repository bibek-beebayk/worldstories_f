import { createServer } from "node:http";

const port = Number(process.env.READ_ALONG_MOCK_API_PORT || 4174);

const storyMetadata = {
  id: 1,
  title: "Browser Test Story",
  slug: "test-story",
  language: "English",
  story_type: "Novel",
  cover_image: null,
  author: { id: 1, name: "Test Author" },
};

const tracks = [
  {
    id: 11,
    title: "Opening Track",
    slug: "track-1",
    order: 1,
    transcript_synchronized: true,
  },
  {
    id: 12,
    title: "Closing Track",
    slug: "track-2",
    order: 2,
    transcript_synchronized: false,
  },
];

const audioPayload = (track) => ({
  ...track,
  audio_file: `http://127.0.0.1:${port}/media/${track.slug}.wav`,
  stream_url: `http://127.0.0.1:${port}/api/stories/test-story/audios/${track.slug}/stream/`,
  duration_seconds: 120,
  download_size_bytes: 1024,
  has_transcript: true,
  read_along_available: true,
});

const readAlongPayload = (track) => {
  const index = tracks.findIndex((item) => item.slug === track.slug);
  const synchronized = track.transcript_synchronized;
  return {
    story: storyMetadata,
    audio: audioPayload(track),
    transcript: synchronized
      ? {
          html: "<p>Across the quiet valley.</p><p>The journey continued.</p>",
          state: "synchronized",
          synchronized: true,
          cues: [
            { id: 1, start_seconds: 0, end_seconds: 2, text: "Across the quiet valley." },
            { id: 2, start_seconds: 2, end_seconds: 4, text: "The journey continued." },
          ],
        }
      : {
          html: "<p>This is the editable unsynchronized transcript for the closing track.</p>",
          state: "unsynchronized",
          synchronized: false,
          cues: [],
        },
    navigation: {
      previous_audio_slug: tracks[index - 1]?.slug ?? null,
      next_audio_slug: tracks[index + 1]?.slug ?? null,
    },
  };
};

const storyPayload = {
  ...storyMetadata,
  about: "",
  summary: null,
  retrospective: null,
  translations: [],
  submitted_by: null,
  genres: [],
  categories: [],
  pdf_file: null,
  epub_file: null,
  chapter_count: 0,
  chapters: [],
  tags: [],
  audios: tracks.map(audioPayload),
  videos: [],
  reviews_count: 0,
  reading_time_minutes: null,
  listening_time_minutes: 4,
  watch_time_minutes: null,
  similar_stories: [],
};

function silentWave() {
  const sampleRate = 8000;
  const samples = sampleRate;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

const wave = silentWave();
const corsHeaders = {
  "Access-Control-Allow-Origin": "http://127.0.0.1:4173",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

const sendJson = (response, status, payload) => {
  response.writeHead(status, { ...corsHeaders, "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
};

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (url.pathname === "/api/health/") {
    sendJson(response, 200, { ok: true });
    return;
  }
  if (url.pathname === "/api/stories/test-story/") {
    sendJson(response, 200, storyPayload);
    return;
  }
  const readAlongMatch = url.pathname.match(
    /^\/api\/stories\/test-story\/read-along\/(track-[12])\/$/
  );
  if (readAlongMatch) {
    const track = tracks.find((item) => item.slug === readAlongMatch[1]);
    sendJson(response, track ? 200 : 404, track ? readAlongPayload(track) : { detail: "Not found" });
    return;
  }
  if (url.pathname === "/api/analytics/events/") {
    sendJson(response, 201, { accepted: true });
    return;
  }
  if (url.pathname.startsWith("/media/") || url.pathname.includes("/audios/") && url.pathname.endsWith("/stream/")) {
    const range = request.headers.range;
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      const start = match ? Number(match[1]) : 0;
      const requestedEnd = match?.[2] ? Number(match[2]) : wave.length - 1;
      const end = Math.min(requestedEnd, wave.length - 1);
      response.writeHead(206, {
        ...corsHeaders,
        "Accept-Ranges": "bytes",
        "Content-Type": "audio/wav",
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${wave.length}`,
      });
      response.end(wave.subarray(start, end + 1));
      return;
    }
    response.writeHead(200, {
      ...corsHeaders,
      "Accept-Ranges": "bytes",
      "Content-Type": "audio/wav",
      "Content-Length": wave.length,
    });
    response.end(wave);
    return;
  }

  sendJson(response, 404, { detail: `No mock for ${request.method} ${url.pathname}` });
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Read Along mock API listening on ${port}\n`);
});
