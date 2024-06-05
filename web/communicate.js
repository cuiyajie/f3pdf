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
  const ctx = canvas.getContext("2d");
  canvas.width = sbox.w;
  canvas.height = sbox.h;
  ctx.fillStyle = bodyBgColor;
  ctx.fillRect(0, 0, sbox.w, sbox.h);
  let intersected = false;
  for (let i = 0; i < pdf.pagesCount; i++) {
    const pv = pdf.pdfViewer.getPageView(i);
    const {
      left: rx,
      top: ry,
      width: rw,
      height: rh,
    } = pv.canvas.getBoundingClientRect();
    const { width: cw, height: ch } = pv.canvas;
    const box = new Box(rx, ry, rw, rh);
    if (Box.Collides(sbox, box)) {
      intersected = true;
      const intsec = Box.Intersect(sbox, box);
      ctx.drawImage(
        pv.canvas,
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
  return new Promise(resolve => {
    canvas.toBlob(resolve, "image/webp");
  });
});

register("getPDFViewerState", async () => {
  const pdf = PDFViewerApplication;
  const mainContainer = pdf.appConfig.mainContainer;
  const viewerContainer = pdf.appConfig.viewerContainer;
  const viewport = await getCurrentPage();
  const scale = pdf.pdfViewer.currentScale;
  const count = pdf.pagesCount;
  const style = getComputedStyle(document.documentElement);
  const borderWidth = parseInt(style.getPropertyValue("--page-border"));
  const toolbarContainer = pdf.appConfig.toolbar.container;
  const gapVertical = viewerContainer.clientHeight - viewport.height * count;
  return {
    scale,
    width: viewport?.width
      ? viewport.width + borderWidth * 2
      : viewerContainer.clientWidth,
    height: viewerContainer.clientHeight,
    // shadow for container
    toolbarHeight: toolbarContainer.offsetHeight,
    x: mainContainer.scrollLeft,
    y: mainContainer.scrollTop,
    gapHorizontal: 2 * (borderWidth + 1),
    gapVertical,
  };
});

function customizeButtons() {
  // TODO
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
