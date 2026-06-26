import "./styles.css";
import {
  createWorkbook,
  parseSections,
  workbookToBuffer,
} from "./markdownToXlsx.js";

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Client-side conversion</p>
      <h1>Markdown to Excel</h1>
      <p class="lede">
        Drop a markdown file or choose one from your machine. The file is read locally
        and converted to an Excel workbook in the browser (no data leaves your machine).
      </p>
    </section>

    <section class="card">
      <label id="dropzone" class="dropzone" for="file-input">
        <input id="file-input" type="file" accept=".md,.markdown,text/markdown,text/plain" hidden />
        <strong>Drag and drop your markdown file here</strong>
        <span>or click to browse</span>
      </label>

      <div class="progress-block">
        <div class="progress-meta">
          <span id="status">Waiting for a file</span>
          <span id="percent">0%</span>
        </div>
        <div class="progress-track" aria-hidden="true">
          <div id="progress-bar" class="progress-bar"></div>
        </div>
      </div>

      <div class="details">
        <div><span>File</span><strong id="file-name">None selected</strong></div>
        <div><span>Sections</span><strong id="section-count">0</strong></div>
        <div><span>Output</span><strong id="output-name">stories.xlsx</strong></div>
      </div>

      <p id="message" class="message"></p>
    </section>
  </main>
`;

const dropzone = document.querySelector("#dropzone");
const fileInput = document.querySelector("#file-input");
const statusEl = document.querySelector("#status");
const percentEl = document.querySelector("#percent");
const progressBar = document.querySelector("#progress-bar");
const fileNameEl = document.querySelector("#file-name");
const sectionCountEl = document.querySelector("#section-count");
const outputNameEl = document.querySelector("#output-name");
const messageEl = document.querySelector("#message");

let currentObjectUrl = null;

function setProgress(percent, status) {
  progressBar.style.width = `${percent}%`;
  percentEl.textContent = `${Math.round(percent)}%`;
  statusEl.textContent = status;
}

function setMessage(text, kind = "neutral") {
  messageEl.textContent = text;
  if (kind) {
    messageEl.dataset.kind = kind;
  } else {
    delete messageEl.dataset.kind;
  }
}

function sleepFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function getOutputName(fileName) {
  return fileName.replace(/\.[^.]+$/, "") + ".xlsx";
}

async function downloadWorkbook(buffer, fileName) {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  currentObjectUrl = URL.createObjectURL(blob);
  const objectUrl = currentObjectUrl;

  const link = document.createElement("a");
  link.href = currentObjectUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    if (currentObjectUrl === objectUrl) {
      URL.revokeObjectURL(objectUrl);
      currentObjectUrl = null;
    }
  }, 1000);
}

async function handleFile(file) {
  if (!file) {
    return;
  }

  fileNameEl.textContent = file.name;
  outputNameEl.textContent = getOutputName(file.name);
  setMessage("");
  setProgress(5, "Reading file");

  try {
    const text = await file.text();
    await sleepFrame();

    setProgress(35, "Parsing markdown");
    const sections = parseSections(text);
    sectionCountEl.textContent = String(sections.length);
    await sleepFrame();

    setProgress(70, "Building workbook");
    const workbook = await createWorkbook(sections);
    await sleepFrame();

    setProgress(90, "Preparing download");
    const buffer = await workbookToBuffer(workbook);
    await downloadWorkbook(buffer, getOutputName(file.name));

    setProgress(100, "Download ready");
    setMessage(
      `Converted ${sections.length} section${
        sections.length === 1 ? "" : "s"
      }.`,
      "success"
    );
  } catch (error) {
    console.error(error);
    setProgress(0, "Waiting for a file");
    setMessage(
      error instanceof Error ? error.message : "Conversion failed.",
      "error"
    );
  }
}

function readFirstFile(files) {
  return files && files.length ? files[0] : null;
}

fileInput.addEventListener("change", (event) => {
  const file = readFirstFile(event.target.files);
  void handleFile(file);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("active");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("active");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("active");
  const file = readFirstFile(event.dataTransfer.files);
  void handleFile(file);
});

setProgress(0, "Waiting for a file");
setMessage("The markdown never leaves your browser.", "");
