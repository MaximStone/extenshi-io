// Rec Tab — the offscreen document.
// chrome.runtime is the only extension API available in here.

let recorder;
let chunks = [];

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "offscreen") return;

  switch (message.type) {
    case "start-recording":
      startRecording(message.data);
      break;
    case "stop-recording":
      stopRecording();
      break;
    default:
      console.warn(`Unexpected message type: '${message.type}'.`);
  }
});

async function startRecording(streamId) {
  if (recorder?.state === "recording") return;

  // The mandatory/chromeMediaSource constraints are the documented way to
  // redeem a tabCapture stream ID. They are not standard getUserMedia
  // constraints and they only work with an unexpired ID.
  const media = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId }
    },
    video: {
      mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId }
    }
  });

  // Capturing a tab MUTES it for the user. Route the captured audio back
  // out to the speakers or they hear silence for the whole recording.
  const output = new AudioContext();
  output.createMediaStreamSource(media).connect(output.destination);

  recorder = new MediaRecorder(media, { mimeType: "video/webm" });
  recorder.ondataavailable = (event) => chunks.push(event.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });

    chrome.runtime.sendMessage({
      target: "service-worker",
      type: "recording-stopped",
      // The blob stays alive in THIS document; only the URL travels.
      data: { url: URL.createObjectURL(blob) }
    });

    recorder = undefined;
    chunks = [];
    window.location.hash = "";
  };

  recorder.start();
  window.location.hash = "recording";
}

function stopRecording() {
  if (recorder?.state !== "recording") return;

  const stream = recorder.stream;
  recorder.stop();
  // Stopping the tracks is what clears the "recording" indicator on the tab.
  stream.getTracks().forEach((track) => track.stop());
}
