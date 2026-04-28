(function () {
  const root = document.querySelector(".camera-connect");
  if (!root) return;

  const configuredServerUrl = root.dataset.ipcamServerUrl || "http://localhost:7000";
  const serverUrl = new URL(configuredServerUrl);
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    serverUrl.hostname = window.location.hostname;
  }
  const usbCameraIndex = root.dataset.usbCameraIndex || "0";
  const panels = {
    ipcam1: document.querySelector('[data-camera-panel="ipcam1"]'),
    ipcam2: document.querySelector('[data-camera-panel="ipcam2"]'),
    ipcam3: document.querySelector('[data-camera-panel="ipcam3"]'),
    usb: document.querySelector('[data-camera-panel="usb"]'),
    webcam: document.querySelector('[data-camera-panel="webcam"]'),
  };

  let webcamStream = null;
  let itsHls = null;
  let zoomHls = null;
  let currentItsUrl = "";

  function getPanelParts(type) {
    const panel = panels[type];
    return {
      panel,
      stream: panel.querySelector("[data-camera-stream]"),
      placeholder: panel.querySelector(".camera-placeholder"),
      statusDot: panel.querySelector(".camera-status-dot"),
      statusText: panel.querySelector(".camera-status-text"),
    };
  }

  function setStatus(type, text, state) {
    const { statusDot, statusText } = getPanelParts(type);
    statusText.textContent = text;
    statusDot.className = "camera-status-dot";
    if (state) statusDot.classList.add(state);
  }

  function buildStreamUrl(source) {
    const url = new URL("/stream", serverUrl);
    url.searchParams.set("source", source);
    url.searchParams.set("t", Date.now().toString());
    return url.toString();
  }

  function showPlaceholder(type) {
    const { stream, placeholder } = getPanelParts(type);
    stream.hidden = true;
    placeholder.hidden = false;
  }

  function hidePlaceholder(type) {
    const { stream, placeholder } = getPanelParts(type);
    placeholder.hidden = true;
    stream.hidden = false;
  }

  function stopWebcam() {
    if (!webcamStream) return;
    webcamStream.getTracks().forEach((track) => track.stop());
    webcamStream = null;
  }

  function connectServerCamera(type, source) {
    const { stream } = getPanelParts(type);
    setStatus(type, "Connecting", "");
    hidePlaceholder(type);
    stream.src = buildStreamUrl(source);
  }

  async function connectWebcam() {
    const { stream } = getPanelParts("webcam");
    stopWebcam();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Browser camera API is unavailable");
    }

    setStatus("webcam", "Connecting", "");
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stream.srcObject = webcamStream;
    hidePlaceholder("webcam");
    setStatus("webcam", "Connected", "online");
  }

  function connectCamera(type) {
    if (type.startsWith("ipcam")) {
      connectServerCamera(type, type);
      return;
    }

    if (type === "usb") {
      connectServerCamera("usb", usbCameraIndex);
      return;
    }

    connectWebcam().catch(() => {
      showPlaceholder("webcam");
      setStatus("webcam", "Failed", "error");
    });
  }

  function disconnectCamera(type) {
    const { stream } = getPanelParts(type);

    if (type === "webcam") {
      stopWebcam();
      stream.srcObject = null;
    } else {
      stream.removeAttribute("src");
    }

    showPlaceholder(type);
    setStatus(type, "Idle", "");
  }

  ["ipcam1", "ipcam2", "ipcam3", "usb"].forEach((type) => {
    const { stream } = getPanelParts(type);
    stream.addEventListener("load", () => setStatus(type, "Connected", "online"));
    stream.addEventListener("error", () => {
      showPlaceholder(type);
      setStatus(type, "Failed", "error");
    });
  });

  document.querySelectorAll("[data-camera-connect]").forEach((button) => {
    button.addEventListener("click", () => connectCamera(button.dataset.cameraConnect));
  });

  document.querySelectorAll("[data-camera-disconnect]").forEach((button) => {
    button.addEventListener("click", () => disconnectCamera(button.dataset.cameraDisconnect));
  });

  document.getElementById("connectAllCamerasButton").addEventListener("click", () => {
    connectCamera("ipcam1");
    window.setTimeout(() => connectCamera("ipcam2"), 500);
    window.setTimeout(() => connectCamera("ipcam3"), 1000);
    window.setTimeout(() => connectCamera("usb"), 1500);
    window.setTimeout(() => connectCamera("webcam"), 2000);
  });

  document.getElementById("disconnectAllCamerasButton").addEventListener("click", () => {
    disconnectCamera("ipcam1");
    disconnectCamera("ipcam2");
    disconnectCamera("ipcam3");
    disconnectCamera("usb");
    disconnectCamera("webcam");
  });

  window.addEventListener("beforeunload", stopWebcam);

  const zoomModal = document.getElementById("cameraZoomModal");
  const zoomStage = document.getElementById("cameraZoomStage");
  const zoomTitle = document.getElementById("cameraZoomTitle");

  function openZoom(title, source) {
    if (!zoomModal || !zoomStage) return;

    closeZoom();
    zoomTitle.textContent = title;
    zoomModal.hidden = false;
    document.body.style.overflow = "hidden";

    if (source.kind === "image") {
      const image = document.createElement("img");
      image.alt = title;
      image.src = source.url;
      zoomStage.appendChild(image);
      return;
    }

    const video = document.createElement("video");
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    zoomStage.appendChild(video);

    if (source.kind === "webcam") {
      video.srcObject = webcamStream;
      video.play().catch(() => {});
      return;
    }

    if (source.kind === "hls") {
      playHlsOnVideo(video, source.url, (hls) => {
        zoomHls = hls;
      });
    }
  }

  function closeZoom() {
    if (!zoomModal || !zoomStage) return;

    if (zoomHls) {
      zoomHls.destroy();
      zoomHls = null;
    }

    zoomStage.querySelectorAll("video").forEach((video) => {
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
    });
    zoomStage.innerHTML = "";
    zoomModal.hidden = true;
    document.body.style.overflow = "";
  }

  function playHlsOnVideo(video, url, onHlsCreated) {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
      return;
    }

    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      onHlsCreated(hls);
    }
  }

  document.querySelectorAll("[data-camera-panel]").forEach((panel) => {
    const stage = panel.querySelector(".camera-stage");
    if (!stage) return;

    stage.addEventListener("click", () => {
      const type = panel.dataset.cameraPanel;
      const stream = panel.querySelector("[data-camera-stream]");
      if (!stream || stream.hidden) return;

      if (type === "webcam") {
        if (!webcamStream) return;
        openZoom("WebCam", { kind: "webcam" });
        return;
      }

      if (stream.getAttribute("src")) {
        const title = type.startsWith("ipcam") ? type.replace("ipcam", "IP CAM ") : "USB CAM";
        openZoom(title, {
          kind: "image",
          url: stream.getAttribute("src"),
        });
      }
    });
  });

  if (zoomModal) {
    zoomModal.querySelectorAll("[data-zoom-close]").forEach((button) => {
      button.addEventListener("click", closeZoom);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && zoomModal && !zoomModal.hidden) {
      closeZoom();
    }
  });

  const itsRegionSelect = document.getElementById("itsRegionSelect");
  const loadItsCctvButton = document.getElementById("loadItsCctvButton");
  const itsCctvList = document.getElementById("itsCctvList");
  const itsCctvStatus = document.getElementById("itsCctvStatus");
  const itsCctvPlayer = document.getElementById("itsCctvPlayer");
  const itsCctvPlaceholder = document.getElementById("itsCctvPlaceholder");

  function setItsStatus(text) {
    if (itsCctvStatus) itsCctvStatus.textContent = text;
  }

  async function loadItsRegions() {
    if (!itsRegionSelect) return;

    setItsStatus("Region list loading");
    try {
      const response = await fetch("/api/its/regions");
      const payload = await response.json();
      const regions = payload.regions || [];

      itsRegionSelect.innerHTML = regions
        .map((region) => `<option value="${region.code}">${region.name}</option>`)
        .join("");

      if (regions.some((region) => region.code === "seoul")) {
        itsRegionSelect.value = "seoul";
      }

      setItsStatus("Select a region");
      await loadItsCctvList();
    } catch (error) {
      setItsStatus("Region list failed");
    }
  }

  async function loadItsCctvList() {
    if (!itsRegionSelect || !itsCctvList) return;

    const region = itsRegionSelect.value || "all";
    setItsStatus("CCTV loading");
    itsCctvList.innerHTML = "";

    try {
      const response = await fetch(`/api/its/cctv?region=${encodeURIComponent(region)}&type=its&cctvType=4`);
      const payload = await response.json();
      const items = payload.items || [];

      if (!response.ok || payload.status !== "success") {
        throw new Error(payload.message || "CCTV load failed");
      }

      renderItsCctvList(items);
      setItsStatus(`${items.length} CCTV found`);
    } catch (error) {
      setItsStatus("CCTV load failed");
    }
  }

  function renderItsCctvList(items) {
    if (!items.length) {
      itsCctvList.innerHTML = '<div class="its-cctv-status">No CCTV found</div>';
      return;
    }

    itsCctvList.innerHTML = "";
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "its-cctv-item";
      button.dataset.cctvUrl = item.url || "";
      button.innerHTML = `
        ${escapeHtml(item.name || `CCTV ${index + 1}`)}
        <span class="its-cctv-meta">${escapeHtml(item.format || "HLS")} · ${formatCoord(item)}</span>
      `;
      button.addEventListener("click", () => {
        document.querySelectorAll(".its-cctv-item").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        playItsCctv(item.url);
      });
      itsCctvList.appendChild(button);
    });
  }

  function playItsCctv(url) {
    if (!url || !itsCctvPlayer) return;

    currentItsUrl = url;
    itsCctvPlaceholder.hidden = true;
    setItsStatus("Playing CCTV");

    if (itsHls) {
      itsHls.destroy();
      itsHls = null;
    }

    itsCctvPlayer.pause();
    itsCctvPlayer.removeAttribute("src");
    itsCctvPlayer.load();

    playHlsOnVideo(itsCctvPlayer, url, (hls) => {
      itsHls = hls;
      itsHls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setItsStatus("CCTV playback failed");
      });
    });

    if (!itsCctvPlayer.src && !itsHls) {
      setItsStatus("HLS playback is not supported");
    }
  }

  const itsCctvPlayerBox = document.querySelector(".its-cctv-player");
  if (itsCctvPlayerBox) {
    itsCctvPlayerBox.addEventListener("click", (event) => {
      if (event.target.closest(".its-cctv-placeholder")) return;
      if (!currentItsUrl) return;
      openZoom("ITS CCTV", { kind: "hls", url: currentItsUrl });
    });
  }

  function formatCoord(item) {
    if (item.x == null || item.y == null) return "No coordinate";
    return `${Number(item.y).toFixed(4)}, ${Number(item.x).toFixed(4)}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (loadItsCctvButton) {
    loadItsCctvButton.addEventListener("click", loadItsCctvList);
  }

  if (itsRegionSelect) {
    itsRegionSelect.addEventListener("change", loadItsCctvList);
    loadItsRegions();
  }
})();
