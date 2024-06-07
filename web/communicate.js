// eslint-disable-next-line import/no-cycle
import { PDFViewerApplication } from "./app.js";
import { PixelsPerInch } from "pdfjs-lib";
import { Box } from "./box.js";

const actions = {};
let inited = false;
let currentPageID = null;

const register = (name, handler) => {
  actions[name] = handler;
};

register("loadPDFFile", payload => {
  const { url, originalFile, readonly, filename } = payload;
  PDFViewerApplication.allPagesRendered = false;
  PDFViewerApplication.open({ url, originalFile, filename });
});

function getPDFViewerState() {
  return PDFViewerApplication.store.getMultiple({
    page: null,
    zoom: "auto",
    scrollLeft: "0",
    scrollTop: "0",
    rotation: null,
    sidebarView: -1,
    scrollMode: -1,
    spreadMode: -1,
  });
}

async function getCurrentPage() {
  const data = await getPDFViewerState();
  const page = PDFViewerApplication.pdfViewer.getPageView(data.page);
  if (page?.viewport) {
    const scale = PDFViewerApplication.pdfViewer.currentScale;
    return page.viewport.clone({
      scale: scale * PixelsPerInch.PDF_TO_CSS_UNITS,
    });
  }
  return null;
}

register("queryHistoryState", async () => {
  const data = await getPDFViewerState();

  return { ...data };
});

register("captureViewerFromBox", async payload => {
  const pdf = PDFViewerApplication;
  const { x, y, w, h } = payload;
  const sbox = new Box(x, y, w, h);
  const style = getComputedStyle(document.documentElement);
  const bodyBgColor = style.getPropertyValue("--body-bg-color") || "#fff";
  const canvas = document.createElement("canvas");
  const pixelRatio = window.devicePixelRatio || 1;
  const scale = pdf.pdfViewer.currentScale;
  const ctx = canvas.getContext("2d");
  canvas.width = sbox.w * pixelRatio;
  canvas.height = sbox.h * pixelRatio;
  ctx.fillStyle = bodyBgColor;
  ctx.fillRect(0, 0, sbox.w, sbox.h);
  ctx.scale(pixelRatio, pixelRatio);
  let intersected = false;
  let borderWidth;
  for (let i = 0; i < pdf.pagesCount; i++) {
    const pv = pdf.pdfViewer.getPageView(i);
    const rect = pv.div.getBoundingClientRect();
    if (borderWidth === undefined) {
      borderWidth = parseFloat(getComputedStyle(pv.div).borderWidth);
    }
    const rx = rect.left + borderWidth;
    const ry = rect.top + borderWidth;
    const rw = rect.width - borderWidth * 2;
    const rh = rect.height - borderWidth * 2;
    const box = new Box(rx, ry, rw, rh);
    if (Box.Collides(sbox, box)) {
      let cw;
      let ch;
      let srcCanvas = pv.canvas;
      if (srcCanvas) {
        cw = srcCanvas.width;
        ch = srcCanvas.height;
      } else {
        const viewport = pv.pdfPage.getViewport({ scale });
        srcCanvas = document.createElement("canvas");
        srcCanvas.width = Math.floor(viewport.width * pixelRatio);
        srcCanvas.height = Math.floor(viewport.height * pixelRatio);
        srcCanvas.style.width = Math.floor(viewport.width) + "px";
        srcCanvas.style.height = Math.floor(viewport.height) + "px";
        const srcCtx = srcCanvas.getContext("2d");
        const renderTask = pv.pdfPage.render({
          canvasContext: srcCtx,
          transform:
            pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : null,
          viewport,
        });
        await renderTask.promise;
        cw = srcCanvas.width;
        ch = srcCanvas.height;
      }
      intersected = true;
      const intsec = Box.Intersect(sbox, box);
      ctx.drawImage(
        srcCanvas,
        ((intsec.x - box.x) * cw) / rw,
        ((intsec.y - box.y) * ch) / rh,
        (intsec.w * cw) / rw,
        (intsec.h * ch) / rh,
        intsec.x - sbox.x,
        intsec.y - sbox.y,
        intsec.w,
        intsec.h
      );
    } else if (intersected) {
      break;
    }
  }
  // eslint-disable-next-line consistent-return
  return new Promise(resolve => {
    canvas.toBlob(resolve, "image/webp");
  });
});

function getSiderState() {
  const pdf = PDFViewerApplication;
  const sidebarContainer = pdf.appConfig.sidebar.sidebarContainer;
  return {
    siderWidth: sidebarContainer.clientWidth,
    siderOpen: pdf.pdfSidebar.isOpen,
  };
}

register("getPDFViewerState", async () => {
  const pdf = PDFViewerApplication;
  const mainContainer = pdf.appConfig.mainContainer;
  const viewerContainer = pdf.appConfig.viewerContainer;
  const viewport = await getCurrentPage();
  const scale = pdf.pdfViewer.currentScale;
  const borderWidth = 9;
  const toolbarContainer = pdf.appConfig.toolbar.container;
  return {
    scale,
    width: viewport?.width
      ? viewport.width + borderWidth * 2 * scale
      : viewerContainer.clientWidth,
    height: viewerContainer.clientHeight,
    // shadow for container
    toolbarHeight: toolbarContainer.offsetHeight,
    x: mainContainer.scrollLeft,
    y: mainContainer.scrollTop,
    ...getSiderState(),
  };
});

register("getSiderState", () => getSiderState());

let catpureSlideBtn = null;
function customizeButtons() {
  catpureSlideBtn = document.getElementById("captureSlide");
  catpureSlideBtn.addEventListener("click", () => {
    postMessageToParent({ event: "captureSlide" });
  });
}

export function initCommunicate() {
  if (inited) {
    return;
  }
  inited = true;
  customizeButtons();
  currentPageID = PDFViewerApplication.page;
  window.addEventListener("message", async event => {
    const origin = event.origin;
    if (
      !(
        origin.includes("bench3d.com") ||
        origin.includes("bench3d.cn") ||
        origin === "http://localhost:8080" ||
        origin === "http://localhost:5173"
      )
    ) {
      return;
    }
    // console.log("message received in iframe:  ", event.data);
    const data = event.data;
    const result = await actions[data.action]?.(data.payload);
    if (result) {
      postMessageToParent({ result, id: data.id });
    }
  });
}

export function postMessageToParent(data) {
  window.parent.postMessage(data, "*");
}
