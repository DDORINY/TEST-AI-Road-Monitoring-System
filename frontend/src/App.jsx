import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./styles/App.css";

const flaskBaseUrl = (import.meta.env.VITE_FLASK_API_BASE_URL || "http://localhost:5001").replace(/\/$/, "");
const ipcamBaseUrl = (import.meta.env.VITE_IPCAM_API_BASE_URL || "http://localhost:7000").replace(/\/$/, "");

const cameraPanels = [
  { id: "ipcam1", title: "IP CAM 1", source: "ipcam1", type: "image", note: "RTSP camera stream" },
  { id: "ipcam2", title: "IP CAM 2", source: "ipcam2", type: "image", note: "RTSP camera stream" },
  { id: "ipcam3", title: "IP CAM 3", source: "ipcam3", type: "image", note: "RTSP camera stream" },
  { id: "usb", title: "USB CAM", source: "0", type: "image", note: "Server USB camera" },
  { id: "webcam", title: "WebCam", source: "webcam", type: "webcam", note: "Browser camera" },
];

function App() {
  const [cameraState, setCameraState] = useState(() =>
    Object.fromEntries(cameraPanels.map((panel) => [panel.id, { status: "Idle", url: "", active: false }]))
  );
  const [webcamStream, setWebcamStream] = useState(null);
  const [regions, setRegions] = useState([]);
  const [region, setRegion] = useState("seoul");
  const [cctvItems, setCctvItems] = useState([]);
  const [itsStatus, setItsStatus] = useState("Region list loading");
  const [activeCctv, setActiveCctv] = useState(null);
  const [zoom, setZoom] = useState(null);

  const webcamRef = useRef(null);
  const itsVideoRef = useRef(null);
  const itsHlsRef = useRef(null);
  const zoomVideoRef = useRef(null);
  const zoomHlsRef = useRef(null);

  const streamBaseUrl = useMemo(() => {
    const url = new URL(ipcamBaseUrl);
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      url.hostname = window.location.hostname;
    }
    return url.toString().replace(/\/$/, "");
  }, []);

  useEffect(() => {
    loadRegions();
    return () => {
      stopWebcam();
      destroyHls(itsHlsRef);
      destroyHls(zoomHlsRef);
    };
  }, []);

  useEffect(() => {
    if (webcamRef.current && webcamStream) {
      webcamRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  useEffect(() => {
    if (!activeCctv || !itsVideoRef.current) return;
    playHls(itsVideoRef.current, activeCctv.url, itsHlsRef, () => setItsStatus("CCTV playback failed"));
  }, [activeCctv]);

  useEffect(() => {
    if (!zoom || !zoomVideoRef.current) return;
    if (zoom.kind === "webcam") {
      zoomVideoRef.current.srcObject = webcamStream;
      zoomVideoRef.current.play().catch(() => {});
      return;
    }
    if (zoom.kind === "hls") {
      playHls(zoomVideoRef.current, zoom.url, zoomHlsRef);
    }
  }, [zoom, webcamStream]);

  function buildStreamUrl(source) {
    return `${streamBaseUrl}/stream?source=${encodeURIComponent(source)}&t=${Date.now()}`;
  }

  function setPanelState(id, patch) {
    setCameraState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function connectCamera(panel) {
    if (panel.type === "webcam") {
      try {
        setPanelState(panel.id, { status: "Connecting" });
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setWebcamStream(stream);
        setPanelState(panel.id, { status: "Connected", active: true });
      } catch {
        setPanelState(panel.id, { status: "Failed", active: false });
      }
      return;
    }

    setPanelState(panel.id, {
      status: "Connecting",
      active: true,
      url: buildStreamUrl(panel.source),
    });
  }

  function disconnectCamera(panel) {
    if (panel.type === "webcam") {
      stopWebcam();
    }
    setPanelState(panel.id, { status: "Idle", active: false, url: "" });
  }

  function connectAll() {
    cameraPanels.forEach((panel, index) => {
      window.setTimeout(() => connectCamera(panel), index * 500);
    });
  }

  function disconnectAll() {
    cameraPanels.forEach(disconnectCamera);
  }

  function stopWebcam() {
    setWebcamStream((stream) => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      return null;
    });
  }

  async function loadRegions() {
    try {
      const response = await fetch(`${flaskBaseUrl}/api/its/regions`);
      const payload = await response.json();
      const nextRegions = payload.regions || [];
      setRegions(nextRegions);
      if (nextRegions.some((item) => item.code === "seoul")) setRegion("seoul");
      setItsStatus("Select a region");
      await loadCctv("seoul");
    } catch {
      setItsStatus("Region list failed");
    }
  }

  async function loadCctv(nextRegion = region) {
    try {
      setItsStatus("CCTV loading");
      setCctvItems([]);
      const response = await fetch(`${flaskBaseUrl}/api/its/cctv?region=${encodeURIComponent(nextRegion)}&type=its&cctvType=4`);
      const payload = await response.json();
      if (!response.ok || payload.status !== "success") throw new Error(payload.message);
      setCctvItems(payload.items || []);
      setItsStatus(`${payload.items?.length || 0} CCTV found`);
    } catch {
      setItsStatus("CCTV load failed");
    }
  }

  function selectCctv(item) {
    setActiveCctv(item);
    setItsStatus("Playing CCTV");
  }

  function playHls(video, url, hlsRef, onFatalError) {
    destroyHls(hlsRef);
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && onFatalError) onFatalError();
      });
      hlsRef.current = hls;
    }
  }

  function destroyHls(ref) {
    if (ref.current) {
      ref.current.destroy();
      ref.current = null;
    }
  }

  function openZoomForCamera(panel) {
    const state = cameraState[panel.id];
    if (!state.active) return;

    if (panel.type === "webcam") {
      if (!webcamStream) return;
      setZoom({ title: panel.title, kind: "webcam" });
      return;
    }

    setZoom({ title: panel.title, kind: "image", url: state.url });
  }

  function closeZoom() {
    destroyHls(zoomHlsRef);
    setZoom(null);
  }

  return (
    <>
      <Header />
      <main className="monitoring-app">
      <section className="monitoring-header">
        <h1>모니터링</h1>
        <div className="monitoring-actions">
          <button className="action primary" onClick={connectAll}>Connect All</button>
          <button className="action" onClick={disconnectAll}>Disconnect All</button>
          <a className="action" href={`${flaskBaseUrl}/realtime-monitor`}>Risk Monitor</a>
        </div>
      </section>

      <section className="camera-grid">
        {cameraPanels.map((panel) => (
          <article className="camera-panel" key={panel.id}>
            <div className="panel-header">
              <h2>{panel.title}</h2>
              <span className={`panel-status ${cameraState[panel.id].status.toLowerCase()}`}>{cameraState[panel.id].status}</span>
            </div>
            <button className="stage-button" onClick={() => openZoomForCamera(panel)}>
              {panel.type === "webcam" ? (
                cameraState[panel.id].active ? <video ref={webcamRef} autoPlay playsInline muted /> : <Placeholder title={panel.title} text={panel.note} />
              ) : (
                cameraState[panel.id].active ? (
                  <img
                    src={cameraState[panel.id].url}
                    alt={`${panel.title} stream`}
                    onLoad={() => setPanelState(panel.id, { status: "Connected" })}
                    onError={() => setPanelState(panel.id, { status: "Failed", active: false })}
                  />
                ) : <Placeholder title={panel.title} text={panel.note} />
              )}
            </button>
            <div className="panel-actions">
              <button className="action primary" onClick={() => connectCamera(panel)}>Connect</button>
              <button className="action" onClick={() => disconnectCamera(panel)}>Disconnect</button>
            </div>
          </article>
        ))}
      </section>

      <section className="its-section">
        <div className="its-header">
          <div>
            <h2>ITS CCTV</h2>
            <p>Select a region and choose a CCTV stream.</p>
          </div>
          <div className="its-filter">
            <select
              value={region}
              onChange={(event) => {
                setRegion(event.target.value);
                loadCctv(event.target.value);
              }}
            >
              {regions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
            <button className="action primary" onClick={() => loadCctv(region)}>Load CCTV</button>
          </div>
        </div>

        <div className="its-layout">
          <aside className="cctv-list-wrap">
            <div className="its-status">{itsStatus}</div>
            <div className="cctv-list">
              {cctvItems.map((item, index) => (
                <button
                  key={`${item.url}-${index}`}
                  className={`cctv-item ${activeCctv?.url === item.url ? "active" : ""}`}
                  onClick={() => selectCctv(item)}
                >
                  <strong>{item.name || `CCTV ${index + 1}`}</strong>
                  <span>{item.format || "HLS"} - {formatCoord(item)}</span>
                </button>
              ))}
            </div>
          </aside>
          <button className="its-player" onClick={() => activeCctv && setZoom({ title: "ITS CCTV", kind: "hls", url: activeCctv.url })}>
            {activeCctv ? <video ref={itsVideoRef} controls autoPlay muted playsInline /> : <Placeholder title="ITS CCTV" text="Select a CCTV item to play the live HLS stream." />}
          </button>
        </div>
      </section>

      {zoom && (
        <div className="zoom-modal">
          <button className="zoom-backdrop" onClick={closeZoom} aria-label="Close zoom" />
          <div className="zoom-dialog">
            <div className="zoom-header">
              <h2>{zoom.title}</h2>
              <button onClick={closeZoom}>x</button>
            </div>
            <div className="zoom-stage">
              {zoom.kind === "image" && <img src={zoom.url} alt={zoom.title} />}
              {(zoom.kind === "webcam" || zoom.kind === "hls") && <video ref={zoomVideoRef} controls autoPlay muted playsInline />}
            </div>
          </div>
        </div>
      )}
      </main>
      <Footer />
    </>
  );
}

function Placeholder({ title, text }) {
  return (
    <div className="placeholder">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function formatCoord(item) {
  if (item.x == null || item.y == null) return "No coordinate";
  return `${Number(item.y).toFixed(4)}, ${Number(item.x).toFixed(4)}`;
}

export default App;
